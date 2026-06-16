import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioService } from './usuario.service';
import { UsuariosController } from './usuarios.controller';
import { UsuariosAdminController } from './usuarios-admin.controller';
import { AdminUsuariosController } from './admin-usuarios.controller';
import { Usuario } from './entities/usuario.entity';
import { TipoUsuario } from './entities/tipo-usuario.entity';
import { AdminSeedService } from './admin-seed.service';
import { CatalogosSeedService } from './catalogos-seed.service';
import { TipoVehiculo } from '../vehiculos/entities/tipo-vehiculo.entity';
import { MailModule } from '../mail/mail.module';
import { VehiculosModule } from '../vehiculos/vehiculos.module';
import { AuthModule } from '../auth/auth.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, TipoUsuario, TipoVehiculo]),
    MailModule,
    forwardRef(() => VehiculosModule),
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [UsuariosController, UsuariosAdminController, AdminUsuariosController],
  providers: [UsuarioService, CatalogosSeedService, AdminSeedService],
  exports: [UsuarioService],
})
export class UsuariosModule {}
