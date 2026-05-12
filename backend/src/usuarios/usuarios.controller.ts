import { Controller, Get, Post, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Usuario } from './entities/usuario.entity';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuarioService.create(createUsuarioDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cambiar-contrasena')
  cambiarContrasena(
    @CurrentUser() usuario: Omit<Usuario, 'contra'>,
    @Body() dto: CambiarContrasenaDto,
  ) {
    return this.usuarioService.cambiarContrasena(
      usuario.documento,
      dto.contraActual,
      dto.contraNueva,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':documento')
  findOne(@Param('documento') documento: string) {
    return this.usuarioService.findOne(documento);
  }
}