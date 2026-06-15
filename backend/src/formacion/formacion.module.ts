import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Formacion } from '../usuarios/entities/formacion.entity';
import { FormacionController } from './formacion.controller';
import { FormacionService } from './formacion.service';

import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Formacion]),
    AuditoriaModule,
    AuthModule, // para que JwtAuthGuard inyecte AuthService en el controlador
  ],
  controllers: [FormacionController],
  providers: [FormacionService],
})
export class FormacionModule {}
