import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacionUsuario } from './entities/notificacion-usuario.entity';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificacionUsuario, Usuario]),
    // JwtAuthGuard depende de AuthService (blacklist). Sin esto, puede inyectarse undefined y responder 401.
    AuthModule,
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService, TypeOrmModule],
})
export class NotificacionesModule {}
