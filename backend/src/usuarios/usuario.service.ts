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
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';

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

  async create(createUsuarioDto: CreateUsuarioDto | CreateUsuarioAdminDto): Promise<{ mensaje: string; correo: string }> {
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
        correoVerificado: false,
      });

      const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);

      await this.auditoriaService.create({
        accion: 'CREAR_USUARIO',
        entidad: 'USUARIO',
        idEntidad: parseInt(usuarioGuardado.documento),
        idUsuario: usuarioGuardado.documento,
        datosNuevos: { correo: usuarioGuardado.correo, nombre: usuarioGuardado.nombreCompleto },
      });

      await this.authService.generarYEnviarOtpPublico(usuarioGuardado);

      return {
        mensaje: 'Registro exitoso. Te enviamos un código de verificación a tu correo para activar tu cuenta.',
        correo: correoNormalizado,
      };
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === '23503') {
        throw new BadRequestException('La ficha de formación proporcionada no es válida.');
      }
      throw error;
    }
  }

  async createAdmin(createUsuarioDto: CreateUsuarioAdminDto): Promise<Omit<Usuario, 'contra'>> {
    const { documento, correo, contra } = createUsuarioDto;
    const correoNormalizado = String(correo ?? '').trim().toLowerCase();

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
      const nuevoUsuario = this.usuarioRepository.create({
        ...createUsuarioDto,
        contra: hashedPassword,
        qr: qrValue,
        correo: correoNormalizado,
        correoVerificado: true,
      });

      const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);

      await this.auditoriaService.create({
        accion: 'CREAR_USUARIO_ADMIN',
        entidad: 'USUARIO',
        idEntidad: parseInt(usuarioGuardado.documento),
        idUsuario: usuarioGuardado.documento,
        datosNuevos: { correo: usuarioGuardado.correo, nombre: usuarioGuardado.nombreCompleto },
      });

      const { contra: _contra, ...usuarioSinContrasena } = usuarioGuardado;
      return usuarioSinContrasena;
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === '23503') {
        throw new BadRequestException('La ficha de formación proporcionada no es válida.');
      }
      throw error;
    }
  }

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

  async findOneByDocumento(documento: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({ where: { documento } });
  }

  private async findOneByDocumentoIncludingDeleted(documento: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({ where: { documento }, withDeleted: true });
  }

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

  async actualizarTokenPush(documento: string, token: string) {
    const usuario = await this.findOneByDocumento(documento);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    usuario.pushToken = token;
    await this.usuarioRepository.save(usuario);
    return { ok: true, mensaje: 'Token push actualizado' };
  }

  async regenerarQr(documento: string): Promise<{ qr: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const nuevoQr = randomUUID();
    usuario.qr = nuevoQr;
    await this.usuarioRepository.save(usuario);

    return { qr: nuevoQr };
  }

  async findAll(page: number = 1, limit: number = 10) {
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

  async buscarIdentidadUnificada(token: string) {
    const entrada = String(token ?? '').trim();
    if (!entrada) throw new BadRequestException('El código es obligatorio');

    let placaDetectada: string | null = null;

    const esHex32 = /^[0-9a-fA-F]{32}$/.test(entrada);
    const normalizado = (esHex32
      ? `${entrada.slice(0, 8)}-${entrada.slice(8, 12)}-${entrada.slice(12, 16)}-${entrada.slice(16, 20)}-${entrada.slice(20)}`
      : entrada
    ).toLowerCase();

    let usuario = await this.usuarioRepository.findOne({
      where: { qr: normalizado },
      relations: ['tipoUsuario', 'formacion'],
    });

    if (!usuario && /^[0-9]{6,12}$/.test(entrada)) {
      usuario = await this.usuarioRepository.findOne({
        where: { documento: entrada },
        relations: ['tipoUsuario', 'formacion'],
      });
    }

    if (!usuario) {
      const placaNormal = entrada.replace(/[- ]/g, '').toUpperCase();
      const registro = await this.usuarioRepository.manager.findOne(RegistroVehiculo, {
        where: { idVehiculo: placaNormal },
        relations: ['usuario', 'usuario.tipoUsuario', 'usuario.formacion'],
      });
      if (registro?.usuario) {
        usuario = registro.usuario;
        placaDetectada = placaNormal;
      }
    }

    if (!usuario) {
      const existeInactivo = await this.usuarioRepository.findOne({
        where: { qr: normalizado },
        withDeleted: true,
        select: ['documento'],
      });

      if (existeInactivo) {
        throw new BadRequestException({
          message: 'El acceso de este usuario ha sido desactivado.',
          errorCode: 'USUARIO_DESACTIVADO',
        });
      }

      throw new NotFoundException({
        message: 'Identidad no reconocida en el sistema',
        errorCode: 'IDENTIDAD_NO_ENCONTRADA',
      });
    }

    const vehiculos = await this.vehiculosService.findByUsuario(usuario.documento);
    const { contra: _, ...perfil } = usuario;
    return { usuario: perfil, vehiculos, placaDetectada };
  }

  async buscarPorQR(qr: string) {
    const entrada = String(qr ?? '').trim();

    const esHex32 = /^[0-9a-fA-F]{32}$/.test(entrada);
    const normalizado = (esHex32
      ? `${entrada.slice(0, 8)}-${entrada.slice(8, 12)}-${entrada.slice(12, 16)}-${entrada.slice(16, 20)}-${entrada.slice(20)}`
      : entrada).toLowerCase();

    const usuario = await this.usuarioRepository.findOne({
      where: { qr: normalizado },
      relations: ['tipoUsuario', 'formacion'],
    });

    if (!usuario) throw new NotFoundException('Código de acceso inválido');

    const vehiculos = await this.vehiculosService.findByUsuario(usuario.documento);
    const { contra: _, ...perfil } = usuario;
    return { usuario: perfil, vehiculos };
  }

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

    return await this.createAdmin(payload);
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
    const rol = query.rol ?? 'TODOS';
    const estado = query.estado ?? 'ACTIVO';

    const qb = this.usuarioRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.registrosVehiculos', 'rv')
      .leftJoinAndSelect('rv.vehiculo', 'vehiculo')
      .leftJoinAndSelect('vehiculo.tipoVehiculo', 'tipoVehiculo');

    if (estado === 'INACTIVO') {
      qb.withDeleted().andWhere('u.deleted_at IS NOT NULL');
    } else if (estado === 'TODOS') {
      qb.withDeleted();
    }

    if (rol === 'APRENDIZ') {
      qb.andWhere('u.id_tipo_usr = :rolId', { rolId: TipoUsuarioEnum.APRENDIZ });
    } else if (rol === 'ADMIN') {
      qb.andWhere('u.id_tipo_usr = :rolId', { rolId: TipoUsuarioEnum.ADMIN });
    } else if (rol === 'OPERATIVO') {
      qb.andWhere('u.id_tipo_usr = :rolId', { rolId: TipoUsuarioEnum.OPERATIVO });
    } else if (rol === 'PERSONAL_SENA') {
      qb.andWhere('u.id_tipo_usr = :rolId', { rolId: TipoUsuarioEnum.PERSONAL_SENA });
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

    const rolNombre = (id: number) => {
      if (id === TipoUsuarioEnum.APRENDIZ) return 'APRENDIZ';
      if (id === TipoUsuarioEnum.ADMIN) return 'ADMIN';
      if (id === TipoUsuarioEnum.OPERATIVO) return 'OPERATIVO';
      if (id === TipoUsuarioEnum.PERSONAL_SENA) return 'PERSONAL_SENA';
      return 'DESCONOCIDO';
    };

    return usuarios.map((u) => {
      const { contra: _contra, registrosVehiculos: _registros, ...rest } = u;
      return {
        ...rest,
        rol: rolNombre(u.idTipoUsr),
        activo: !u.deletedAt,
        vehiculos: (_registros || [])
          .map((r) => r.vehiculo)
          .filter(Boolean),
      };
    });
  }

  async crearUsuarioPorAdmin(dto: CreateUsuarioAdminDto): Promise<{ mensaje: string; usuario?: Omit<Usuario, 'contra'> }> {
    if (dto.idTipoUsr === TipoUsuarioEnum.APRENDIZ) {
      const respuesta = await this.create(dto);
      return { mensaje: respuesta.mensaje };
    }
    const usuario = await this.createAdmin(dto);
    return { mensaje: 'Usuario creado exitosamente', usuario };
  }

  async actualizarUsuarioPorAdmin(
    documento: string,
    dto: Partial<Pick<Usuario, 'nombreCompleto' | 'correo' | 'numTelf' | 'contactoEmerg' | 'fotoPersona' | 'idTipoUsr' | 'idFormacion'>>,
  ): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (dto.correo && dto.correo !== usuario.correo) {
      const correoNormalizado = String(dto.correo).trim().toLowerCase();
      const yaExiste = await this.usuarioRepository.findOne({ where: { correo: correoNormalizado } });
      if (yaExiste && yaExiste.documento !== documento) {
        throw new ConflictException('El correo ya está registrado por otro usuario');
      }
      usuario.correo = correoNormalizado;
    }
    if (dto.nombreCompleto !== undefined) usuario.nombreCompleto = dto.nombreCompleto;
    if (dto.numTelf !== undefined) usuario.numTelf = dto.numTelf;
    if (dto.contactoEmerg !== undefined) usuario.contactoEmerg = dto.contactoEmerg;
    if (dto.fotoPersona !== undefined) usuario.fotoPersona = dto.fotoPersona;
    if (dto.idTipoUsr !== undefined) usuario.idTipoUsr = dto.idTipoUsr;
    if (dto.idFormacion !== undefined) usuario.idFormacion = dto.idFormacion;

    const guardado = await this.usuarioRepository.save(usuario);
    const { contra: _, ...rest } = guardado;
    return rest;
  }

  async eliminarUsuarioPorAdmin(documento: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.usuarioRepository.softDelete({ documento });

    await this.auditoriaService.create({
      accion: 'ELIMINAR_USUARIO',
      entidad: 'USUARIO',
      idEntidad: parseInt(usuario.documento),
      idUsuario: usuario.documento,
      datosNuevos: { eliminadoLogico: true },
    });

    return { mensaje: 'Usuario eliminado exitosamente' };
  }

  async reactivarUsuarioPorAdmin(documento: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository.findOne({
      where: { documento },
      withDeleted: true,
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (!usuario.deletedAt) {
      throw new BadRequestException('El usuario ya está activo');
    }

    await this.usuarioRepository.restore({ documento });

    await this.auditoriaService.create({
      accion: 'REACTIVAR_USUARIO',
      entidad: 'USUARIO',
      idEntidad: parseInt(usuario.documento),
      idUsuario: usuario.documento,
      datosNuevos: { reactivado: true },
    });

    return { mensaje: 'Usuario reactivado exitosamente' };
  }
}
