import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { Usuario } from '../usuarios/entities/usuario.entity';
import { CodigoOtp } from '../usuarios/entities/codigo-otp.entity';
import { SesionActiva } from './entities/sesion-activa.entity';
import { TokenBloqueado } from './entities/token-bloqueado.entity';

import { LoginDto } from '../usuarios/dto/login.dto';
import { VerificarOtpDto } from './dto/verificar-otp.dto';
import { ReenviarOtpDto } from './dto/reenviar-otp.dto';

import { MailService } from '../mail/mail.service';
import { AuthMantenimientoService } from './auth-mantenimiento.service';
import { IJwtPayload } from '../common/interfaces/auth.interface';

/**
 * Servicio centralizado de Autenticación y Autorización.
 * REFACTOR: Implementa lógica modular para gestión de sesiones, OTP y seguridad.
 */
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(CodigoOtp)
    private readonly otpRepository: Repository<CodigoOtp>,
    @InjectRepository(SesionActiva)
    private readonly sesionRepository: Repository<SesionActiva>,
    @InjectRepository(TokenBloqueado)
    private readonly blacklistRepository: Repository<TokenBloqueado>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly mantenimientoService: AuthMantenimientoService,
  ) { }

  /**
   * Inicialización del módulo.
   * PERFORMANCE: Inicia tareas de limpieza periódica de tokens y OTPs.
   */
  async onModuleInit() {
    this.iniciarTareasMantenimiento();
  }

  /**
   * Configura intervalos de limpieza automática.
   */
  private iniciarTareasMantenimiento() {
    setInterval(async () => {
      await this.mantenimientoService.ejecutarLimpieza();
    }, 3600000); // 1 hora
  }

  /**
   * Paso 1: Validación de credenciales primarias.
   * SECURITY: Valida identidad y genera desafío OTP de 2do factor.
   * @param loginDto Credenciales de acceso
   */
  async loginPaso1(loginDto: LoginDto): Promise<{ mensaje: string; correo: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: loginDto.correo },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(loginDto.contra, usuario.contra);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.generarYEnviarOtp(usuario);

    return {
      mensaje: 'Código de verificación enviado a tu correo',
      correo: usuario.correo,
    };
  }

  /**
   * Paso 2: Verificación de OTP y emisión de tokens.
   * SECURITY: Implementa límites de intentos y validación temporal.
   * @param dto Datos de verificación
   */
  async verificarOtp(dto: VerificarOtpDto): Promise<{ access_token: string; refresh_token: string; usuario: Omit<Usuario, 'contra'> }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: dto.correo },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const otp = await this.otpRepository.findOne({
      where: { documento: usuario.documento, usado: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('No hay código activo. Solicita uno nuevo.');
    }

    if (new Date() > otp.expiraEn) {
      await this.marcarOtpComoUsado(otp);
      throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
    }

    const maxIntentos = this.configService.get<number>('OTP_MAX_ATTEMPTS') ?? 3;
    if (otp.intentos >= maxIntentos) {
      await this.marcarOtpComoUsado(otp);
      throw new BadRequestException('Demasiados intentos fallidos. Solicita un código nuevo.');
    }

    if (otp.codigo !== dto.codigo) {
      otp.intentos += 1;
      await this.otpRepository.save(otp);
      throw new UnauthorizedException(`Código incorrecto. Intentos restantes: ${maxIntentos - otp.intentos}`);
    }

    await this.marcarOtpComoUsado(otp);

    const tokens = await this.generarTokens(usuario);
    const { contra, ...usuarioSinContrasena } = usuario;

    return { ...tokens, usuario: usuarioSinContrasena as Omit<Usuario, 'contra'> };
  }

  /**
   * Genera un par de Access Token (JWT) y Refresh Token (Opaque).
   * MOBILE_API: Emite tokens optimizados. El payload JWT es ligero para ahorrar datos.
   * SERIALIZATION: El Refresh Token es opaco y persistido para seguridad del hardware/mobile.
   */
  async generarTokens(usuario: Usuario) {
    // MOBILE_API: Payload mínimo para reducir el tamaño del header Authorization
    const payload: IJwtPayload = {
      sub: usuario.documento,
      idTipoUsr: usuario.idTipoUsr,
    };

    const access_token = await this.jwtService.signAsync(payload);
    // MOBILE_API: Refresh token largo y seguro para almacenamiento en Keychain/SecureStorage
    const refresh_token = crypto.randomBytes(64).toString('hex');

    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 7);

    await this.sesionRepository.save({
      documento: usuario.documento,
      refreshToken: refresh_token,
      expiraEn,
    });

    return { access_token, refresh_token };
  }

  /**
   * Renueva el Access Token mediante Refresh Token Rotation.
   * MOBILE_API: Permite mantener la sesión activa sin pedir login al usuario.
   * SECURITY: Implementa revocación automática de tokens usados.
   */
  async renovarToken(refreshToken: string) {
    const sesion = await this.sesionRepository.findOne({
      where: { refreshToken, revocado: false },
      relations: ['usuario'],
    });

    if (!sesion || sesion.expiraEn < new Date()) {
      if (sesion) {
        sesion.revocado = true;
        await this.sesionRepository.save(sesion);
      }
      throw new UnauthorizedException('Sesión expirada o inválida');
    }

    // SECURITY: Marcamos el token anterior como usado para evitar ataques de repetición
    sesion.revocado = true;
    await this.sesionRepository.save(sesion);

    return this.generarTokens(sesion.usuario);
  }

  /**
   * Cierra la sesión activa.
   */
  async logout(refreshToken: string) {
    const sesion = await this.sesionRepository.findOne({ where: { refreshToken } });

    if (sesion) {
      sesion.revocado = true;
      await this.sesionRepository.save(sesion);
    }

    return { ok: true, mensaje: 'Sesión cerrada correctamente' };
  }

  /**
   * Agrega un Access Token a la lista negra.
   * SECURITY: Previene el uso de tokens robados o de sesiones cerradas.
   */
  async revocarAccessToken(token: string): Promise<void> {
    const payload = this.jwtService.decode(token) as IJwtPayload;
    if (payload?.exp) {
      // PERFORMANCE: Se guarda solo si el token no ha expirado naturalmente
      await this.blacklistRepository.save({
        token,
        expiraEn: new Date(payload.exp * 1000),
      });
    }
  }

  /**
   * Verifica si un token está revocado.
   */
  async isTokenRevocado(token: string): Promise<boolean> {
    const existe = await this.blacklistRepository.findOne({ where: { token } });
    return !!existe;
  }

  /**
   * Reenvía código OTP.
   */
  async reenviarOtp(dto: ReenviarOtpDto): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: dto.correo },
    });

    if (!usuario) {
      return { mensaje: 'Si el correo existe, se enviará un nuevo código.' };
    }

    await this.generarYEnviarOtp(usuario);
    return { mensaje: 'Nuevo código enviado a tu correo.' };
  }

  /**
   * Recuperación de contraseña - Paso 1.
   */
  async solicitarRecuperacion(correo: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { correo } });

    if (!usuario) {
      return { mensaje: 'Si el correo está registrado, recibirás un código de verificación.' };
    }

    await this.generarYEnviarOtp(usuario);
    return { mensaje: 'Si el correo está registrado, recibirás un código de verificación.' };
  }

  /**
   * Recuperación de contraseña - Paso 2.
   */
  async verificarRecuperacion(correo: string, codigo: string): Promise<{ mensaje: string; valido: boolean }> {
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
      order: { createdAt: 'DESC' },
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

    return { mensaje: 'Código verificado correctamente', valido: true };
  }

  /**
   * Recuperación de contraseña - Paso 3.
   */
  async restablecerContrasena(correo: string, codigo: string, contraNueva: string): Promise<{ mensaje: string }> {
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
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.codigo !== codigo) {
      throw new BadRequestException('Código inválido o expirado.');
    }

    const passwordMatch = await bcrypt.compare(contraNueva, usuario.contra);
    if (passwordMatch) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }

    await this.marcarOtpComoUsado(otp);

    const salt = await bcrypt.genSalt(10);
    usuario.contra = await bcrypt.hash(contraNueva, salt);
    await this.usuarioRepository.save(usuario);

    return { mensaje: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' };
  }

  // --- MÉTODOS PRIVADOS ---

  /**
   * Genera un código OTP y lo envía.
   */
  private async generarYEnviarOtp(usuario: Usuario): Promise<void> {
    await this.otpRepository.update(
      { documento: usuario.documento, usado: false },
      { usado: true },
    );

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEn = new Date();
    expiraEn.setMinutes(expiraEn.getMinutes() + 5);

    await this.otpRepository.save({
      documento: usuario.documento,
      codigo,
      expiraEn,
    });

    await this.mailService.enviarCodigoOtp(usuario.correo, codigo, usuario.nombreCompleto);
  }

  /**
   * Invalida un OTP.
   */
  private async marcarOtpComoUsado(otp: CodigoOtp): Promise<void> {
    otp.usado = true;
    await this.otpRepository.save(otp);
  }
}
