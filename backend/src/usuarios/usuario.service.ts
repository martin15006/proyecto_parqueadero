import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { randomUUID } from 'crypto';
import { Usuario } from './entities/usuario.entity';
import { CodigoOtp } from './entities/codigo-otp.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MailService } from '../mail/mail.service';
import { VehiculosService } from '../vehiculos/vehiculos.service';

const ID_TIPO_USUARIO_APP = 1;
const OTP_EXPIRA_MINUTOS = 5;

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(CodigoOtp)
    private readonly otpRepository: Repository<CodigoOtp>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => VehiculosService))
    private readonly vehiculosService: VehiculosService,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Omit<Usuario, 'contra'>> {
    const usuarioExistenteDoc = await this.usuarioRepository.findOne({
      where: { documento: createUsuarioDto.documento },
    });
    if (usuarioExistenteDoc) {
      throw new ConflictException('Ese documento ya está registrado');
    }

    const usuarioExistenteCorreo = await this.usuarioRepository.findOne({
      where: { correo: createUsuarioDto.correo },
    });
    if (usuarioExistenteCorreo) {
      throw new ConflictException('Ese correo ya está registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUsuarioDto.contra, salt);
    const qrValue = randomUUID();

    try {
      const nuevoUsuario = this.usuarioRepository.create({
        ...createUsuarioDto,
        contra: hashedPassword,
        idTipoUsr: ID_TIPO_USUARIO_APP,
        QR: qrValue,
      });

      const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);
      const { contra, ...usuarioSinContrasena } = usuarioGuardado;
      return usuarioSinContrasena;
    } catch (error: any) {
      if (error.code === '23503' && error.constraint === 'usuario_idformacion_fkey') {
        throw new BadRequestException(
          'La ficha de formación no existe. Verifica el número con tu instructor.',
        );
      }
      throw error;
    }
  }

  async cambiarContrasena(
    documento: string,
    contraActual: string,
    contraNueva: string,
  ): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const esCorrecta = await bcrypt.compare(contraActual, usuario.contra);
    if (!esCorrecta) throw new UnauthorizedException('La contraseña actual es incorrecta');

    if (contraActual === contraNueva) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }

    const salt = await bcrypt.genSalt(10);
    usuario.contra = await bcrypt.hash(contraNueva, salt);
    await this.usuarioRepository.save(usuario);

    return { mensaje: 'Contraseña actualizada correctamente' };
  }

  async actualizarPerfil(
    documento: string,
    dto: ActualizarPerfilDto,
  ): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const fotoVieja = usuario.fotoPersona;

    if (dto.fotoPersona) usuario.fotoPersona = dto.fotoPersona;
    if (dto.numTelf) usuario.numTelf = dto.numTelf;
    if (dto.contactoEmerg) usuario.contactoEmerg = dto.contactoEmerg;

    const guardado = await this.usuarioRepository.save(usuario);

    if (dto.fotoPersona && fotoVieja && fotoVieja !== dto.fotoPersona) {
      await this.cloudinaryService.borrarPorUrl(fotoVieja);
    }

    const { contra, ...sinContrasena } = guardado;
    return sinContrasena;
  }

  async solicitarCambioCorreo(
    documento: string,
    nuevoCorreo: string,
  ): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (usuario.correo === nuevoCorreo) {
      throw new BadRequestException('El nuevo correo debe ser diferente al actual');
    }

    const yaExiste = await this.usuarioRepository.findOne({ where: { correo: nuevoCorreo } });
    if (yaExiste) {
      throw new ConflictException('Ese correo ya está registrado por otro usuario');
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEn = new Date(Date.now() + OTP_EXPIRA_MINUTOS * 60 * 1000);

    await this.otpRepository.delete({ documento });

    const otp = this.otpRepository.create({
      documento,
      codigo,
      expiraEn,
      intentos: 0,
      usado: false,
    });
    await this.otpRepository.save(otp);

    await this.mailService.enviarCodigoOtp(nuevoCorreo, codigo, usuario.nombreCompleto);

    return { mensaje: `Código enviado a ${nuevoCorreo}. Verifícalo para confirmar el cambio.` };
  }

  async confirmarCambioCorreo(
    documento: string,
    nuevoCorreo: string,
    codigo: string,
  ): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const yaExiste = await this.usuarioRepository.findOne({ where: { correo: nuevoCorreo } });
    if (yaExiste && yaExiste.documento !== documento) {
      throw new ConflictException('Ese correo ya está registrado por otro usuario');
    }

    const otp = await this.otpRepository.findOne({
      where: {
        documento,
        usado: false,
        expiraEn: MoreThan(new Date()),
      },
      order: { creadoEn: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('No hay código activo. Solicita uno nuevo.');
    }

    if (otp.intentos >= 3) {
      throw new UnauthorizedException('Has agotado los intentos. Solicita un nuevo código.');
    }

    if (otp.codigo !== codigo) {
      otp.intentos += 1;
      await this.otpRepository.save(otp);
      throw new UnauthorizedException('Código incorrecto');
    }

    otp.usado = true;
    await this.otpRepository.save(otp);

    usuario.correo = nuevoCorreo;
    const guardado = await this.usuarioRepository.save(usuario);

    const { contra, ...sinContrasena } = guardado;
    return sinContrasena;
  }

  /**
   * Busca un usuario por el UUID guardado en su QR.
   * Devuelve toda la información que el celador necesita para verificar
   * la identidad y conocer los vehículos del usuario al escanear su QR.
   *
   * Este endpoint es consumido por la app del celador.
   */
  async buscarPorQR(qr: string): Promise<any> {
    // Validar formato básico del UUID (mejora seguridad)
    if (!qr || qr.length < 10) {
      throw new BadRequestException('Código QR no válido');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { QR: qr },
    });

    if (!usuario) {
      throw new NotFoundException('QR no válido o usuario no registrado');
    }

    // Obtener vehículos del usuario reutilizando el método existente
    const vehiculos = await this.vehiculosService.listarMisVehiculos(usuario.documento);

    // Devolver SOLO la información que el celador necesita
    // No incluimos: contraseña, OTPs, datos de admin
    return {
      documento: usuario.documento,
      nombreCompleto: usuario.nombreCompleto,
      fotoPersona: usuario.fotoPersona,
      numTelf: usuario.numTelf,
      contactoEmerg: usuario.contactoEmerg,
      correo: usuario.correo,
      idFormacion: usuario.idFormacion,
      idTipoUsr: usuario.idTipoUsr,
      vehiculos: vehiculos,
    };
  }

  async findAll(): Promise<Omit<Usuario, 'contra'>[]> {
    const usuarios = await this.usuarioRepository.find();
    return usuarios.map(({ contra, ...rest }) => rest);
  }

  async findOne(documento: string): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    const { contra, ...usuarioSinContrasena } = usuario;
    return usuarioSinContrasena;
  }
}