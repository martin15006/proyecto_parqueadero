import { Module } from '@nestjs/common';
import { EventosGateway } from './eventos.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [EventosGateway],
  exports: [EventosGateway],
})
export class GatewayModule {}
