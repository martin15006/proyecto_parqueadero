import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CreateOperativoDto } from './dto/create-operativo.dto';
import { UpdateOperativoDto } from './dto/update-operativo.dto';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MailService } from '../mail/mail.service';
import { VehiculosService } from '../vehiculos/vehiculos.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { AuthService } from '../auth/auth.service';
import { AdminListUsuariosQueryDto } from './dto/admin-list-usuarios.query.dto';

/**
 * Servicio de Gestión de Usuarios.
 * Maneja el ciclo de vida del usuario, perfiles, seguridad de cuentas (OTP)
 * y vinculación con infraestructura institucional (QR).
 */
@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    @Inject(forwardRef(() => VehiculosService))
    private readonly vehiculosService: VehiculosService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Crea un nuevo usuario en el sistema con contraseña encriptada y QR inicial.
   */
  async create(createUsuarioDto: CreateUsuarioDto | CreateUsuarioAdminDto): Promise<Omit<Usuario, 'contra'>> {
    const { documento, correo, contra } = createUsuarioDto;
    const correoNormalizado = String(correo ?? '').trim().toLowerCase();
    const idTipoUsr = (
      'idTipoUsr' in createUsuarioDto && typeof createUsuarioDto.idTipoUsr === 'number'
    )
      ? createUsuarioDto.idTipoUsr
      : TipoUsuarioEnum.APRENDIZ;

    const existente = await this.usuarioRepository.findOne({
      where: [{ documento }, { correo: correoNormalizado }],
      withDeleted: true,
    });
    
    if (existente) {
      const campo = existente.documento === documento ? 'documento' : 'correo';
      throw new ConflictException(`El ${campo} ya se encuentra registrado`);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contra, salt);
    const qrValue = randomUUID();

    try {
      const { idTipoUsr: _idTipoUsr, ...data } = createUsuarioDto as CreateUsuarioAdminDto & CreateUsuarioDto;
      const nuevoUsuario = this.usuarioRepository.create({
        ...data,
        idTipoUsr,
        contra: hashedPassword,
        qr: qrValue,
        correo: correoNormalizado,
      });

      const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);

      await this.auditoriaService.create({
        accion: 'CREAR_USUARIO',
        entidad: 'USUARIO',
        idEntidad: parseInt(usuarioGuardado.documento),
        idUsuario: usuarioGuardado.documento,
        datosNuevos: { correo: usuarioGuardado.correo, nombre: usuarioGuardado.nombreCompleto },
      });

      const { contra: _contra, ...usuarioSinContrasena } = usuarioGuardado;
      return usuarioSinContrasena;
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === '23503' && pgError.constraint === 'usuario_idformacion_fkey') {
        throw new BadRequestException('La ficha de formación proporcionada no es válida.');
      }
      throw error;
    }
  }

  /**
   * Actualiza la contraseña de un usuario validando la anterior.
   */
  async cambiarContrasena(documento: string, contraActual: string, contraNueva: string): Promise<{ mensaje: string }> {
    const usuario = await this.findOneByDocumento(documento);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const esCorrecta = await bcrypt.compare(contraActual, usuario.contra);
    if (!esCorrecta) throw new UnauthorizedException('La contraseña actual es incorrecta');

    if (contraActual === contraNueva) {
      throw new BadRequestException('La nueva contraseña no puede ser igual a la anterior');
    }

    const salt = await bcrypt.genSalt(10);
    usuario.contra = await bcrypt.hash(contraNueva, salt);
    await this.usuarioRepository.save(usuario);

    return { mensaje: 'Contraseña actualizada exitosamente' };
  }

  /**
   * Búsqueda por documento (Requerido por Auth y Operativo).
   */
  async findOneByDocumento(documento: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({ where: { documento } });
  }

  private async findOneByDocumentoIncludingDeleted(documento: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({ where: { documento }, withDeleted: true });
  }

  /**
   * Búsqueda detallada por documento (Alias de findOne para compatibilidad).
   */
  async findOne(documento: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { documento },
      relations: ['tipoUsuario', 'formacion'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async findOneByCorreo(correo: string): Promise<Usuario | null> {
    const correoNormalizado = String(correo ?? '').trim().toLowerCase();
    return await this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.correo) = :correo', { correo: correoNormalizado })
      .getOne();
  }

  /**
   * Actualiza el token de notificaciones push para la aplicación móvil.
   */
  async actualizarTokenPush(documento: string, token: string) {
    const usuario = await this.findOneByDocumento(documento);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    
    usuario.pushToken = token;
    await this.usuarioRepository.save(usuario);
    return { ok: true, mensaje: 'Token push actualizado' };
  }

  /**
   * Regenera el código QR institucional.
   */
  async regenerarQr(documento: string): Promise<{ qr: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const nuevoQr = randomUUID();
    usuario.qr = nuevoQr;
    await this.usuarioRepository.save(usuario);

    return { qr: nuevoQr };
  }

  /**
   * Lista usuarios con paginación para dashboard administrativo.
   * MOBILE_API: Usado para la gestión de usuarios desde la app administrativa.
   * PAGINATION: Offset y límite para evitar sobrecarga en la vista de lista.
   */
  async findAll(page: number = 1, limit: number = 10) {
    // PAGINATION: Búsqueda controlada de usuarios institucionales
    const [data, total] = await this.usuarioRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { nombreCompleto: 'ASC' },
      relations: ['tipoUsuario', 'formacion'],
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  /**
   * Búsqueda institucional por código QR.
   */
  async buscarPorQR(qr: string) {
    const entrada = String(qr ?? '') // RNF2/RF8: normalizamos la entrada para evitar falsos negativos por espacios o tipos inesperados.
      .trim(); // RF8: lectores físicos suelen añadir espacios/linebreaks; los removemos.

    const esHex32 = /^[0-9a-fA-F]{32}$/.test(entrada); // RF8 (Code128): formato alfanumérico puro (UUID sin guiones).
    const normalizado = esHex32
      ? `${entrada.slice(0, 8)}-${entrada.slice(8, 12)}-${entrada.slice(12, 16)}-${entrada.slice(16, 20)}-${entrada.slice(20)}` // RF8: reconstruye el UUID estándar esperado por la BD (compatibilidad con registros existentes).
      : entrada; // RF8: si llega UUID con guiones (QR futuro), se usa tal cual.

    const usuario = await this.usuarioRepository.findOne({
      where: { qr: normalizado }, // RF8: permite validar tanto el token para Code128 (sin guiones) como el QR (con guiones) sin exponer PII.
      relations: ['tipoUsuario', 'formacion'],
    });

    if (!usuario) throw new NotFoundException('Código de acceso inválido'); // RF31/RF33: mensaje neutral (barras/QR) para el flujo de portería.

    const vehiculos = await this.vehiculosService.findByUsuario(usuario.documento);
    const { contra: _, ...perfil } = usuario;
    return { usuario: perfil, vehiculos };
  }

  /**
   * Actualización de perfil y limpieza de fotos en Cloudinary.
   */
  async actualizarPerfil(documento: string, dto: ActualizarPerfilDto): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const fotoAnterior = usuario.fotoPersona;

    if (dto.fotoPersona) usuario.fotoPersona = dto.fotoPersona;
    if (dto.numTelf) usuario.numTelf = dto.numTelf;
    if (dto.contactoEmerg) usuario.contactoEmerg = dto.contactoEmerg;

    const guardado = await this.usuarioRepository.save(usuario);

    if (dto.fotoPersona && fotoAnterior && fotoAnterior !== dto.fotoPersona) {
      await this.cloudinaryService.borrarPorUrl(fotoAnterior);
    }

    const { contra: _, ...sinContrasena } = guardado;
    return sinContrasena;
  }

  /**
   * Gestión de cambio de correo electrónico con verificación OTP.
   */
  async solicitarCambioCorreo(documento: string, nuevoCorreo: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (usuario.correo === nuevoCorreo) throw new BadRequestException('El nuevo correo es idéntico al actual');

    const yaExiste = await this.usuarioRepository.findOne({ where: { correo: nuevoCorreo } });
    if (yaExiste) throw new ConflictException('El correo ya se encuentra registrado por otro usuario');

    const { codigo } = await this.authService.crearOtp(documento);

    await this.mailService.enviarCodigoOtp(nuevoCorreo, codigo, usuario.nombreCompleto);

    return { mensaje: `Código enviado a ${nuevoCorreo}` };
  }

  /**
   * Confirmación final de cambio de correo electrónico.
   */
  async confirmarCambioCorreo(documento: string, nuevoCorreo: string, codigo: string): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.authService.validarYConsumirOtp(documento, codigo);

    usuario.correo = nuevoCorreo;
    const guardado = await this.usuarioRepository.save(usuario);

    const { contra: _, ...sinContrasena } = guardado;
    return sinContrasena;
  }

  async crearOperativoByAdmin(dto: CreateOperativoDto): Promise<Omit<Usuario, 'contra'>> {
    const payload: CreateUsuarioAdminDto = {
      documento: dto.documento,
      fotoPersona: '',
      nombreCompleto: dto.nombreCompleto,
      numTelf: dto.numTelf,
      contactoEmerg: dto.numTelf,
      correo: dto.correo,
      contra: dto.contra,
      idTipoUsr: TipoUsuarioEnum.OPERATIVO,
    };

    return await this.create(payload);
  }

  async listarOperativosAdmin(): Promise<Array<Omit<Usuario, 'contra'>>> {
    const operativos = await this.usuarioRepository.find({
      where: { idTipoUsr: TipoUsuarioEnum.OPERATIVO },
      withDeleted: true,
      order: { nombreCompleto: 'ASC' },
    });

    return operativos.map(({ contra: _contra, ...rest }) => rest);
  }

  async actualizarOperativoAdmin(documento: string, dto: UpdateOperativoDto): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.findOneByDocumentoIncludingDeleted(documento);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.idTipoUsr !== TipoUsuarioEnum.OPERATIVO) throw new BadRequestException('El usuario no es Operativo');

    const correoNuevo = dto.correo?.trim();
    if (correoNuevo && correoNuevo !== usuario.correo) {
      const yaExiste = await this.usuarioRepository.findOne({ where: { correo: correoNuevo }, withDeleted: true });
      if (yaExiste && yaExiste.documento !== usuario.documento) {
        throw new ConflictException('El correo ya se encuentra registrado por otro usuario');
      }
      usuario.correo = correoNuevo;
    }

    if (dto.nombreCompleto !== undefined) usuario.nombreCompleto = dto.nombreCompleto;
    if (dto.numTelf !== undefined) usuario.numTelf = dto.numTelf;
    if (dto.contactoEmerg !== undefined) usuario.contactoEmerg = dto.contactoEmerg;

    const guardado = await this.usuarioRepository.save(usuario);

    await this.auditoriaService.create({
      accion: 'ACTUALIZAR_OPERATIVO',
      entidad: 'USUARIO',
      idEntidad: parseInt(guardado.documento),
      idUsuario: guardado.documento,
      datosNuevos: {
        correo: guardado.correo,
        nombreCompleto: guardado.nombreCompleto,
        numTelf: guardado.numTelf,
        contactoEmerg: guardado.contactoEmerg,
      },
    });

    const { contra: _contra, ...sinContrasena } = guardado;
    return sinContrasena;
  }

  async actualizarEstadoOperativoAdmin(documento: string, activo: boolean): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.findOneByDocumentoIncludingDeleted(documento);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.idTipoUsr !== TipoUsuarioEnum.OPERATIVO) throw new BadRequestException('El usuario no es Operativo');

    if (activo) {
      await this.usuarioRepository.restore({ documento });
    } else {
      await this.usuarioRepository.softDelete({ documento });
    }

    const actualizado = await this.findOneByDocumentoIncludingDeleted(documento);
    if (!actualizado) throw new NotFoundException('Usuario no encontrado');

    await this.auditoriaService.create({
      accion: 'CAMBIAR_ESTADO_OPERATIVO',
      entidad: 'USUARIO',
      idEntidad: parseInt(actualizado.documento),
      idUsuario: actualizado.documento,
      datosNuevos: { activo: Boolean(activo) },
    });

    const { contra: _contra, ...sinContrasena } = actualizado;
    return sinContrasena;
  }

  async restablecerContrasenaOperativoAdmin(documento: string, contraNueva: string): Promise<{ mensaje: string }> {
    const usuario = await this.findOneByDocumentoIncludingDeleted(documento);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.idTipoUsr !== TipoUsuarioEnum.OPERATIVO) throw new BadRequestException('El usuario no es Operativo');

    const esIgual = await bcrypt.compare(contraNueva, usuario.contra);
    if (esIgual) {
      throw new BadRequestException('La nueva contraseña no puede ser igual a la anterior');
    }

    const salt = await bcrypt.genSalt(10);
    usuario.contra = await bcrypt.hash(contraNueva, salt);
    await this.usuarioRepository.save(usuario);

    await this.auditoriaService.create({
      accion: 'RESET_PASSWORD_OPERATIVO',
      entidad: 'USUARIO',
      idEntidad: parseInt(usuario.documento),
      idUsuario: usuario.documento,
      datosNuevos: { reset: true },
    });

    return { mensaje: 'Contraseña restablecida exitosamente' };
  }

  async listarUsuariosAdmin(query: AdminListUsuariosQueryDto) {
    const q = query.q?.trim();
    const nombre = query.nombre?.trim();
    const documento = query.documento?.trim();
    const estado = query.estado ?? 'TODOS';

    const qb = this.usuarioRepository
      .createQueryBuilder('u')
      .withDeleted()
      .leftJoinAndSelect('u.registrosVehiculos', 'rv')
      .leftJoinAndSelect('rv.vehiculo', 'vehiculo')
      .where('u.id_tipo_usr != :adminRol', { adminRol: TipoUsuarioEnum.ADMIN });

    if (estado === 'ACTIVO') {
      qb.andWhere('u.deleted_at IS NULL');
    } else if (estado === 'INACTIVO') {
      qb.andWhere('u.deleted_at IS NOT NULL');
    }

    if (documento) {
      qb.andWhere('u.documento ILIKE :documento', { documento: `%${documento}%` });
    }

    if (nombre) {
      qb.andWhere('u.nombre_completo ILIKE :nombre', { nombre: `%${nombre}%` });
    }

    if (q) {
      qb.andWhere('(u.nombre_completo ILIKE :q OR u.documento ILIKE :q OR u.correo ILIKE :q)', { q: `%${q}%` });
    }

    qb.orderBy('u.nombre_completo', 'ASC');

    const usuarios = await qb.getMany();

    return usuarios.map((u) => {
      const { contra: _contra, registrosVehiculos: _registros, ...rest } = u;
      return {
        ...rest,
        estadoCuenta: u.deletedAt ? 'INACTIVO' : 'ACTIVO',
        vehiculos: (_registros || [])
          .map((r) => r.vehiculo)
          .filter(Boolean),
      };
    });
  }
}
