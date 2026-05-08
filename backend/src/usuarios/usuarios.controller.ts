import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { LoginDto } from './dto/login.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.usuarioService.login(loginDto);
  }

  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  @Get(':documento')
  findOne(@Param('documento') documento: string) {
    return this.usuarioService.findOne(documento);
  }
}
