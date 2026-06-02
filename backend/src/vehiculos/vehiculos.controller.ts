import {
  Controller, Post, Body, Get, UseGuards, Delete, Param, Patch, Query,
} from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { CompartirVehiculoDto } from './dto/compartir-vehiculo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  /**
   * Lista todos los vehículos registrados con paginación.
   * MOBILE_API: Usado por administradores para supervisar la flota total.
   * PAGINATION: Query params 'page' y 'limit' admitidos.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuarioEnum.ADMIN)
  @Get()
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.vehiculosService.findAll(page, limit);
  }

  @Get('tipos')
  listarTipos() {
    return this.vehiculosService.listarTipos();
  }

  /**
   * Envía una solicitud de registro de vehículo al administrador.
   * El vehículo NO queda registrado hasta que el admin apruebe.
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  solicitarRegistro(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Body() dto: CreateVehiculoDto,
  ) {
    return this.vehiculosService.solicitarRegistroVehiculo(usuario.documento, dto);
  }

  /** Lista las solicitudes del usuario autenticado */
  @UseGuards(JwtAuthGuard)
  @Get('solicitudes')
  misSolicitudes(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarMisSolicitudes(usuario.documento);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mios')
  listarMios(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarMisVehiculos(usuario.documento);
  }

  @UseGuards(JwtAuthGuard) // RF32: solo el usuario autenticado puede consultar su historial.
  @Get('historial') // RF32: endpoint de transparencia para que el Aprendiz vea sus ingresos/salidas.
  listarHistorial(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarHistorialUsuario(usuario.documento); // RNF2: limita la consulta al documento del token.
  }

  @UseGuards(JwtAuthGuard)
  @Get('detalle/:placa')
  obtenerDetalle(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
  ) {
    return this.vehiculosService.obtenerDetalle(usuario.documento, placa);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':placa')
  actualizar(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
    @Body() dto: ActualizarVehiculoDto,
  ) {
    return this.vehiculosService.actualizarVehiculo(usuario.documento, placa, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':placa')
  eliminar(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
  ) {
    return this.vehiculosService.eliminarRegistro(usuario.documento, placa);
  }

  // ─── COMPARTIR ────────────────────────────────────────────────────────────────

  /** Lista los vehículos que otros compartieron conmigo */
  @UseGuards(JwtAuthGuard)
  @Get('compartidos-conmigo')
  compartidosConmigo(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarVehiculosCompartidosConmigo(usuario.documento);
  }

  /** Info de con quién está compartido un vehículo mío */
  @UseGuards(JwtAuthGuard)
  @Get(':placa/compartir')
  infoCompartido(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
  ) {
    return this.vehiculosService.infoCompartidoMio(usuario.documento, placa);
  }

  /** Compartir mi vehículo con otro usuario por cédula */
  @UseGuards(JwtAuthGuard)
  @Post(':placa/compartir')
  compartir(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
    @Body() dto: CompartirVehiculoDto,
  ) {
    return this.vehiculosService.compartirVehiculo(usuario.documento, placa, dto);
  }

  /** Quitar el compartido de mi vehículo */
  @UseGuards(JwtAuthGuard)
  @Delete(':placa/compartir')
  quitarCompartido(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
  ) {
    return this.vehiculosService.quitarCompartido(usuario.documento, placa);
  }
}
