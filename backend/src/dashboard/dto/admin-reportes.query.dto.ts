import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminReporteExcelQueryDto {
  @IsString()
  @IsIn(['movimientos', 'usuarios', 'vehiculos'])
  tipo: 'movimientos' | 'usuarios' | 'vehiculos';

  @IsDateString()
  @IsOptional()
  desde?: string;

  @IsDateString()
  @IsOptional()
  hasta?: string;
}

export class AdminReportePdfQueryDto {
  @IsDateString()
  @IsOptional()
  desde?: string;

  @IsDateString()
  @IsOptional()
  hasta?: string;
}

export class AdminReporteFlujoQueryDto {
  @IsString()
  @IsIn(['dia', 'semana', 'mes'])
  groupBy: 'dia' | 'semana' | 'mes';

  @IsDateString()
  @IsOptional()
  desde?: string;

  @IsDateString()
  @IsOptional()
  hasta?: string;
}

/**
 * RF21/RF22: Query de histórico analítico (panel administrador).
 *
 * Objetivo:
 * - Permitir filtros por rango (desde/hasta) y criterios opcionales (tipoVehiculo, idUsuario).
 * - Permitir paginación para no saturar la UI ni el backend.
 */
export class AdminReporteHistoricoQueryDto {
  @IsDateString() // RF21: el rango debe ser expresado en formato ISO para evitar ambigüedad regional.
  @IsOptional() // RF21: si no se provee, el backend aplica un rango por defecto seguro.
  desde?: string; // RF21: fecha/hora inicial del análisis.

  @IsDateString() // RF21: el rango debe ser expresado en formato ISO para evitar ambigüedad regional.
  @IsOptional() // RF21: si no se provee, el backend aplica un rango por defecto seguro.
  hasta?: string; // RF21: fecha/hora final del análisis.

  @IsString() // RF21: se filtra por el nombre del tipo de vehículo ya existente (ej. "Moto", "Carro").
  @IsOptional() // RF21: filtro opcional.
  tipoVehiculo?: string; // RF21: criterio de segmentación de flujos.

  @IsString() // RF21: el documento del usuario es string (se usa como identificador institucional).
  @IsOptional() // RF21: filtro opcional.
  idUsuario?: string; // RF21: permite filtrar históricos por un aprendiz específico.

  @IsInt() // RF21: paginación tipada.
  @Min(1) // RF21: página mínima 1.
  @IsOptional() // RF21: opcional; por defecto 1.
  page?: number; // RF21: control de paginación.

  @IsInt() // RF21: paginación tipada.
  @Min(1) // RF21: mínimo 1 elemento.
  @Max(200) // HARDENING: limita tamaño de página para proteger memoria/latencia.
  @IsOptional() // RF21: opcional; por defecto 20.
  limit?: number; // RF21: tamaño de página.
}
