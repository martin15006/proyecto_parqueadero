import { Module } from '@nestjs/common';
import { RetencionService } from './retencion.service';
import { RetencionController } from './retencion.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuditoriaModule,
    AuthModule, // para que JwtAuthGuard inyecte AuthService en el controlador
  ],
  controllers: [RetencionController],
  providers: [RetencionService],
})
export class RetencionModule {}
