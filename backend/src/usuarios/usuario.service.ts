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
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

const OTP_EXPIRA_MINUTOS = 5;

/**
 * Servicio de Gestión de Usuarios.
 * Maneja el ciclo de vida del usuario, perfiles, seguridad de cuentas (OTP)
 * y vinculación con infraestructura institucional (QR).
 */
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
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Crea un nuevo usuario en el sistema con contraseña encriptada y QR inicial.
   */
  async create(createUsuarioDto: CreateUsuarioDto): Promise<Omit<Usuario, 'contra'>> {
    const { documento, correo, contra } = createUsuarioDto;

    const existente = await this.usuarioRepository.findOne({
      where: [{ documento }, { correo }],
    });
    
    if (existente) {
      const campo = existente.documento === documento ? 'documento' : 'correo';
      throw new ConflictException(`El ${campo} ya se encuentra registrado`);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contra, salt);
    const qrValue = randomUUID();

    try {
      const nuevoUsuario = this.usuarioRepository.create({
        ...createUsuarioDto,
        contra: hashedPassword,
        qr: qrValue,
      });

      const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);

      await this.auditoriaService.create({
        accion: 'CREAR_USUARIO',
        entidad: 'USUARIO',
        idEntidad: parseInt(usuarioGuardado.documento),
        idUsuario: usuarioGuardado.documento,
        datosNuevos: { correo: usuarioGuardado.correo, nombre: usuarioGuardado.nombreCompleto },
      });

      const { contra: _, ...usuarioSinContrasena } = usuarioGuardado;
      return usuarioSinContrasena;
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === '23503' && pgError.constraint === 'usuario_idformacion_fkey') {
        throw new BadRequestException('La ficha de formación proporcionada no es válida.');
      }
      throw error;
    }
  }

  /**
   * Actualiza la contraseña de un usuario validando la anterior.
   */
  async cambiarContrasena(documento: string, contraActual: string, contraNueva: string): Promise<{ mensaje: string }> {
    const usuario = await this.findOneByDocumento(documento);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const esCorrecta = await bcrypt.compare(contraActual, usuario.contra);
    if (!esCorrecta) throw new UnauthorizedException('La contraseña actual es incorrecta');

    if (contraActual === contraNueva) {
      throw new BadRequestException('La nueva contraseña no puede ser igual a la anterior');
    }

    const salt = await bcrypt.genSalt(10);
    usuario.contra = await bcrypt.hash(contraNueva, salt);
    await this.usuarioRepository.save(usuario);

    return { mensaje: 'Contraseña actualizada exitosamente' };
  }

  /**
   * Búsqueda por documento (Requerido por Auth y Operativo).
   */
  async findOneByDocumento(documento: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({ where: { documento } });
  }

  /**
   * Búsqueda detallada por documento (Alias de findOne para compatibilidad).
   */
  async findOne(documento: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { documento },
      relations: ['tipoUsuario', 'formacion'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async findOneByCorreo(correo: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({ where: { correo } });
  }

  /**
   * Actualiza el token de notificaciones push para la aplicación móvil.
   */
  async actualizarTokenPush(documento: string, token: string) {
    const usuario = await this.findOneByDocumento(documento);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    
    usuario.pushToken = token;
    await this.usuarioRepository.save(usuario);
    return { ok: true, mensaje: 'Token push actualizado' };
  }

  /**
   * Regenera el código QR institucional.
   */
  async regenerarQr(documento: string): Promise<{ qr: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const nuevoQr = randomUUID();
    usuario.qr = nuevoQr;
    await this.usuarioRepository.save(usuario);

    return { qr: nuevoQr };
  }

  /**
   * Lista usuarios con paginación para dashboard administrativo.
   * MOBILE_API: Usado para la gestión de usuarios desde la app administrativa.
   * PAGINATION: Offset y límite para evitar sobrecarga en la vista de lista.
   */
  async findAll(page: number = 1, limit: number = 10) {
    // PAGINATION: Búsqueda controlada de usuarios institucionales
    const [data, total] = await this.usuarioRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { nombreCompleto: 'ASC' },
      relations: ['tipoUsuario', 'formacion'],
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * Búsqueda institucional por código QR.
   */
  async buscarPorQR(qr: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { qr },
      relations: ['tipoUsuario', 'formacion'],
    });

    if (!usuario) throw new NotFoundException('Código QR inválido');

    const vehiculos = await this.vehiculosService.findByUsuario(usuario.documento);
    const { contra: _, ...perfil } = usuario;
    return { usuario: perfil, vehiculos };
  }

  /**
   * Actualización de perfil y limpieza de fotos en Cloudinary.
   */
  async actualizarPerfil(documento: string, dto: ActualizarPerfilDto): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const fotoAnterior = usuario.fotoPersona;

    if (dto.fotoPersona) usuario.fotoPersona = dto.fotoPersona;
    if (dto.numTelf) usuario.numTelf = dto.numTelf;
    if (dto.contactoEmerg) usuario.contactoEmerg = dto.contactoEmerg;

    const guardado = await this.usuarioRepository.save(usuario);

    if (dto.fotoPersona && fotoAnterior && fotoAnterior !== dto.fotoPersona) {
      await this.cloudinaryService.borrarPorUrl(fotoAnterior);
    }

    const { contra: _, ...sinContrasena } = guardado;
    return sinContrasena;
  }

  /**
   * Gestión de cambio de correo electrónico con verificación OTP.
   */
  async solicitarCambioCorreo(documento: string, nuevoCorreo: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (usuario.correo === nuevoCorreo) throw new BadRequestException('El nuevo correo es idéntico al actual');

    const yaExiste = await this.usuarioRepository.findOne({ where: { correo: nuevoCorreo } });
    if (yaExiste) throw new ConflictException('El correo ya se encuentra registrado por otro usuario');

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEn = new Date(Date.now() + OTP_EXPIRA_MINUTOS * 60 * 1000);

    await this.otpRepository.delete({ documento });
    await this.otpRepository.save({ documento, codigo, expiraEn, usado: false });

    await this.mailService.enviarCodigoOtp(nuevoCorreo, codigo, usuario.nombreCompleto);

    return { mensaje: `Código enviado a ${nuevoCorreo}` };
  }

  /**
   * Confirmación final de cambio de correo electrónico.
   */
  async confirmarCambioCorreo(documento: string, nuevoCorreo: string, codigo: string): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const otp = await this.otpRepository.findOne({
      where: { documento, usado: false, expiraEn: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.codigo !== codigo) {
      if (otp) {
        otp.intentos += 1;
        await this.otpRepository.save(otp);
      }
      throw new UnauthorizedException('Código de verificación inválido');
    }

    otp.usado = true;
    await this.otpRepository.save(otp);

    usuario.correo = nuevoCorreo;
    const guardado = await this.usuarioRepository.save(usuario);

    const { contra: _, ...sinContrasena } = guardado;
    return sinContrasena;
  }
}
