import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { MovimientoVehiculo, EstadoMovimiento } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { BahiasService } from '../bahias/bahias.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

// Importación de PDFKit con manejo de tipos manual para evitar errores de compilación
const PDFDocument = require('pdfkit');

/**
 * Servicio de Dashboard y Analíticas.
 * Encargado de consolidar información estadística y generar reportes administrativos.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Vehiculo)
    private readonly vehiculoRepository: Repository<Vehiculo>,
    @InjectRepository(MovimientoVehiculo)
    private readonly movimientoRepository: Repository<MovimientoVehiculo>,
    private readonly bahiasService: BahiasService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Obtiene un resumen consolidado de los indicadores clave de rendimiento (KPIs).
   */
  async obtenerResumen() {
    const totalUsuarios = await this.usuarioRepository.count();
    const totalVehiculos = await this.vehiculoRepository.count();
    const ocupacion = await this.bahiasService.obtenerOcupacion();

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Ingresos registrados en el día actual
    const ingresosHoy = await this.movimientoRepository
      .createQueryBuilder('movimiento')
      .where('movimiento.hora_ingreso >= :hoy', { hoy })
      .getCount();

    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    // Ingresos acumulados en el mes actual
    const ingresosMes = await this.movimientoRepository
      .createQueryBuilder('movimiento')
      .where('movimiento.hora_ingreso >= :primerDiaMes', { primerDiaMes })
      .getCount();

    // Conteo de alertas críticas de sistema en las últimas 24 horas
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alertasRaw = await this.movimientoRepository.manager.query(`
      SELECT count(*) as cantidad 
      FROM alerta_sistema 
      WHERE created_at >= $1
    `, [hace24Horas]);
    
    const alertasActivas = parseInt(alertasRaw[0]?.cantidad || '0', 10);

    return {
      totalUsuarios,
      totalVehiculos,
      ocupacion: {
        total: ocupacion.total,
        ocupados: ocupacion.ocupados,
        disponibles: ocupacion.disponibles,
      },
      ingresosHoy,
      ingresosMes,
      alertasActivas,
    };
  }

  /**
   * Genera datos para el mapa de calor basado en la frecuencia histórica de uso de las bahías.
   */
  async obtenerMapaCalor() {
    const heatmap = await this.movimientoRepository
      .createQueryBuilder('movimiento')
      .select('movimiento.id_bahia', 'idBahia')
      .addSelect('COUNT(*)', 'intensidad')
      .groupBy('movimiento.id_bahia')
      .getRawMany();

    return heatmap.map(h => ({
      idBahia: parseInt(h.idBahia, 10),
      intensidad: parseInt(h.intensidad, 10),
    }));
  }

  /**
   * Obtiene la tendencia de ingresos de la última semana (7 días).
   */
  async obtenerEstadisticas() {
    const sieteDiasAtras = new Date();
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);

    const movimientos = await this.movimientoRepository
      .createQueryBuilder('movimiento')
      .select("DATE_TRUNC('day', movimiento.hora_ingreso)", 'fecha')
      .addSelect('COUNT(*)', 'cantidad')
      .where('movimiento.hora_ingreso >= :fecha', { fecha: sieteDiasAtras })
      .groupBy('fecha')
      .orderBy('fecha', 'ASC')
      .getRawMany();

    return movimientos.map(m => ({
      fecha: m.fecha,
      cantidad: parseInt(m.cantidad, 10),
    }));
  }

  /**
   * Analiza el tráfico vehicular distribuido por horas para identificar picos operativos.
   */
  async obtenerTraficoPorHoras() {
    const trafico = await this.movimientoRepository
      .createQueryBuilder('movimiento')
      .select("EXTRACT(HOUR FROM movimiento.hora_ingreso)", 'hora')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('hora')
      .orderBy('hora', 'ASC')
      .getRawMany();

    return trafico.map(t => ({
      hora: parseInt(t.hora, 10),
      cantidad: parseInt(t.cantidad, 10),
    }));
  }

  /**
   * Obtiene la distribución de ocupación actual segmentada por tipo de vehículo.
   */
  async obtenerOcupacionPorTipo() {
    return await this.movimientoRepository
      .createQueryBuilder('movimiento')
      .leftJoin('movimiento.registroVehiculo', 'rv')
      .leftJoin('rv.vehiculo', 'v')
      .leftJoin('v.tipoVehiculo', 'tv')
      .select('tv.tipoVehiculo', 'tipo')
      .addSelect('COUNT(*)', 'cantidad')
      .where('movimiento.estado = :estado', { estado: EstadoMovimiento.ADENTRO })
      .groupBy('tv.tipoVehiculo')
      .getRawMany();
  }

  /**
   * Obtiene el historial de movimientos paginado.
   * MOBILE_API: Usado para el log de actividad en tiempo real de la app.
   * PAGINATION: Offset y límite para optimizar la carga en dispositivos móviles.
   */
  async obtenerHistorial(page: number = 1, limit: number = 20) {
    // PAGINATION: Búsqueda paginada de movimientos históricos
    const [data, total] = await this.movimientoRepository.findAndCount({
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo', 'registroVehiculo.usuario', 'bahia'],
      order: { horaIngreso: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * Genera y transmite un archivo Excel con el historial completo de movimientos.
   */
  async exportarExcel(res: Response, user: any) {
    const movimientos = await this.movimientoRepository.find({
      relations: ['registroVehiculo', 'registroVehiculo.usuario', 'registroVehiculo.vehiculo', 'bahia'],
      order: { horaIngreso: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Historial de Movimientos');

    // Definición de columnas con anchos optimizados
    worksheet.columns = [
      { header: 'ID MOV', key: 'id', width: 10 },
      { header: 'PLACA', key: 'placa', width: 15 },
      { header: 'USUARIO', key: 'usuario', width: 35 },
      { header: 'BAHÍA', key: 'bahia', width: 15 },
      { header: 'FECHA INGRESO', key: 'ingreso', width: 25 },
      { header: 'FECHA SALIDA', key: 'salida', width: 25 },
      { header: 'ESTADO ACTUAL', key: 'estado', width: 15 },
    ];

    movimientos.forEach(m => {
      worksheet.addRow({
        id: m.idMovimiento,
        placa: m.registroVehiculo.vehiculo.placa,
        usuario: m.registroVehiculo.usuario.nombreCompleto,
        bahia: m.bahia.nombreBahia,
        ingreso: m.horaIngreso,
        salida: m.horaSalida || 'N/A',
        estado: m.estado,
      });
    });

    // Auditoría de exportación para cumplimiento de seguridad
    await this.auditoriaService.create({
      accion: 'EXPORTAR_DATOS_EXCEL',
      entidad: 'DASHBOARD',
      idUsuario: user.sub,
      ip: user.ip || '127.0.0.1',
      userAgent: 'Admin Dashboard',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_movimientos.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Genera y transmite un reporte PDF profesional.
   */
  async exportarPDF(res: Response, user: any) {
    const movimientos = await this.movimientoRepository.find({
      relations: ['registroVehiculo', 'registroVehiculo.usuario', 'registroVehiculo.vehiculo', 'bahia'],
      order: { horaIngreso: 'DESC' },
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_movimientos.pdf');

    doc.pipe(res);

    // Encabezado del reporte
    doc.fontSize(22).text('REPORTE INSTITUCIONAL DE MOVIMIENTOS', { align: 'center', underline: true });
    doc.fontSize(10).text(`Generado por: ${user.sub} el ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown(2);

    // Listado de movimientos
    movimientos.forEach((m, index) => {
      doc.fontSize(11).fillColor('#2c3e50').text(`${index + 1}. ${m.registroVehiculo.vehiculo.placa} - ${m.registroVehiculo.usuario.nombreCompleto}`);
      doc.fontSize(9).fillColor('#7f8c8d').text(`   Ubicación: ${m.bahia.nombreBahia} | Ingreso: ${m.horaIngreso.toLocaleString()} | Estado: ${m.estado}`);
      doc.moveDown(0.5);
    });

    // Auditoría de exportación
    await this.auditoriaService.create({
      accion: 'EXPORTAR_DATOS_PDF',
      entidad: 'DASHBOARD',
      idUsuario: user.sub,
      ip: user.ip || '127.0.0.1',
      userAgent: 'Admin Dashboard',
    });

    doc.end();
  }
}
