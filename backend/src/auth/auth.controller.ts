import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../usuarios/dto/login.dto';
import { VerificarOtpDto } from './dto/verificar-otp.dto';
import { ReenviarOtpDto } from './dto/reenviar-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { SolicitarRecuperacionDto } from './dto/recuperar-contrasena.dto';
import { VerificarRecuperacionDto } from './dto/verificar-recuperacion.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * Paso 1 del login: el usuario manda correo + contraseña.
   * Si son correctas, se le envía un código OTP al correo.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  loginPaso1(@Body() loginDto: LoginDto) {
    return this.authService.loginPaso1(loginDto);
  }

  /**
   * Paso 2 del login: el usuario manda el código OTP.
   * MOBILE_API: Al verificar con éxito, devuelve tokens de larga duración para mobile.
   * SERIALIZATION: Excluye datos sensibles del objeto 'usuario' retornado.
   */
  @Post('verificar-otp')
  @HttpCode(HttpStatus.OK)
  verificarOtp(@Body() dto: VerificarOtpDto) {
    return this.authService.verificarOtp(dto);
  }

  /**
   * Verifica el OTP enviado al registrarse.
   * Si es válido activa la cuenta y devuelve tokens (login automático).
   */
  @Post('verificar-registro')
  @HttpCode(HttpStatus.OK)
  verificarRegistro(@Body() dto: VerificarOtpDto) {
    return this.authService.verificarRegistroOtp(dto);
  }

  /**
   * Reenvía un nuevo código OTP al correo del usuario.
   */
  @Post('reenviar-otp')
  @HttpCode(HttpStatus.OK)
  reenviarOtp(@Body() dto: ReenviarOtpDto) {
    return this.authService.reenviarOtp(dto);
  }

  /**
   * Renueva el Access Token usando un Refresh Token válido.
   * MOBILE_API: Endpoint vital para persistencia de sesión sin fricción (Silent Refresh).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.renovarToken(dto.refreshToken);
  }

  /**
   * Cierra la sesión revocando el Refresh Token y el Access Token actual.
   * MOBILE_API: Limpia la sesión tanto en servidor como en el almacenamiento del dispositivo.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto, @Request() req: any) {
    if (!req.user) {
      throw new UnauthorizedException('No autenticado');
    }

    const authHeader = req.headers.authorization;
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const raw = typeof headerValue === 'string' ? headerValue.trim() : '';

    if (!raw.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Token inválido');
    }

    const token = raw.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Token inválido');
    }

    await this.authService.revocarAccessToken(token);
    
    return this.authService.logout(dto.refreshToken);
  }

  /**
   * Endpoint protegido para verificar si el JWT sigue siendo válido.
   * MOBILE_API: Usado en el splash screen o App State para validar sesión al despertar la app.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  obtenerPerfil(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return usuario;
  }

  @Post('recuperar/solicitar')
  solicitarRecuperacion(@Body() dto: SolicitarRecuperacionDto) {
    return this.authService.solicitarRecuperacion(dto.correo);
  }

  @Post('recuperar/verificar')
  verificarRecuperacion(@Body() dto: VerificarRecuperacionDto) {
    return this.authService.verificarRecuperacion(dto.correo, dto.codigo);
  }

  @Post('recuperar/restablecer')
  restablecerContrasena(@Body() dto: RestablecerContrasenaDto) {
    return this.authService.restablecerContrasena(
      dto.correo,
      dto.codigo,
      dto.contraNueva,
    );
  }
}
