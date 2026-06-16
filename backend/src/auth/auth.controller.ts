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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  loginPaso1(@Body() loginDto: LoginDto) {
    return this.authService.loginPaso1(loginDto);
  }

  @Post('verificar-otp')
  @HttpCode(HttpStatus.OK)
  verificarOtp(@Body() dto: VerificarOtpDto) {
    return this.authService.verificarOtp(dto);
  }

  @Post('verificar-registro')
  @HttpCode(HttpStatus.OK)
  verificarRegistro(@Body() dto: VerificarOtpDto) {
    return this.authService.verificarRegistroOtp(dto);
  }

  @Post('reenviar-otp')
  @HttpCode(HttpStatus.OK)
  reenviarOtp(@Body() dto: ReenviarOtpDto) {
    return this.authService.reenviarOtp(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.renovarToken(dto.refreshToken);
  }

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
