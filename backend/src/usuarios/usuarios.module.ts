import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioService } from './usuario.service';
import { UsuariosController } from './usuarios.controller';
import { Usuario } from './entities/usuario.entity';
import { MailModule } from '../mail/mail.module';
import { VehiculosModule } from '../vehiculos/vehiculos.module';
import { AuthModule } from '../auth/auth.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    MailModule,
    forwardRef(() => VehiculosModule),
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuarioService],
  exports: [UsuarioService],
})
export class UsuariosModule {}
