import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CodigoOtp } from '../usuarios/entities/codigo-otp.entity';
import { LoginDto } from '../usuarios/dto/login.dto';
import { VerificarOtpDto } from './dto/verificar-otp.dto';
import { ReenviarOtpDto } from './dto/reenviar-otp.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(CodigoOtp)
    private readonly otpRepository: Repository<CodigoOtp>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) { }

  /**
   * Paso 1 del login: valida credenciales y envía OTP al correo.
   * NO devuelve JWT todavía.
   */
  async loginPaso1(loginDto: LoginDto): Promise<{ mensaje: string; correo: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: loginDto.correo },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const contraseñaValida = await bcrypt.compare(loginDto.contra, usuario.contra);
    if (!contraseñaValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar y guardar OTP
    await this.generarYEnviarOtp(usuario);

    return {
      mensaje: 'Código de verificación enviado a tu correo',
      correo: usuario.correo,
    };
  }

  /**
   * Paso 2 del login: valida el código OTP y emite el JWT.
   */
  async verificarOtp(dto: VerificarOtpDto): Promise<{ access_token: string; usuario: any }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: dto.correo },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Buscar el OTP más reciente no usado para este usuario
    const otp = await this.otpRepository.findOne({
      where: {
        documento: usuario.documento,
        usado: false,
      },
      order: { creadoEn: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException(
        'No hay código activo. Solicita uno nuevo.',
      );
    }

    // Verificar expiración
    if (new Date() > otp.expiraEn) {
      otp.usado = true;
      await this.otpRepository.save(otp);
      throw new BadRequestException(
        'El código ha expirado. Solicita uno nuevo.',
      );
    }

    // Verificar máximo de intentos
    const maxIntentos = this.configService.get<number>('OTP_MAX_ATTEMPTS') ?? 3;
    if (otp.intentos >= maxIntentos) {
      otp.usado = true;
      await this.otpRepository.save(otp);
      throw new BadRequestException(
        'Demasiados intentos fallidos. Solicita un código nuevo.',
      );
    }

    // Verificar que el código coincida
    if (otp.codigo !== dto.codigo) {
      otp.intentos += 1;
      await this.otpRepository.save(otp);
      const intentosRestantes = maxIntentos - otp.intentos;
      throw new UnauthorizedException(
        `Código incorrecto. Te quedan ${intentosRestantes} intento(s).`,
      );
    }

    // ¡OTP válido! Marcar como usado y emitir JWT
    otp.usado = true;
    await this.otpRepository.save(otp);

    const payload = {
      sub: usuario.documento,
      correo: usuario.correo,
      idTipoUsr: usuario.idTipoUsr,
    };

    const access_token = await this.jwtService.signAsync(payload);

    const { contra, ...usuarioSinContrasena } = usuario;

    return {
      access_token,
      usuario: usuarioSinContrasena,
    };
  }

  /**
   * Reenvía un nuevo código OTP al correo.
   */
  async reenviarOtp(dto: ReenviarOtpDto): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: dto.correo },
    });

    if (!usuario) {
      // No revelar si el correo existe o no, por seguridad
      return { mensaje: 'Si el correo existe, se enviará un nuevo código.' };
    }

    await this.generarYEnviarOtp(usuario);

    return { mensaje: 'Nuevo código enviado a tu correo.' };
  }

  /**
   * Genera un código de 6 dígitos, lo guarda en BD y lo envía por correo.
   */
  private async generarYEnviarOtp(usuario: Usuario): Promise<void> {
    // Invalidar códigos anteriores no usados
    await this.otpRepository.update(
      { documento: usuario.documento, usado: false },
      { usado: true },
    );

    // Generar nuevo código
    const codigo = this.generarCodigo6Digitos();
    const minutosExpiracion =
      this.configService.get<number>('OTP_EXPIRATION_MINUTES') ?? 5;
    const expiraEn = new Date(Date.now() + minutosExpiracion * 60 * 1000);

    const nuevoOtp = this.otpRepository.create({
      documento: usuario.documento,
      codigo,
      expiraEn,
      intentos: 0,
      usado: false,
    });

    await this.otpRepository.save(nuevoOtp);

    // Enviar correo
    await this.mailService.enviarCodigoOtp(
      usuario.correo,
      codigo,
      usuario.nombreCompleto,
    );
  }

  private generarCodigo6Digitos(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  /**
 * Paso 1 — Recuperación de contraseña.
 * Recibe el correo y, si está registrado, envía un OTP al correo.
 * Por seguridad, devuelve siempre éxito (no revela si el correo existe o no).
 */
  async solicitarRecuperacion(correo: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { correo } });

    // No revelamos si el correo existe (medida de seguridad contra enumeración)
    if (!usuario) {
      return {
        mensaje:
          'Si el correo está registrado, recibirás un código de verificación en breve.',
      };
    }

    // Generar OTP de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEn = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    // Eliminar OTPs anteriores del usuario para este propósito
    await this.otpRepository.delete({ documento: usuario.documento });

    const otp = this.otpRepository.create({
      documento: usuario.documento,
      codigo,
      expiraEn,
      intentos: 0,
      usado: false,
    });
    await this.otpRepository.save(otp);

    // Enviar correo con el código
    await this.mailService.enviarCodigoOtp(
      correo,
      codigo,
      usuario.nombreCompleto,
    );

    return {
      mensaje:
        'Si el correo está registrado, recibirás un código de verificación en breve.',
    };
  }

  /**
   * Paso 2 — Verificar el OTP de recuperación.
   * Solo valida que el código sea correcto; NO restablece la contraseña aún.
   * Esto permite que el usuario vea la pantalla para escribir la nueva contraseña
   * con la confianza de que el código ya fue verificado.
   */
  async verificarRecuperacion(
    correo: string,
    codigo: string,
  ): Promise<{ mensaje: string; valido: boolean }> {
    const usuario = await this.usuarioRepository.findOne({ where: { correo } });

    if (!usuario) {
      throw new UnauthorizedException('Código o correo incorrectos');
    }

    const otp = await this.otpRepository.findOne({
      where: {
        documento: usuario.documento,
        usado: false,
        expiraEn: MoreThan(new Date()),
      },
      order: { creadoEn: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('No hay código activo. Solicita uno nuevo.');
    }

    if (otp.intentos >= 3) {
      throw new UnauthorizedException(
        'Has agotado los intentos. Solicita un nuevo código.',
      );
    }

    if (otp.codigo !== codigo) {
      otp.intentos += 1;
      await this.otpRepository.save(otp);
      throw new UnauthorizedException('Código incorrecto');
    }

    // NO marcamos el OTP como usado todavía. Eso se hace al restablecer.
    // Solo confirmamos que es válido.
    return { mensaje: 'Código verificado correctamente', valido: true };
  }

  /**
   * Paso 3 — Restablecer contraseña.
   * Aquí se valida nuevamente el OTP (por seguridad) y se actualiza la contraseña.
   * Después de esto, el OTP queda invalidado.
   */
  async restablecerContrasena(
    correo: string,
    codigo: string,
    contraNueva: string,
  ): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { correo } });

    if (!usuario) {
      throw new UnauthorizedException('Datos incorrectos');
    }

    const otp = await this.otpRepository.findOne({
      where: {
        documento: usuario.documento,
        usado: false,
        expiraEn: MoreThan(new Date()),
      },
      order: { creadoEn: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException(
        'No hay código activo. Solicita un nuevo código de recuperación.',
      );
    }

    if (otp.codigo !== codigo) {
      throw new UnauthorizedException('Código incorrecto');
    }

    // Validar que la nueva contraseña sea diferente a la actual
    const esIgual = await bcrypt.compare(contraNueva, usuario.contra);
    if (esIgual) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    // Marcar el OTP como usado
    otp.usado = true;
    await this.otpRepository.save(otp);

    // Actualizar la contraseña
    const salt = await bcrypt.genSalt(10);
    usuario.contra = await bcrypt.hash(contraNueva, salt);
    await this.usuarioRepository.save(usuario);

    return {
      mensaje: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
    };
  }
}