import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';

// idTipoUsr fijo para usuarios registrados desde la app móvil.
// Según tipoUsr.sql: 1 = 'Usuario'
const ID_TIPO_USUARIO_APP = 1;

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Omit<Usuario, 'contra'>> {
    const usuarioExistenteDoc = await this.usuarioRepository.findOne({
      where: { documento: createUsuarioDto.documento },
    });
    if (usuarioExistenteDoc) {
      throw new ConflictException('Ese documento ya está registrado');
    }

    const usuarioExistenteCorreo = await this.usuarioRepository.findOne({
      where: { correo: createUsuarioDto.correo },
    });
    if (usuarioExistenteCorreo) {
      throw new ConflictException('Ese correo ya está registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUsuarioDto.contra, salt);

    const qrValue = randomUUID();

    const nuevoUsuario = this.usuarioRepository.create({
      ...createUsuarioDto,
      contra: hashedPassword,
      idTipoUsr: ID_TIPO_USUARIO_APP,
      QR: qrValue,
    });

    const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);

    const { contra, ...usuarioSinContrasena } = usuarioGuardado;
    return usuarioSinContrasena;
  }

  async findAll(): Promise<Omit<Usuario, 'contra'>[]> {
    const usuarios = await this.usuarioRepository.find();
    return usuarios.map(({ contra, ...rest }) => rest);
  }

  async findOne(documento: string): Promise<Omit<Usuario, 'contra'>> {
    const usuario = await this.usuarioRepository.findOne({ where: { documento } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const { contra, ...usuarioSinContrasena } = usuario;
    return usuarioSinContrasena;
  }
}