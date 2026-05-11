import { Injectable, UnauthorizedException } from '@nestjs/common';
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
      QR: qrValue,
      idFormacion: formacionValue,
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
