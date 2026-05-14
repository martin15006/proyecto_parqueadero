import {
  Controller, Post, Body, Get, UseGuards, Delete, Param, Patch,
} from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  @Get('tipos')
  listarTipos() {
    return this.vehiculosService.listarTipos();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  registrar(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Body() dto: CreateVehiculoDto,
  ) {
    return this.vehiculosService.registrarVehiculo(usuario.documento, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mios')
  listarMios(@CurrentUser() usuario: Omit<Usuario, 'contra'>) {
    return this.vehiculosService.listarMisVehiculos(usuario.documento);
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
}