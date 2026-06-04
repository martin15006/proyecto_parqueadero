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
   * Resumen consolidado de KPIs del dashboard.
   *
   * ### Fuente de métricas de ocupación
   * Los conteos (`total`, `ocupados`, `disponibles`, `porcentajeOcupacion`) se
   * calculan **únicamente** sobre las bahías con sensor activo registrado en la
   * tabla `sensor`, de modo que el total refleja la infraestructura física real
   * (actualmente 3 bahías: SN-001, SN-002, SN-003).
   *
   * Las 7 queries se ejecutan en paralelo para minimizar latencia.
   */
  async obtenerResumen() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsuarios,
      totalVehiculos,
      estadoGlobal,
      ingresosHoy,
      ingresosMes,
      alertasRaw,
    ] = await Promise.all([
      this.usuarioRepository.count(),
      this.vehiculoRepository.count(),
      // Conteo por movimientos (QR escaneados activos), única fuente de verdad para ocupación.
      this.bahiasService.obtenerOcupacion(),
      this.movimientoRepository
        .createQueryBuilder('m')
        .where('m.hora_ingreso >= :hoy', { hoy })
        .getCount(),
      this.movimientoRepository
        .createQueryBuilder('m')
        .where('m.hora_ingreso >= :primerDiaMes', { primerDiaMes })
        .getCount(),
      this.movimientoRepository.manager.query(
        `SELECT count(*) AS cantidad FROM alerta_sistema WHERE created_at >= $1`,
        [hace24Horas],
      ),
    ]);

    const total = estadoGlobal.total ?? 0;
    const ocupados = estadoGlobal.ocupados ?? 0;
    const disponibles = Math.max(total - ocupados, 0);
    const porcentajeOcupacion = total > 0 ? Math.round((ocupados / total) * 1000) / 10 : 0;

    return {
      totalUsuarios,
      totalVehiculos,
      parqueaderoDeshabilitado: estadoGlobal.parqueaderoDeshabilitado,
      estadoParqueadero: estadoGlobal.estadoParqueadero,
      ocupacion: {
        /** Total de bahías registradas (cupo máximo). */
        total,
        /** QRs escaneados activos (vehículos adentro). */
        ocupados,
        /** total - ocupados (mínimo 0). */
        disponibles,
        porcentajeOcupacion,
      },
      ingresosHoy,
      ingresosMes,
      alertasActivas: parseInt(alertasRaw[0]?.cantidad || '0', 10),
    };
  }

  /**
   * Mapa de calor deshabilitado tras quitar la relación movimiento ↔ bahía.
   * Se conserva el método para no romper el contrato del controller; devuelve vacío.
   */
  async obtenerMapaCalor() {
    return [];
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
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo', 'registroVehiculo.usuario'],
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
      relations: ['registroVehiculo', 'registroVehiculo.usuario', 'registroVehiculo.vehiculo'],
      order: { horaIngreso: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Historial de Movimientos');

    // Definición de columnas con anchos optimizados
    worksheet.columns = [
      { header: 'ID MOV', key: 'id', width: 10 },
      { header: 'PLACA', key: 'placa', width: 15 },
      { header: 'USUARIO', key: 'usuario', width: 35 },
      { header: 'FECHA INGRESO', key: 'ingreso', width: 25 },
      { header: 'FECHA SALIDA', key: 'salida', width: 25 },
      { header: 'ESTADO ACTUAL', key: 'estado', width: 15 },
    ];

    movimientos.forEach(m => {
      worksheet.addRow({
        id: m.idMovimiento,
        placa: m.registroVehiculo.vehiculo.placa,
        usuario: m.registroVehiculo.usuario.nombreCompleto,
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
      relations: ['registroVehiculo', 'registroVehiculo.usuario', 'registroVehiculo.vehiculo'],
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
      doc.fontSize(9).fillColor('#7f8c8d').text(`   Ingreso: ${m.horaIngreso.toLocaleString()} | Estado: ${m.estado}`);
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
