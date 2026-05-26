import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BahiasService } from './bahias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

@Controller('bahias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BahiasController {
  constructor(private readonly bahiasService: BahiasService) {}

  @Get('estado-aprendiz') // RF15/RF16: expone un endpoint específico para UI de Aprendiz (mapa + indicador global).
  @Roles(TipoUsuarioEnum.APRENDIZ) // RNF2: limitamos estrictamente el acceso al rol APRENDIZ para no mezclar datos administrativos.
  async obtenerEstadoParaAprendiz() {
    const ocupacion = await this.bahiasService.obtenerOcupacion(); // RF15/RF16: reutiliza la fuente de verdad ya existente, sin inventar datos.

    return {
      indicadorGlobal: ocupacion.estadoParqueadero, // RF16: estado en {DISPONIBLE|LLENO|DESHABILITADO} derivado del cálculo global.
      espaciosDisponibles: ocupacion.disponibles, // RF16: contador en tiempo real (disponibles).
      espaciosOcupados: ocupacion.ocupados, // RF15: soporte de contador superior (ocupados) para el mapa del usuario.
      totalEspacios: ocupacion.total, // RF15: soporte de contador superior (total) para el mapa del usuario.
      parqueaderoDeshabilitado: ocupacion.parqueaderoDeshabilitado, // RF16/RF14: permite a la UI reflejar deshabilitado sin exponer controles admin.
      bahias: ocupacion.bahias, // RF15: estado por bahía para colorear mapa (verde/rojo/gris) sin incluir PII ni datos operativos sensibles.
      timestamp: new Date().toISOString(), // RNF2: dato técnico para trazabilidad de actualización sin exponer identidad.
    };
  }

  @Get()
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async findAll() {
    return await this.bahiasService.findAll();
  }

  @Get('ocupacion')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async getOcupacion() {
    return await this.bahiasService.obtenerOcupacion();
  }

  @Get(':id')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async findOne(@Param('id') id: string) {
    return await this.bahiasService.findOne(+id);
  }
}
