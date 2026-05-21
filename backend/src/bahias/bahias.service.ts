import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bahia } from './entities/bahia.entity';
import { MovimientoVehiculo, EstadoMovimiento } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { IOcupacionPayload } from '../common/interfaces/socket-payloads.interface';
import { IotStatusEnum } from '../common/enums/iot-status.enum';

/**
 * Servicio encargado de la gestión de la infraestructura física (Bahías).
 * Proporciona información de disponibilidad y ocupación en tiempo real.
 */
@Injectable()
export class BahiasService {
  constructor(
    @InjectRepository(Bahia)
    private readonly bahiaRepository: Repository<Bahia>,
    @InjectRepository(MovimientoVehiculo)
    private readonly movimientoRepository: Repository<MovimientoVehiculo>,
  ) {}

  /**
   * Retorna todas las bahías registradas con sus metadatos.
   */
  async findAll(): Promise<Bahia[]> {
    return await this.bahiaRepository.find({
      relations: ['tipoBahia', 'tipoControl'],
    });
  }

  /**
   * Busca una bahía específica por su ID.
   */
  async findOne(id: number): Promise<Bahia> {
    const bahia = await this.bahiaRepository.findOne({
      where: { idBahia: id },
      relations: ['tipoBahia', 'tipoControl'],
    });
    if (!bahia) throw new NotFoundException(`Bahía con ID ${id} no encontrada`);
    return bahia;
  }

  /**
   * Calcula el estado de ocupación global del parqueadero.
   * Utilizado para dashboards y sincronización realtime.
   */
  async obtenerOcupacion(): Promise<IOcupacionPayload> {
    const bahias = await this.bahiaRepository.find({
      relations: ['tipoBahia'],
    });
    
    // Obtenemos movimientos activos para cruzar con la infraestructura
    const movimientosActivos = await this.movimientoRepository.find({
      where: { estado: EstadoMovimiento.ADENTRO },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo'],
    });

    const total = bahias.length;
    const ocupados = movimientosActivos.length;

    return {
      total,
      ocupados,
      disponibles: total - ocupados,
      bahias: bahias.map(b => {
        const movimiento = movimientosActivos.find(m => m.idBahia === b.idBahia);
        
        // REFACTOR: Mapeo estricto al contrato de Socket.io
        return {
          idBahia: b.idBahia,
          nombreBahia: b.nombreBahia,
          estado: !!movimiento ? IotStatusEnum.OCCUPIED : IotStatusEnum.AVAILABLE,
          tipo: b.tipoBahia?.tipoBahia || 'Estándar',
          // Mantenemos datos adicionales si son necesarios para el frontend en el payload real, 
          // pero el contrato IOcupacionPayload ahora es el que manda.
        };
      }),
    };
  }

  /**
   * Busca la primera bahía disponible.
   * TODO: Implementar lógica de asignación inteligente por Tipo de Vehículo.
   */
  async encontrarBahiaDisponible(tipoVehiculoId?: number): Promise<Bahia | null> {
    const bahias = await this.bahiaRepository.find();
    const movimientosActivos = await this.movimientoRepository.find({
      where: { estado: EstadoMovimiento.ADENTRO },
    });

    const ocupadasIds = movimientosActivos.map(m => m.idBahia);
    return bahias.find(b => !ocupadasIds.includes(b.idBahia)) || null;
  }
}
