import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { AuthMantenimientoService } from './auth-mantenimiento.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CodigoOtp } from '../usuarios/entities/codigo-otp.entity';
import { SesionActiva } from './entities/sesion-activa.entity';
import { TokenBloqueado } from './entities/token-bloqueado.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, CodigoOtp, SesionActiva, TokenBloqueado]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ?? '1h') as SignOptions['expiresIn'],
        },
      }),
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthMantenimientoService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, AuthMantenimientoService, JwtAuthGuard, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
