import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
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
  @Delete(':placa')
  eliminar(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Param('placa') placa: string,
  ) {
    return this.vehiculosService.eliminarRegistro(usuario.documento, placa);
  }
}