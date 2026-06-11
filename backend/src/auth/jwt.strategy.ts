import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';

export interface JwtPayload {
  sub: string;        // documento del usuario
  correo: string;
  idTipoUsr: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET es obligatorio');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Esta función se ejecuta automáticamente cuando un endpoint protegido
   * recibe una petición con un JWT. Si retorna algo, ese valor queda
   * disponible como request.user en el controlador.
   */
  async validate(payload: JwtPayload) {
    const usuario = await this.usuarioRepository.findOne({
      where: { documento: payload.sub },
    });

    if (!usuario) {
      throw new UnauthorizedException('Token inválido: usuario no encontrado');
    }

    const { contra, ...usuarioSinContrasena } = usuario;
    return {
      ...usuarioSinContrasena,
      sub: usuario.documento,
      idTipoUsr: usuario.idTipoUsr,
    };
  }
}
