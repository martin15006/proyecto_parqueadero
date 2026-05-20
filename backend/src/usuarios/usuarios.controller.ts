import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { SolicitarCambioCorreoDto } from './dto/solicitar-cambio-correo.dto';
import { ConfirmarCambioCorreoDto } from './dto/confirmar-cambio-correo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from './entities/usuario.entity';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.loginPaso1(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cambiar-contrasena')
  cambiarContrasena(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Body() dto: CambiarContrasenaDto,
  ) {
    return this.usuarioService.cambiarContrasena(
      usuario.documento,
      dto.contraActual,
      dto.contraNueva,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('perfil')
  actualizarPerfil(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.usuarioService.actualizarPerfil(usuario.documento, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('correo/solicitar')
  solicitarCambioCorreo(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Body() dto: SolicitarCambioCorreoDto,
  ) {
    return this.usuarioService.solicitarCambioCorreo(usuario.documento, dto.nuevoCorreo);
  }

  @UseGuards(JwtAuthGuard)
  @Post('correo/confirmar')
  confirmarCambioCorreo(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Body() dto: ConfirmarCambioCorreoDto,
  ) {
    return this.usuarioService.confirmarCambioCorreo(
      usuario.documento,
      dto.nuevoCorreo,
      dto.codigo,
    );
  }

  /**
   * Endpoint consumido por el celador cuando escanea el QR del usuario.
   * Recibe el UUID del QR y devuelve la información del usuario + sus vehículos.
   *
   * NOTA: Por ahora es público para facilitar la integración con la app del celador.
   * Cuando el equipo implemente el login del celador, se debe proteger con un guard
   * que verifique idTipoUsr=3 (Personal Operativo).
   */
  @Get('qr/:uuid')
  buscarPorQR(@Param('uuid') uuid: string) {
    return this.usuarioService.buscarPorQR(uuid);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':documento')
  findOne(@Param('documento') documento: string) {
    return this.usuarioService.findOne(documento);
  }
}