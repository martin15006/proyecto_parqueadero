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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsuarioService } from './usuario.service';
import { AuthService } from '../auth/auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { SolicitarCambioCorreoDto } from './dto/solicitar-cambio-correo.dto';
import { ConfirmarCambioCorreoDto } from './dto/confirmar-cambio-correo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from './entities/usuario.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import type { IJwtPayload } from '../common/interfaces/auth.interface';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  @ApiBearerAuth()
  @Post('admin')
  @ApiOperation({ summary: 'Crear un usuario (Solo Admin)' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  createByAdmin(@Body() dto: CreateUsuarioAdminDto) {
    return this.usuarioService.create(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.loginPaso1(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cambiar-contrasena')
  cambiarContrasena(
    @CurrentUser() usuario: IJwtPayload,
    @Body() dto: CambiarContrasenaDto,
  ) {
    return this.usuarioService.cambiarContrasena(
      usuario.sub,
      dto.contraActual,
      dto.contraNueva,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('perfil')
  actualizarPerfil(
    @CurrentUser() usuario: IJwtPayload,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.usuarioService.actualizarPerfil(usuario.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('correo/solicitar')
  solicitarCambioCorreo(
    @CurrentUser() usuario: IJwtPayload,
    @Body() dto: SolicitarCambioCorreoDto,
  ) {
    return this.usuarioService.solicitarCambioCorreo(usuario.sub, dto.nuevoCorreo);
  }

  @UseGuards(JwtAuthGuard)
  @Post('correo/confirmar')
  confirmarCambioCorreo(
    @CurrentUser() usuario: IJwtPayload,
    @Body() dto: ConfirmarCambioCorreoDto,
  ) {
    return this.usuarioService.confirmarCambioCorreo(
      usuario.sub,
      dto.nuevoCorreo,
      dto.codigo,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('qr/regenerar')
  @ApiOperation({ summary: 'Regenerar el código QR del usuario (Seguridad Dinámica)' })
  regenerarQr(@CurrentUser() usuario: IJwtPayload) {
    return this.usuarioService.regenerarQr(usuario.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('push-token')
  @ApiOperation({ summary: 'Actualizar token de notificaciones push (Firebase)' })
  actualizarTokenPush(@CurrentUser() usuario: IJwtPayload, @Body('token') token: string) {
    return this.usuarioService.actualizarTokenPush(usuario.sub, token);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Obtener lista de usuarios con paginación (Solo Admin)' })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.usuarioService.findAll(page, limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  @ApiBearerAuth()
  @Get('qr/:uuid')
  @ApiOperation({ summary: 'Buscar usuario por código QR (Admin/Operativo)' })
  buscarPorQR(@Param('uuid') uuid: string) {
    return this.usuarioService.buscarPorQR(uuid);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  @ApiBearerAuth()
  @Get(':documento')
  findOne(@Param('documento') documento: string) {
    return this.usuarioService.findOne(documento);
  }
}
