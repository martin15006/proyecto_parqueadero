import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SesionActiva } from './entities/sesion-activa.entity';
import { TokenBloqueado } from './entities/token-bloqueado.entity';
import { CodigoOtp } from '../usuarios/entities/codigo-otp.entity';

@Injectable()
export class AuthMantenimientoService {
  private readonly logger = new Logger(AuthMantenimientoService.name);

  constructor(
    @InjectRepository(SesionActiva)
    private readonly sesionRepository: Repository<SesionActiva>,
    @InjectRepository(TokenBloqueado)
    private readonly blacklistRepository: Repository<TokenBloqueado>,
    @InjectRepository(CodigoOtp)
    private readonly otpRepository: Repository<CodigoOtp>,
  ) {}

  async ejecutarLimpieza() {
    try {
      const ahora = new Date();
      const results = await Promise.all([
        this.sesionRepository.delete({ expiraEn: LessThan(ahora) }),
        this.blacklistRepository.delete({ expiraEn: LessThan(ahora) }),
        this.otpRepository.delete({ expiraEn: LessThan(ahora) }),
      ]);

      const totalEliminados = results.reduce((acc, curr) => acc + (curr.affected || 0), 0);

      if (totalEliminados > 0) {
        this.logger.log(`[Mantenimiento Auth] Registros expirados eliminados: ${totalEliminados}`);
      }
    } catch (error) {
      this.logger.error('Error durante la limpieza de tablas de autenticación', error.stack);
    }
  }
}
