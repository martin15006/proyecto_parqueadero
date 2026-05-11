import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    // Verificar si el documento ya existe
    const usuarioExistenteDoc = await this.usuarioRepository.findOne({
      where: { documento: createUsuarioDto.documento },
    });

    if (usuarioExistenteDoc) {
      throw new ConflictException('Ese documento ya está registrado');
    }

    // Verificar si el correo ya existe
    const usuarioExistenteCorreo = await this.usuarioRepository.findOne({
      where: { correo: createUsuarioDto.correo },
    });

    if (usuarioExistenteCorreo) {
      throw new ConflictException('Ese correo ya está registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUsuarioDto.contra, salt);
    
    // Si el QR o la formación vienen vacíos, los ponemos como null
    const qrValue = createUsuarioDto.QR && createUsuarioDto.QR.trim() !== '' 
      ? createUsuarioDto.QR 
      : null;
    
    const formacionValue = createUsuarioDto.idFormacion && createUsuarioDto.idFormacion.trim() !== ''
      ? createUsuarioDto.idFormacion
      : null;

    const nuevoUsuario = this.usuarioRepository.create({
      ...createUsuarioDto,
      contra: hashedPassword,
      idFormacion: formacionValue,
      QR: qrValue,
    });
    
    return await this.usuarioRepository.save(nuevoUsuario);
  }

  async login(loginDto: LoginDto): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo: loginDto.correo },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.contra, usuario.contra);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return usuario;
  }

  async findAll(): Promise<Usuario[]> {
    return await this.usuarioRepository.find();
  }

  async findOne(documento: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({ where: { documento } });
  }
}
