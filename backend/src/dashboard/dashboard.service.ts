import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { MovimientoVehiculo, EstadoMovimiento } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { Visita } from '../visitas/entities/visita.entity';
import { BahiasService } from '../bahias/bahias.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

const PDFDocument = require('pdfkit');

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Vehiculo)
    private readonly vehiculoRepository: Repository<Vehiculo>,
    @InjectRepository(MovimientoVehiculo)
    private readonly movimientoRepository: Repository<MovimientoVehiculo>,
    @InjectRepository(Visita)
    private readonly visitaRepository: Repository<Visita>,
    private readonly bahiasService: BahiasService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

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
        total,
        ocupados,
        disponibles,
        porcentajeOcupacion,
      },
      ingresosHoy,
      ingresosMes,
      alertasActivas: parseInt(alertasRaw[0]?.cantidad || '0', 10),
    };
  }

  async obtenerMapaCalor() {
    return [];
  }

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

  private construirFiltroFecha(desde?: string, hasta?: string) {
    const aFecha = (valor?: string) => {
      if (!valor) return null;
      const d = new Date(valor);
      return isNaN(d.getTime()) ? null : d;
    };
    const desdeD = aFecha(desde);
    const hastaD = aFecha(hasta);
    if (desdeD && hastaD) return Between(desdeD, hastaD);
    if (desdeD) return MoreThanOrEqual(desdeD);
    if (hastaD) return LessThanOrEqual(hastaD);
    return undefined;
  }

  async obtenerHistorial(page: number = 1, limit: number = 20, desde?: string, hasta?: string) {
    const take = page * limit;

    const filtroFecha = this.construirFiltroFecha(desde, hasta);
    const whereFecha = filtroFecha ? { horaIngreso: filtroFecha } : {};

    const [movs, movCount] = await this.movimientoRepository.findAndCount({
      where: whereFecha,
      relations: [
        'registroVehiculo',
        'registroVehiculo.vehiculo',
        'registroVehiculo.vehiculo.tipoVehiculo',
        'registroVehiculo.usuario',
        'usuarioIngreso',
      ],
      // Conserva los movimientos aunque el vehículo o su registro hayan sido
      // eliminados (soft-delete): el historial no debe perder estos ingresos.
      withDeleted: true,
      order: { horaIngreso: 'DESC' },
      take,
    });

    const [visitas, visitaCount] = await this.visitaRepository.findAndCount({
      where: whereFecha,
      order: { horaIngreso: 'DESC' },
      take,
    });

    const autores = await this.auditoriaService.mapearAutoresPorEntidad(
      'REGISTRAR_ENTRADA',
      'MOVIMIENTO_VEHICULO',
      movs.map((m) => m.idMovimiento),
    );
    const docsOperativos = new Set<string>();
    for (const d of autores.values()) if (d && d !== 'SISTEMA') docsOperativos.add(d);
    for (const v of visitas) if (v.idOperativoIngreso) docsOperativos.add(v.idOperativoIngreso);
    const operativos = docsOperativos.size
      ? await this.usuarioRepository.find({ where: { documento: In([...docsOperativos]) }, withDeleted: true })
      : [];
    const nombrePorDoc = new Map(operativos.map((u) => [u.documento, u.nombreCompleto]));
    const autorizadoPor = (doc?: string | null) =>
      !doc ? null : { documento: doc, nombreCompleto: doc === 'SISTEMA' ? 'Sistema' : nombrePorDoc.get(doc) ?? doc };

    const filasMov = movs.map((m) => ({
      idMovimiento: `mov-${m.idMovimiento}`,
      esVisitante: false,
      estado: m.estado as string,
      esManual: m.esManual,
      horaIngreso: m.horaIngreso,
      horaSalida: m.horaSalida,
      registroVehiculo: m.registroVehiculo
        ? {
            vehiculo: m.registroVehiculo.vehiculo
              ? {
                  placa: m.registroVehiculo.vehiculo.placa,
                  color: m.registroVehiculo.vehiculo.color,
                  tipoVehiculo: m.registroVehiculo.vehiculo.tipoVehiculo
                    ? { tipoVehiculo: m.registroVehiculo.vehiculo.tipoVehiculo.tipoVehiculo }
                    : null,
                }
              : null,
            usuario: m.registroVehiculo.usuario
              ? { nombreCompleto: m.registroVehiculo.usuario.nombreCompleto, documento: m.registroVehiculo.usuario.documento }
              : null,
          }
        : null,
      usuarioIngreso: m.usuarioIngreso
        ? { nombreCompleto: m.usuarioIngreso.nombreCompleto, documento: m.usuarioIngreso.documento }
        : null,
      autorizadoPor: autorizadoPor(autores.get(String(m.idMovimiento))),
    }));

    const filasVis = visitas.map((v) => ({
      idMovimiento: `vis-${v.idVisita}`,
      esVisitante: true,
      estado: v.estado as string,
      esManual: false,
      horaIngreso: v.horaIngreso,
      horaSalida: v.horaSalida,
      registroVehiculo: {
        vehiculo: {
          placa: v.placa,
          color: null as string | null,
          tipoVehiculo: v.tipoVehiculo ? { tipoVehiculo: v.tipoVehiculo } : null,
        },
        usuario: { nombreCompleto: v.nombreVisitante, documento: v.documentoVisitante },
      },
      usuarioIngreso: { nombreCompleto: v.nombreVisitante, documento: v.documentoVisitante },
      autorizadoPor: autorizadoPor(v.idOperativoIngreso),
    }));

    const todas = [...filasMov, ...filasVis].sort(
      (a, b) => new Date(b.horaIngreso).getTime() - new Date(a.horaIngreso).getTime(),
    );
    const total = movCount + visitaCount;
    const data = todas.slice((page - 1) * limit, page * limit);

    return { data, total, page, lastPage: Math.max(1, Math.ceil(total / limit)) };
  }

  async exportarExcel(res: Response, user: any) {
    const movimientos = await this.movimientoRepository.find({
      relations: ['registroVehiculo', 'registroVehiculo.usuario', 'registroVehiculo.vehiculo'],
      // Se incluyen los eliminados (soft-delete) para no perder históricos.
      withDeleted: true,
      order: { horaIngreso: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Historial de Movimientos');

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
        placa: m.registroVehiculo?.vehiculo?.placa ?? '—',
        usuario: m.registroVehiculo?.usuario?.nombreCompleto ?? '—',
        ingreso: m.horaIngreso,
        salida: m.horaSalida || 'N/A',
        estado: m.estado,
      });
    });

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

  async exportarPDF(res: Response, user: any) {
    const movimientos = await this.movimientoRepository.find({
      relations: ['registroVehiculo', 'registroVehiculo.usuario', 'registroVehiculo.vehiculo'],
      // Se incluyen los eliminados (soft-delete) para no perder históricos.
      withDeleted: true,
      order: { horaIngreso: 'DESC' },
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_movimientos.pdf');

    doc.pipe(res);

    doc.fontSize(22).text('REPORTE INSTITUCIONAL DE MOVIMIENTOS', { align: 'center', underline: true });
    doc.fontSize(10).text(`Generado por: ${user.sub} el ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown(2);

    movimientos.forEach((m, index) => {
      const placa = m.registroVehiculo?.vehiculo?.placa ?? '—';
      const usuario = m.registroVehiculo?.usuario?.nombreCompleto ?? '—';
      const ingreso = m.horaIngreso ? new Date(m.horaIngreso).toLocaleString() : '—';
      doc.fontSize(11).fillColor('#2c3e50').text(`${index + 1}. ${placa} - ${usuario}`);
      doc.fontSize(9).fillColor('#7f8c8d').text(`   Ingreso: ${ingreso} | Estado: ${m.estado}`);
      doc.moveDown(0.5);
    });

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
