import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
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
  ) {}

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
}