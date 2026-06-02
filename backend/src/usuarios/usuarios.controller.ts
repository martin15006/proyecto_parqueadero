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
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from './entities/usuario.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import type { IJwtPayload } from '../common/interfaces/auth.interface';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard) // RNF2: fuerza autenticación y autorización antes de emitir cualquier token de acceso.
  @Roles(TipoUsuarioEnum.APRENDIZ) // RF7/RF8: este código de acceso es para el usuario final (Aprendiz) y no debe exponerse a otros roles por defecto.
  @ApiBearerAuth() // RNF2: documenta que el endpoint requiere JWT (evita consumo anónimo).
  @Get('codigo-acceso') // RF8: endpoint dedicado para obtener el string base que se codificará como código de barras (y opcionalmente QR).
  @ApiOperation({ summary: 'Obtener código de acceso vehicular (Base para Code128/QR) - RF8' }) // RF8: trazabilidad explícita al requerimiento.
  async obtenerCodigoAccesoVehicular(@CurrentUser() usuario: IJwtPayload) { // RNF2: solo usamos el identificador interno del token (sub) y evitamos exponer documento en respuesta.
    const perfil = await this.usuarioService.findOneByDocumento(usuario.sub); // RNF2: recupera desde BD el QR seed sin devolver PII adicional; se usa como token opaco.

    if (!perfil) { // SECURITY: fail-closed si el token es válido pero el usuario ya no existe (cuenta desactivada/eliminada).
      return { // SECURITY: respuesta mínima, sin PII; evita filtrar si existe o no un documento específico mediante detalles.
        tokenAccesoVehicular: null, // RF8: se indica ausencia de token sin inventar valores.
        formatoRecomendadoBase: 'BARCODE_CODE128', // RF8: el documento menciona código de barras; Code128 soporta el alfanumérico del token opaco.
        timestamp: new Date().toISOString(), // RNF2: trazabilidad técnica sin identidad.
      };
    }

    const rawSeed = perfil.qr // RNF2: se usa un valor opaco (UUID) en lugar de documento/cédula.
      ? perfil.qr // RF8: el QR existente es una semilla válida para generar un código de barras (mismo string).
      : (await this.usuarioService.regenerarQr(usuario.sub)).qr; // RF8/RNF2: garantiza disponibilidad del token sin revelar PII; reutiliza flujo existente (no altera lógica de negocio).

    const tokenAccesoVehicular = String(rawSeed) // RF8: garantizamos string estándar para codificación.
      .trim() // RNF2: evitamos espacios invisibles que rompen lectores físicos.
      .replace(/-/g, '') // RF8 (Code128): el lector físico puede fallar con separadores; convertimos UUID a 32 hex puros.
      .toUpperCase(); // RF8: normalizamos a alfanumérico puro (A-F/0-9), más estable para hardware.

    return { // RF8: respuesta explícita con el token y el formato recomendado para el hardware lector.
      tokenAccesoVehicular, // RNF2: token opaco sin documento/cédula/PII; compatible con codificación Code128 y QR.
      formatoRecomendadoBase: 'BARCODE_CODE128', // RF8: recomendación base para lectores de código de barras (Code128 es estándar para strings alfanuméricos).
      alternativas: ['QR'], // RF8: el mismo token puede presentarse como QR (contingencia), sin cambiar el valor base.
      timestamp: new Date().toISOString(), // RNF2: marcador temporal para debug y sincronización sin exponer identidad.
    };
  }

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
    // El admin crea usuarios ya verificados (sin OTP de activación)
    return this.usuarioService.createAdmin(dto);
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
