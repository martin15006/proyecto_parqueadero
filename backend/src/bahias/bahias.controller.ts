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
    // Los conteos (total/ocupados/disponibles) usan solo las bahías con sensor activo
    // para que la app móvil muestre "3 cupos" y no el total de todas las bahías de BD.
    const [ocupacion, metricas] = await Promise.all([
      this.bahiasService.obtenerOcupacion(),           // para estadoParqueadero, parqueaderoDeshabilitado y bahias-mapa
      this.bahiasService.obtenerMetricasSensorizadas(), // para los conteos reales (sensor.activo=true)
    ]);

    return {
      indicadorGlobal: ocupacion.estadoParqueadero, // RF16: estado en {DISPONIBLE|LLENO|DESHABILITADO}.
      espaciosDisponibles: metricas.bahiasDisponibles, // RF16: LIBRE + TRANSITO de las 3 bahías sensorizadas.
      espaciosOcupados: metricas.bahiasOcupadas,      // RF15: OCUPADO + DISCREPANCIA de las 3 bahías sensorizadas.
      totalEspacios: metricas.totalBahias,             // RF15: total físico sensorizado (debe ser 3).
      parqueaderoDeshabilitado: ocupacion.parqueaderoDeshabilitado, // RF16/RF14.
      bahias: ocupacion.bahias, // RF15: estado por bahía para mapa (incluye todas las bahías de BD para colorear el mapa).
      timestamp: new Date().toISOString(), // RNF2.
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
    // Los conteos superiores (total/ocupados/disponibles) reflejan solo bahías sensorizadas.
    // El array `bahias` conserva todas las entradas para el mapa de la app móvil.
    const [ocupacion, metricas] = await Promise.all([
      this.bahiasService.obtenerOcupacion(),
      this.bahiasService.obtenerMetricasSensorizadas(),
    ]);
    return {
      ...ocupacion,
      total: metricas.totalBahias,
      ocupados: metricas.bahiasOcupadas,
      disponibles: metricas.bahiasDisponibles,
    };
  }

  /**
   * Devuelve únicamente las bahías que tienen un sensor activo asociado,
   * enriquecidas con `estadoPanel` calculado listo para el Panel Operativo.
   *
   * El frontend usa este endpoint en lugar de `/bahias/ocupacion` para mostrar
   * solo la infraestructura sensorizada real (p.ej. 3 bahías con SN-001..003).
   */
  @Get('sensorizadas')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async getSensorizadas() {
    return await this.bahiasService.obtenerBahiasSensorizadas();
  }

  @Get(':id')
  @Roles(TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.OPERATIVO)
  async findOne(@Param('id') id: string) {
    return await this.bahiasService.findOne(+id);
  }
}
