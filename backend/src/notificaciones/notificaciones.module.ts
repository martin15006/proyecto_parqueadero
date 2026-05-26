import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacionUsuario } from './entities/notificacion-usuario.entity';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuthModule } from '../auth/auth.module';

/**
 * RF25: Módulo aislado para persistir y exponer el historial de notificaciones.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificacionUsuario, Usuario]), // RF25: repositorios necesarios para insertar y consultar por usuario.
    AuthModule, // RNF2: JwtAuthGuard depende de AuthService (blacklist). Sin esto, puede inyectarse undefined y responder 401.
  ],
  controllers: [NotificacionesController], // RF25: endpoint de bandeja.
  providers: [NotificacionesService], // RF25: lógica de negocio.
  exports: [NotificacionesService, TypeOrmModule], // RF25: permite que otros módulos registren notificaciones.
})
export class NotificacionesModule {}
