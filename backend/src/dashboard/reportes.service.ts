import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { MovimientoVehiculo, EstadoMovimiento } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { Bahia } from '../bahias/entities/bahia.entity';
import type { Response } from 'express';
import type {
  AdminReporteExcelQueryDto,
  AdminReporteFlujoQueryDto,
  AdminReporteHistoricoQueryDto,
  AdminReportePdfQueryDto,
} from './dto/admin-reportes.query.dto';
import { Auditoria } from '../auditoria/entities/auditoria.entity';

const PDFDocument = require('pdfkit');

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(MovimientoVehiculo)
    private readonly movimientoRepository: Repository<MovimientoVehiculo>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Vehiculo)
    private readonly vehiculoRepository: Repository<Vehiculo>,
    @InjectRepository(Bahia)
    private readonly bahiaRepository: Repository<Bahia>,
  ) {}

  private parseRango(desde?: string, hasta?: string): { from: Date; to: Date } {
    const now = new Date();
    const defaultTo = new Date(now);
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 7);

    const from = desde ? new Date(desde) : defaultFrom;
    const to = hasta ? new Date(hasta) : defaultTo;

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Rango de fechas inválido');
    }

    if (from > to) {
      throw new BadRequestException('El parámetro "desde" no puede ser mayor que "hasta"');
    }

    return { from, to };
  }

  private formatDateForFilename(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  }

  /**
   * RF21/RF22: Construye un query base reutilizable para histórico de movimientos.
   *
   * Objetivo:
   * - Unificar filtros (rango, tipoVehiculo, idUsuario) para:
   *   - listado paginado (panel),
   *   - exportación CSV,
   *   - cómputo de métricas (promedio estancia, pico ocupación).
   */
  private buildHistoricoBaseQuery(from: Date, to: Date, query: AdminReporteHistoricoQueryDto) {
    const qb = this.movimientoRepository
      .createQueryBuilder('mv') // RF21: tabla base de movimientos (fuente de verdad operativa).
      .innerJoin('mv.registroVehiculo', 'rv') // RF21: enlaza vehículo ↔ usuario.
      .innerJoin('rv.usuario', 'u') // RF21: propietario (aprendiz) del vehículo.
      .innerJoin('rv.vehiculo', 'v') // RF21: vehículo asociado a la placa.
      .leftJoin('v.tipoVehiculo', 'tv') // RF21: tipo de vehículo (relación ya existente).
      .leftJoin(
        Auditoria,
        'ae',
        `ae.entidad = 'MOVIMIENTO_VEHICULO' AND ae.accion = 'REGISTRAR_ENTRADA' AND ae.id_entidad = CAST(mv.id_movimiento AS text)`,
      ) // RF21/RF23: determina el operador responsable del ingreso sin alterar esquema de movimientos.
      .leftJoin(
        Usuario,
        'op',
        'op.documento = ae.id_usuario',
      ); // RF21/RF23: resuelve nombre del operador desde tabla de usuarios.

    qb.where('mv.hora_ingreso BETWEEN :from AND :to', { from, to }); // RF21: rango institucional por horaIngreso.

    if (query.tipoVehiculo) {
      qb.andWhere('tv.tipo_vehiculo ILIKE :tipoVehiculo', {
        tipoVehiculo: `%${String(query.tipoVehiculo).trim()}%`,
      }); // RF21: filtro opcional por tipo (sin inventar IDs).
    }

    if (query.idUsuario) {
      qb.andWhere('u.documento = :idUsuario', {
        idUsuario: String(query.idUsuario).trim(),
      }); // RF21: filtro opcional por usuario (documento).
    }

    return qb;
  }

  /**
   * RF21: Calcula el pico máximo de ocupación en el rango usando un barrido de eventos (ingreso/salida).
   *
   * Decisión:
   * - Se evita cargar todos los movimientos completos.
   * - Se calcula por eventos (+1 ingreso, -1 salida) en orden cronológico.
   */
  private async calcularPicoOcupacion(from: Date, to: Date, query: AdminReporteHistoricoQueryDto): Promise<number> {
    const filtrosJoin = `
      FROM movimiento_vehiculo mv
      INNER JOIN registro_vehiculo rv ON rv.id_registro_v = mv.id_registro_vehiculo
      INNER JOIN usuario u ON u.documento = rv.id_usuario
      INNER JOIN vehiculo v ON v.placa = rv.id_vehiculo
      LEFT JOIN tipo_vehiculo tv ON tv.id_tipo_v = v.id_tipo_vehiculo
      WHERE 1=1
    `;

    // CRÍTICO (PostgreSQL / parámetros):
    // Este método ejecuta dos consultas nativas distintas:
    // - baseAtFrom usa solo $1 (from)
    // - eventos usa $1 (from) y $2 (to)
    // Por lo tanto, cada query debe recibir su propio array de parámetros para evitar:
    // "bind message supplies X parameters, but prepared statement requires Y".
    const buildFiltros = (startIndex: number) => {
      let filtros = '';
      const params: any[] = [];
      let idx = startIndex;

      if (query.tipoVehiculo) {
        idx += 1;
        params.push(`%${String(query.tipoVehiculo).trim()}%`);
        filtros += ` AND tv.tipo_vehiculo ILIKE $${idx}`;
      }

      if (query.idUsuario) {
        idx += 1;
        params.push(String(query.idUsuario).trim());
        filtros += ` AND u.documento = $${idx}`;
      }

      return { filtros, params };
    };

    const filtrosBaseAtFrom = buildFiltros(1);
    const baseAtFromParams = [from, ...filtrosBaseAtFrom.params];

    const baseAtFrom = await this.movimientoRepository.manager.query(
      `
      SELECT COUNT(*)::int AS count
      ${filtrosJoin}
        AND mv.hora_ingreso < $1
        AND (mv.hora_salida IS NULL OR mv.hora_salida >= $1)
      ${filtrosBaseAtFrom.filtros}
      `,
      baseAtFromParams,
    );

    let ocupacionActual = Number(baseAtFrom?.[0]?.count ?? 0);
    let pico = ocupacionActual;

    const filtrosRango = buildFiltros(2);
    const eventosParams = [from, to, ...filtrosRango.params];

    const eventos = await this.movimientoRepository.manager.query(
      `
      SELECT ts, delta
      FROM (
        SELECT mv.hora_ingreso AS ts, 1 AS delta
        ${filtrosJoin}
          AND mv.hora_ingreso BETWEEN $1 AND $2
        ${filtrosRango.filtros}

        UNION ALL

        SELECT mv.hora_salida AS ts, -1 AS delta
        ${filtrosJoin}
          AND mv.hora_salida IS NOT NULL
          AND mv.hora_salida BETWEEN $1 AND $2
        ${filtrosRango.filtros}
      ) e
      ORDER BY ts ASC, delta ASC
      `,
      eventosParams,
    );

    for (const e of eventos || []) {
      ocupacionActual += Number(e.delta || 0);
      if (ocupacionActual > pico) pico = ocupacionActual;
    }

    return pico;
  }

  /**
   * RF21/RF22: Histórico paginado + métricas estadísticas.
   */
  async obtenerHistorico(query: AdminReporteHistoricoQueryDto) {
    const { from, to } = this.parseRango(query.desde, query.hasta); // RF21: valida rango de fechas.

    const page = typeof query.page === 'number' && query.page > 0 ? query.page : 1; // RF21: default page=1.
    const limit =
      typeof query.limit === 'number' && query.limit > 0 ? Math.min(query.limit, 200) : 20; // RF21: default limit=20 con hard cap.
    const offset = (page - 1) * limit; // RF21: cálculo de offset.

    const qb = this.buildHistoricoBaseQuery(from, to, query); // RF21: query base con filtros.

    const countQb = qb.clone(); // RF21: clon para count sin afectar selects.
    const total = await countQb.getCount(); // RF21: total para paginación.

    const rows = await qb
      .select([
        'mv.id_movimiento AS "idMovimiento"',
        'v.placa AS "placa"',
        'COALESCE(tv.tipo_vehiculo, \'\') AS "tipoVehiculo"',
        'u.documento AS "idUsuario"',
        'u.nombre_completo AS "propietario"',
        'mv.hora_ingreso AS "horaIngreso"',
        'mv.hora_salida AS "horaSalida"',
        'COALESCE(op.nombre_completo, \'\') AS "operadorResponsable"',
        `CASE
          WHEN mv.hora_salida IS NULL THEN NULL
          ELSE ROUND(EXTRACT(EPOCH FROM (mv.hora_salida - mv.hora_ingreso)) / 60.0)::int
        END AS "estanciaMinutos"`,
      ])
      .orderBy('mv.hora_ingreso', 'DESC')
      .offset(offset)
      .limit(limit)
      .getRawMany();

    const avgRaw = await this.buildHistoricoBaseQuery(from, to, query)
      .andWhere('mv.hora_salida IS NOT NULL') // RF21: solo movimientos cerrados tienen estancia.
      .select([
        `AVG(EXTRACT(EPOCH FROM (mv.hora_salida - mv.hora_ingreso)) / 60.0) AS "avgMin"`,
        `COUNT(*)::int AS "totalIngresos"`,
      ])
      .getRawOne();

    const promedioEstanciaMinutos =
      avgRaw?.avgMin !== null && avgRaw?.avgMin !== undefined ? Number(avgRaw.avgMin) : null; // RF21: promedio calculado.
    const totalIngresos = Number(avgRaw?.totalIngresos ?? total); // RF21: total de ingresos en el período.

    const picoMaximoOcupacion = await this.calcularPicoOcupacion(from, to, query); // RF21: máximo simultáneo en el rango.

    const lastPage = Math.max(1, Math.ceil(total / limit)); // RF21: total páginas.

    return {
      data: rows, // RF21: listado paginado.
      meta: {
        pagination: { total, page, lastPage, limit }, // RF21: metadatos de paginación.
        stats: { totalIngresos, promedioEstanciaMinutos, picoMaximoOcupacion }, // RF21: métricas analíticas.
      },
    };
  }

  /**
   * RF23: Prepara nombre institucional para exportación CSV.
   */
  async prepararCsvHistorico(query: AdminReporteHistoricoQueryDto) {
    const { from, to } = this.parseRango(query.desde, query.hasta); // RF23: valida rango para filename.
    const filename = `reporte_historico_${this.formatDateForFilename(from)}_${this.formatDateForFilename(to)}.csv`; // RF23: nombre estable.
    return { filename, from, to };
  }

  /**
   * RF23: Stream CSV en chunks para consumo mínimo de RAM.
   *
   * Decisión:
   * - Se escribe directamente en el Response (stream) para evitar buffers grandes.
   * - Se pagina internamente para exportar rangos grandes sin saturación.
   */
  async streamCsvHistorico(query: AdminReporteHistoricoQueryDto, res: Response) {
    const { from, to } = this.parseRango(query.desde, query.hasta); // RF23: rango validado.

    const escapeCsv = (value: unknown) => {
      const raw = value === null || value === undefined ? '' : String(value);
      const needsQuotes = /[",\r\n]/.test(raw);
      const escaped = raw.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const headers = [
      'Placa',
      'Tipo de Vehículo',
      'Propietario',
      'Hora Ingreso',
      'Hora Salida',
      'Operador Responsable',
    ];

    res.write(`${headers.map(escapeCsv).join(',')}\r\n`); // RF23: encabezados CSV + CRLF (compatibilidad).

    const take = 2000; // RF23: chunk estable para streaming.
    let offset = 0; // RF23: paginación interna para export.

    while (true) {
      const qb = this.buildHistoricoBaseQuery(from, to, query);

      const rows = await qb
        .select([
          'v.placa AS "placa"',
          'COALESCE(tv.tipo_vehiculo, \'\') AS "tipoVehiculo"',
          'u.nombre_completo AS "propietario"',
          'mv.hora_ingreso AS "horaIngreso"',
          'mv.hora_salida AS "horaSalida"',
          'COALESCE(op.nombre_completo, \'\') AS "operadorResponsable"',
        ])
        .orderBy('mv.hora_ingreso', 'DESC')
        .offset(offset)
        .limit(take)
        .getRawMany();

      if (!rows.length) break;

      for (const r of rows) {
        const line = [
          r.placa,
          r.tipoVehiculo,
          r.propietario,
          r.horaIngreso ? new Date(r.horaIngreso).toISOString() : '',
          r.horaSalida ? new Date(r.horaSalida).toISOString() : '',
          r.operadorResponsable,
        ]
          .map(escapeCsv)
          .join(',');

        res.write(`${line}\r\n`); // RF23: escribe fila sin acumular en memoria.
      }

      if (rows.length < take) break;
      offset += take;
    }
  }

  async generarExcel(query: AdminReporteExcelQueryDto): Promise<{ buffer: Buffer; filename: string }> {
    const { from, to } = this.parseRango(query.desde, query.hasta);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Parqueadero SENA';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Reporte', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const headerStyle = {
      font: { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1F2937' } },
      alignment: { vertical: 'middle' as const, horizontal: 'center' as const, wrapText: true },
    };

    if (query.tipo === 'movimientos') {
      sheet.columns = [
        { header: 'ID', key: 'idMovimiento', width: 10 },
        { header: 'Placa', key: 'placa', width: 12 },
        { header: 'Usuario', key: 'usuario', width: 28 },
        { header: 'Documento', key: 'documento', width: 12 },
        { header: 'Ingreso', key: 'ingreso', width: 20 },
        { header: 'Salida', key: 'salida', width: 20 },
        { header: 'Estado', key: 'estado', width: 12 },
        { header: 'Manual', key: 'manual', width: 10 },
      ];

      const rows = await this.movimientoRepository.find({
        where: {
          horaIngreso: Between(from, to),
        } as any,
        relations: ['registroVehiculo', 'registroVehiculo.usuario', 'registroVehiculo.vehiculo'],
        order: { horaIngreso: 'DESC' },
        take: 5000,
      });

      rows.forEach((m) => {
        sheet.addRow({
          idMovimiento: m.idMovimiento,
          placa: m.registroVehiculo?.idVehiculo ?? '',
          usuario: m.registroVehiculo?.usuario?.nombreCompleto ?? '',
          documento: m.registroVehiculo?.usuario?.documento ?? '',
          ingreso: m.horaIngreso ? new Date(m.horaIngreso).toISOString() : '',
          salida: m.horaSalida ? new Date(m.horaSalida).toISOString() : '',
          estado: m.estado,
          manual: m.esManual ? 'SI' : 'NO',
        });
      });
    } else if (query.tipo === 'usuarios') {
      sheet.columns = [
        { header: 'Documento', key: 'documento', width: 12 },
        { header: 'Nombre Completo', key: 'nombre', width: 32 },
        { header: 'Correo', key: 'correo', width: 28 },
        { header: 'Teléfono', key: 'telefono', width: 14 },
        { header: 'Rol', key: 'rol', width: 12 },
        { header: 'Estado Cuenta', key: 'estado', width: 14 },
        { header: 'Vehículos', key: 'vehiculos', width: 30 },
        { header: 'Creado', key: 'creado', width: 20 },
      ];

      const usuarios = await this.usuarioRepository
        .createQueryBuilder('u')
        .withDeleted()
        .leftJoinAndSelect('u.registrosVehiculos', 'rv')
        .leftJoinAndSelect('rv.vehiculo', 'v')
        .where('u.created_at BETWEEN :from AND :to', { from, to })
        .orderBy('u.created_at', 'DESC')
        .getMany();

      usuarios.forEach((u) => {
        const placas = (u.registrosVehiculos || []).map((r) => r.vehiculo?.placa).filter(Boolean);
        sheet.addRow({
          documento: u.documento,
          nombre: u.nombreCompleto,
          correo: u.correo,
          telefono: u.numTelf,
          rol: String(u.idTipoUsr),
          estado: u.deletedAt ? 'INACTIVO' : 'ACTIVO',
          vehiculos: placas.join(', '),
          creado: u.createdAt ? new Date(u.createdAt).toISOString() : '',
        });
      });
    } else {
      sheet.columns = [
        { header: 'Placa', key: 'placa', width: 12 },
        { header: 'Tipo', key: 'tipo', width: 16 },
        { header: 'Color', key: 'color', width: 14 },
        { header: 'Estado Actual', key: 'estado', width: 12 },
        { header: 'Creado', key: 'creado', width: 20 },
      ];

      const vehiculos = await this.vehiculoRepository
        .createQueryBuilder('v')
        .leftJoinAndSelect('v.tipoVehiculo', 'tv')
        .where('v.created_at BETWEEN :from AND :to', { from, to })
        .orderBy('v.created_at', 'DESC')
        .take(5000)
        .getMany();

      const placas = vehiculos.map((v) => v.placa);
      const adentroRaw = await this.movimientoRepository.manager.query(
        `
        SELECT rv.id_vehiculo as placa
        FROM movimiento_vehiculo mv
        INNER JOIN registro_vehiculo rv ON rv.id_registro_v = mv.id_registro_vehiculo
        WHERE mv.estado = $1 AND mv.deleted_at IS NULL AND rv.id_vehiculo = ANY($2)
        GROUP BY rv.id_vehiculo
        `,
        [EstadoMovimiento.ADENTRO, placas],
      );

      const adentroSet = new Set<string>((adentroRaw || []).map((r: any) => String(r.placa)));

      vehiculos.forEach((v) => {
        sheet.addRow({
          placa: v.placa,
          tipo: v.tipoVehiculo?.tipoVehiculo ?? '',
          color: v.color,
          estado: adentroSet.has(v.placa) ? 'ADENTRO' : 'AFUERA',
          creado: v.createdAt ? new Date(v.createdAt).toISOString() : '',
        });
      });
    }

    sheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle as any;
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

    const filename = `reporte_${query.tipo}_${this.formatDateForFilename(from)}_${this.formatDateForFilename(to)}.xlsx`;
    return { buffer, filename };
  }

  async generarPdfOcupacion(query: AdminReportePdfQueryDto): Promise<{ buffer: Buffer; filename: string }> {
    const { from, to } = this.parseRango(query.desde, query.hasta);

    const totalBahias = await this.bahiaRepository.count();

    const raw = await this.movimientoRepository.manager.query(
      `
      SELECT
        DATE_TRUNC('day', mv.hora_ingreso) AS dia,
        COUNT(*) FILTER (WHERE mv.hora_ingreso BETWEEN $1 AND $2) AS ingresos,
        COUNT(*) FILTER (WHERE mv.hora_salida BETWEEN $1 AND $2) AS salidas
      FROM movimiento_vehiculo mv
      WHERE (mv.hora_ingreso BETWEEN $1 AND $2) OR (mv.hora_salida BETWEEN $1 AND $2)
      GROUP BY dia
      ORDER BY dia ASC
      `,
      [from, to],
    );

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const title = 'Reporte Institucional - Bitácora de Ocupación';
    doc.fontSize(16).text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#374151').text(`Rango: ${from.toISOString()} → ${to.toISOString()}`, { align: 'center' });
    doc.moveDown(1);

    doc.fillColor('#111827').fontSize(12).text(`Total de espacios: ${totalBahias}`, { align: 'left' });
    doc.moveDown(0.5);

    const tableTop = doc.y + 10;
    const colX = { dia: 50, ingresos: 260, salidas: 360 };

    doc.fontSize(10).fillColor('#ffffff');
    doc.rect(50, tableTop, 495, 20).fill('#111827');
    doc.fillColor('#ffffff').text('Día', colX.dia, tableTop + 6);
    doc.text('Ingresos', colX.ingresos, tableTop + 6);
    doc.text('Salidas', colX.salidas, tableTop + 6);

    let y = tableTop + 28;
    doc.fillColor('#111827').fontSize(10);
    raw.forEach((r: any, idx: number) => {
      if (y > 760) {
        doc.addPage();
        y = 80;
      }
      const bg = idx % 2 === 0 ? '#f3f4f6' : '#ffffff';
      doc.rect(50, y - 4, 495, 18).fill(bg);
      doc.fillColor('#111827');
      const diaStr = new Date(r.dia).toISOString().slice(0, 10);
      doc.text(diaStr, colX.dia, y);
      doc.text(String(r.ingresos ?? 0), colX.ingresos, y);
      doc.text(String(r.salidas ?? 0), colX.salidas, y);
      y += 18;
    });

    doc.end();

    const buffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const filename = `reporte_ocupacion_${this.formatDateForFilename(from)}_${this.formatDateForFilename(to)}.pdf`;
    return { buffer, filename };
  }

  async obtenerFlujo(query: AdminReporteFlujoQueryDto) {
    const { from, to } = this.parseRango(query.desde, query.hasta);

    const groupExpr = query.groupBy === 'dia'
      ? "DATE_TRUNC('day', mv.hora_ingreso)"
      : query.groupBy === 'semana'
        ? "DATE_TRUNC('week', mv.hora_ingreso)"
        : "DATE_TRUNC('month', mv.hora_ingreso)";

    const ingresos = await this.movimientoRepository.manager.query(
      `
      SELECT ${groupExpr} AS bucket, COUNT(*)::int AS cantidad
      FROM movimiento_vehiculo mv
      WHERE mv.hora_ingreso BETWEEN $1 AND $2
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [from, to],
    );

    const salidas = await this.movimientoRepository.manager.query(
      `
      SELECT ${groupExpr} AS bucket, COUNT(*)::int AS cantidad
      FROM movimiento_vehiculo mv
      WHERE mv.hora_salida BETWEEN $1 AND $2
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [from, to],
    );

    const toMap = (arr: any[]) => new Map<string, number>(arr.map((r) => [new Date(r.bucket).toISOString(), Number(r.cantidad)]));
    const inMap = toMap(ingresos);
    const outMap = toMap(salidas);

    const keys = Array.from(new Set([...inMap.keys(), ...outMap.keys()])).sort();

    return keys.map((k) => ({
      fecha: k,
      ingresos: inMap.get(k) ?? 0,
      salidas: outMap.get(k) ?? 0,
    }));
  }
}
