import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../usuarios/dto/login.dto';
import { VerificarOtpDto } from './dto/verificar-otp.dto';
import { ReenviarOtpDto } from './dto/reenviar-otp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
   * Si es correcto, se le devuelve el JWT.
   */
  @Post('verificar-otp')
  @HttpCode(HttpStatus.OK)
  verificarOtp(@Body() dto: VerificarOtpDto) {
    return this.authService.verificarOtp(dto);
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
   * Endpoint protegido para verificar si el JWT sigue siendo válido.
   * Devuelve los datos del usuario logueado.
   * Útil para que la app verifique al iniciar si la sesión sigue activa.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  obtenerPerfil(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return usuario;
  }
}