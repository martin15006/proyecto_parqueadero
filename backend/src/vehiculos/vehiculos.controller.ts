import {
  Controller, Post, Body, Get, UseGuards, Delete, Param, Patch, Query, ParseIntPipe,
} from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { CompartirVehiculoDto } from './dto/compartir-vehiculo.dto';
import { CorregirSolicitudDto } from './dto/corregir-solicitud.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

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

  @UseGuards(JwtAuthGuard)
  @Post()
  solicitarRegistro(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Body() dto: CreateVehiculoDto,
  ) {
    return this.vehiculosService.solicitarRegistroVehiculo(usuario.documento, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('solicitudes')
  misSolicitudes(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarMisSolicitudes(usuario.documento);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('solicitudes/:id/corregir')
  corregirSolicitud(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CorregirSolicitudDto,
  ) {
    return this.vehiculosService.corregirSolicitud(usuario.documento, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mios')
  listarMios(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarMisVehiculos(usuario.documento);
  }

  @UseGuards(JwtAuthGuard)
  @Get('historial')
  listarHistorial(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarHistorialUsuario(usuario.documento);
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
  @Get(':placa/puede-editar')
  puedeEditar(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
  ) {
    return this.vehiculosService.puedeEditarVehiculo(usuario.documento, placa);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':placa')
  eliminar(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
  ) {
    return this.vehiculosService.eliminarRegistro(usuario.documento, placa);
  }

  @UseGuards(JwtAuthGuard)
  @Get('compartidos-conmigo')
  compartidosConmigo(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarVehiculosCompartidosConmigo(usuario.documento);
  }

  @UseGuards(JwtAuthGuard)
  @Get('compartidos-pendientes')
  compartidosPendientes(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarInvitacionesPendientes(usuario.documento);
  }

  @UseGuards(JwtAuthGuard)
  @Post('compartidos/:idCompartir/aceptar')
  aceptarCompartido(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('idCompartir') idCompartir: string,
  ) {
    return this.vehiculosService.aceptarCompartido(usuario.documento, Number(idCompartir));
  }

  @UseGuards(JwtAuthGuard)
  @Post('compartidos/:idCompartir/rechazar')
  rechazarCompartido(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('idCompartir') idCompartir: string,
  ) {
    return this.vehiculosService.rechazarCompartido(usuario.documento, Number(idCompartir));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('compartidos/:idCompartir')
  eliminarCompartidoReceptor(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('idCompartir') idCompartir: string,
  ) {
    return this.vehiculosService.eliminarCompartidoComoReceptor(usuario.documento, Number(idCompartir));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':placa/compartir')
  infoCompartido(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
  ) {
    return this.vehiculosService.infoCompartidoMio(usuario.documento, placa);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':placa/compartir')
  compartir(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
    @Body() dto: CompartirVehiculoDto,
  ) {
    return this.vehiculosService.compartirVehiculo(usuario.documento, placa, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':placa/compartir')
  quitarCompartido(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
  ) {
    return this.vehiculosService.quitarCompartido(usuario.documento, placa);
  }
}
