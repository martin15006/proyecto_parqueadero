import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, EntityManager } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { Usuario } from '../usuarios/entities/usuario.entity';
import { CodigoOtp } from '../usuarios/entities/codigo-otp.entity';
import { SesionActiva } from './entities/sesion-activa.entity';
import { TokenBloqueado } from './entities/token-bloqueado.entity';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

import { LoginDto } from '../usuarios/dto/login.dto';
import { VerificarOtpDto } from './dto/verificar-otp.dto';
import { ReenviarOtpDto } from './dto/reenviar-otp.dto';

import { MailService } from '../mail/mail.service';
import { AuthMantenimientoService } from './auth-mantenimiento.service';
import { IJwtPayload } from '../common/interfaces/auth.interface';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private static readonly OTP_RATE_LIMIT_MSG =
    'Ya se envió un código recientemente. Espera 1 minuto antes de solicitar otro.';

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

  async onModuleInit() {
    this.iniciarTareasMantenimiento();
  }

  private esErrorRateLimitOtp(error: unknown): boolean {
    if (!(error instanceof BadRequestException)) return false;
    const response = error.getResponse?.();
    const message =
      typeof response === 'string'
        ? response
        : (response as { message?: unknown } | undefined)?.message;
    if (Array.isArray(message)) return message.includes(AuthService.OTP_RATE_LIMIT_MSG);
    return message === AuthService.OTP_RATE_LIMIT_MSG;
  }

  private iniciarTareasMantenimiento() {
    setInterval(async () => {
      await this.mantenimientoService.ejecutarLimpieza();
    }, 3600000); // 1 hora
  }

  async loginPaso1(loginDto: LoginDto): Promise<{ mensaje: string; correo: string }> {
    const correoNormalizado = String(loginDto?.correo ?? '').trim().toLowerCase();
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.correo) = :correo', { correo: correoNormalizado })
      .getOne();

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(loginDto.contra, usuario.contra);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.correoVerificado) {
      // Reenviar OTP para que pueda verificar y activar su cuenta
      try {
        await this.generarYEnviarOtp(usuario);
      } catch (_) { /* ignorar rate-limit aquí */ }
      throw new UnauthorizedException('Debes verificar tu correo antes de iniciar sesión. Te reenviamos el código de verificación.');
    }

    try {
      await this.generarYEnviarOtp(usuario);
    } catch (error) {
      if (this.esErrorRateLimitOtp(error)) {
        return {
          mensaje: AuthService.OTP_RATE_LIMIT_MSG,
          correo: usuario.correo,
        };
      }
      throw error;
    }

    return {
      mensaje: 'Código de verificación enviado a tu correo',
      correo: usuario.correo,
    };
  }

  async verificarOtp(dto: VerificarOtpDto): Promise<{
    access_token: string;
    refresh_token: string;
    usuario: Omit<Usuario, 'contra'> & { rol: string }
  }> {
    return await this.otpRepository.manager.transaction(async (manager) => {
      const correoNormalizado = String(dto?.correo ?? '').trim().toLowerCase();
      const usuario = await manager
        .createQueryBuilder(Usuario, 'usuario')
        .where('LOWER(usuario.correo) = :correo', { correo: correoNormalizado })
        .getOne();

      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Bloqueo pesimista para evitar que dos hilos procesen el mismo OTP simultáneamente
      const otp = await manager.findOne(CodigoOtp, {
        where: { documento: usuario.documento, usado: false },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' }
      });

      if (!otp) {
        // Si no hay OTP activo, verificamos si se usó uno hace menos de 3 segundos
        // para mitigar el error 400 en peticiones duplicadas del frontend (doble submit).
        const otpReciente = await manager.findOne(CodigoOtp, {
          where: { documento: usuario.documento, usado: true },
          order: { updatedAt: 'DESC' },
        });

        if (otpReciente && (new Date().getTime() - otpReciente.updatedAt.getTime() < 3000)) {
          // RNF2 (Privacidad): prohibido loguear documento/cédula (PII). Registramos solo el evento técnico.
          this.logger.warn('Petición de verificación OTP duplicada detectada (posible doble submit).');
          throw new BadRequestException('Petición duplicada procesada exitosamente.');
        }

        throw new BadRequestException('No hay código activo. Solicita uno nuevo.');
      }

      if (new Date() > otp.expiraEn) {
        otp.usado = true;
        await manager.save(otp);
        throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
      }

      const maxIntentos = this.configService.get<number>('OTP_MAX_ATTEMPTS') ?? 3;
      if (otp.intentos >= maxIntentos) {
        otp.usado = true;
        await manager.save(otp);
        throw new BadRequestException('Demasiados intentos fallidos. Solicita un código nuevo.');
      }

      if (otp.codigo !== dto.codigo) {
        otp.intentos += 1;
        await manager.save(otp);
        throw new UnauthorizedException(`Código incorrecto. Intentos restantes: ${maxIntentos - otp.intentos}`);
      }

      otp.usado = true;
      await manager.save(otp);

      const tokens = await this.generarTokens(usuario, manager);

      const rolNombre = TipoUsuarioEnum[usuario.idTipoUsr] || 'APRENDIZ';

      const { contra, ...usuarioSinContrasena } = usuario;

      return {
        ...tokens,
        usuario: {
          ...usuarioSinContrasena,
          idTipoUsr: usuario.idTipoUsr,
          rol: rolNombre
        }
      };
    });
  }

  async generarTokens(usuario: Usuario, manager?: EntityManager) {
    const payload: IJwtPayload = {
      sub: usuario.documento,
      idTipoUsr: usuario.idTipoUsr,
    };

    const access_token = await this.jwtService.signAsync(payload);
    // Refresh token opaco, largo y seguro para almacenamiento en Keychain/SecureStorage
    const refresh_token = crypto.randomBytes(64).toString('hex');

    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 7);

    // Si hay un manager, usamos su repositorio para participar en la transacción
    const sesionRepo = manager ? manager.getRepository(SesionActiva) : this.sesionRepository;

    await sesionRepo.save({
      documento: usuario.documento,
      refreshToken: refresh_token,
      expiraEn,
    });

    return { access_token, refresh_token };
  }

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

    // Marcamos el token anterior como usado para evitar ataques de repetición
    sesion.revocado = true;
    await this.sesionRepository.save(sesion);

    const tokens = await this.generarTokens(sesion.usuario);
    const rolNombre = TipoUsuarioEnum[sesion.usuario.idTipoUsr] || 'APRENDIZ';
    const { contra, ...usuarioSinContrasena } = sesion.usuario;

    return {
      ...tokens,
      usuario: {
        ...usuarioSinContrasena,
        idTipoUsr: sesion.usuario.idTipoUsr,
        rol: rolNombre
      }
    };
  }

  async logout(refreshToken: string) {
    const sesion = await this.sesionRepository.findOne({ where: { refreshToken } });

    if (sesion) {
      sesion.revocado = true;
      await this.sesionRepository.save(sesion);
    }

    return { ok: true, mensaje: 'Sesión cerrada correctamente' };
  }

  async revocarAccessToken(token: string): Promise<void> {
    const payload = this.jwtService.decode(token) as IJwtPayload;
    if (payload?.exp) {
      // Se guarda solo si el token no ha expirado naturalmente
      await this.blacklistRepository.save({
        token,
        expiraEn: new Date(payload.exp * 1000),
      });
    }
  }

  async isTokenRevocado(token: string): Promise<boolean> {
    const existe = await this.blacklistRepository.findOne({ where: { token } });
    return !!existe;
  }

  async reenviarOtp(dto: ReenviarOtpDto): Promise<{ mensaje: string }> {
    const correoNormalizado = String(dto?.correo ?? '').trim().toLowerCase();
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.correo) = :correo', { correo: correoNormalizado })
      .getOne();

    if (!usuario) {
      return { mensaje: 'Si el correo existe, se enviará un nuevo código.' };
    }

    try {
      await this.generarYEnviarOtp(usuario);
      return { mensaje: 'Nuevo código enviado a tu correo.' };
    } catch (error) {
      if (this.esErrorRateLimitOtp(error)) {
        return { mensaje: AuthService.OTP_RATE_LIMIT_MSG };
      }
      throw error;
    }
  }

  async solicitarRecuperacion(correo: string): Promise<{ mensaje: string }> {
    const correoNormalizado = String(correo ?? '').trim().toLowerCase();
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.correo) = :correo', { correo: correoNormalizado })
      .getOne();

    if (!usuario) {
      return { mensaje: 'Si el correo está registrado, recibirás un código de verificación.' };
    }

    try {
      await this.generarYEnviarOtp(usuario);
    } catch (error) {
      if (this.esErrorRateLimitOtp(error)) {
        return { mensaje: 'Si el correo está registrado, recibirás un código de verificación.' };
      }
      this.logger.error('Fallo al enviar OTP en solicitarRecuperacion.', error as Error);
      return { mensaje: 'Si el correo está registrado, recibirás un código de verificación.' };
    }
    return { mensaje: 'Si el correo está registrado, recibirás un código de verificación.' };
  }

  async verificarRecuperacion(correo: string, codigo: string): Promise<{ mensaje: string; valido: boolean }> {
    const correoNormalizado = String(correo ?? '').trim().toLowerCase();
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.correo) = :correo', { correo: correoNormalizado })
      .getOne();

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

  async restablecerContrasena(correo: string, codigo: string, contraNueva: string): Promise<{ mensaje: string }> {
    const correoNormalizado = String(correo ?? '').trim().toLowerCase();
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.correo) = :correo', { correo: correoNormalizado })
      .getOne();

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

  private get isDevEmailDisabled(): boolean {
    return (
      this.configService.get<string>('NODE_ENV') !== 'production' &&
      this.configService.get<string>('DISABLE_EMAILS') === 'true'
    );
  }

  async generarYEnviarOtpPublico(usuario: Usuario): Promise<void> {
    return this.generarYEnviarOtp(usuario);
  }

  /**
   * Verifica el OTP enviado al registrar un usuario.
   * Si es válido → marca correoVerificado = true y emite tokens (login automático).
   */
  async verificarRegistroOtp(dto: VerificarOtpDto): Promise<{
    access_token: string;
    refresh_token: string;
    usuario: Omit<Usuario, 'contra'> & { rol: string };
  }> {
    return await this.otpRepository.manager.transaction(async (manager) => {
      const correoNormalizado = String(dto?.correo ?? '').trim().toLowerCase();
      const usuario = await manager
        .createQueryBuilder(Usuario, 'usuario')
        .where('LOWER(usuario.correo) = :correo', { correo: correoNormalizado })
        .getOne();

      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      if (usuario.correoVerificado) {
        throw new BadRequestException('El correo ya fue verificado. Inicia sesión normalmente.');
      }

      const otp = await manager.findOne(CodigoOtp, {
        where: { documento: usuario.documento, usado: false },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });

      if (!otp) throw new BadRequestException('No hay código activo. Solicita uno nuevo.');

      if (new Date() > otp.expiraEn) {
        otp.usado = true;
        await manager.save(otp);
        throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
      }

      const maxIntentos = this.configService.get<number>('OTP_MAX_ATTEMPTS') ?? 3;
      if (otp.intentos >= maxIntentos) {
        otp.usado = true;
        await manager.save(otp);
        throw new BadRequestException('Demasiados intentos fallidos. Solicita un código nuevo.');
      }

      if (otp.codigo !== dto.codigo) {
        otp.intentos += 1;
        await manager.save(otp);
        throw new UnauthorizedException(`Código incorrecto. Intentos restantes: ${maxIntentos - otp.intentos}`);
      }

      otp.usado = true;
      await manager.save(otp);

      usuario.correoVerificado = true;
      await manager.save(usuario);

      const tokens = await this.generarTokens(usuario, manager);
      const rolNombre = TipoUsuarioEnum[usuario.idTipoUsr] || 'APRENDIZ';
      const { contra, ...usuarioSinContrasena } = usuario;

      return {
        ...tokens,
        usuario: { ...usuarioSinContrasena, idTipoUsr: usuario.idTipoUsr, rol: rolNombre },
      };
    });
  }

  private async generarYEnviarOtp(usuario: Usuario): Promise<void> {
    const { idOtp, codigo } = await this.crearOtp(usuario.documento);
    if (this.isDevEmailDisabled) {
      this.logger.warn(`[DEV] OTP para ${usuario.correo}: ${codigo}`);
      return;
    }
    try {
      await this.mailService.enviarCodigoOtp(usuario.correo, codigo, usuario.nombreCompleto);
    } catch (error) {
      await this.otpRepository.update({ idOtp }, { usado: true });
      throw new InternalServerErrorException('No se pudo enviar el código de verificación. Intenta de nuevo.');
    }
  }

  async crearOtp(documento: string): Promise<{ idOtp: number; codigo: string; expiraEn: Date }> {
    const ultimoOtp = await this.otpRepository.findOne({
      where: { documento, usado: false },
      order: { createdAt: 'DESC' },
    });

    if (ultimoOtp) {
      const UN_MINUTO = 60 * 1000;
      const tiempoTranscurrido = Date.now() - ultimoOtp.createdAt.getTime();

      if (tiempoTranscurrido < UN_MINUTO) {
        if (this.isDevEmailDisabled) {
          return { idOtp: ultimoOtp.idOtp, codigo: ultimoOtp.codigo, expiraEn: ultimoOtp.expiraEn };
        }
        this.logger.warn('Intento de generación de OTP bloqueado por rate-limit (1min).');
        throw new BadRequestException(AuthService.OTP_RATE_LIMIT_MSG);
      }
    }

    await this.otpRepository.update(
      { documento, usado: false },
      { usado: true },
    );

    const codigo = crypto.randomInt(100000, 1000000).toString();
    const expiraEn = new Date();
    expiraEn.setMinutes(expiraEn.getMinutes() + 5);

    const creado = await this.otpRepository.save({
      documento,
      codigo,
      expiraEn,
    });

    return { idOtp: creado.idOtp, codigo, expiraEn };
  }

  async validarYConsumirOtp(documento: string, codigo: string): Promise<void> {
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
  }

  private async marcarOtpComoUsado(otp: CodigoOtp): Promise<void> {
    otp.usado = true;
    await this.otpRepository.save(otp);
  }
}
