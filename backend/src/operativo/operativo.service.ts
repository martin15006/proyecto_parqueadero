import { Injectable } from '@nestjs/common';

import { LoginOperativoDto } from './dto/login-operativo.dto';

import { AuthService } from '../auth/auth.service';
import { UsuarioService } from '../usuarios/usuario.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EventosGateway } from '../gateway/eventos.gateway';

@Injectable()
export class OperativoService {
  constructor(
    private readonly authService: AuthService,
    private readonly usuarioService: UsuarioService,
    private readonly auditoriaService: AuditoriaService,
    private readonly eventosGateway: EventosGateway,
  ) {}

  async login(dto: LoginOperativoDto) {
    // Implementación temporal para validar la estructura del módulo Operativo.
    // Más adelante se conectará con la autenticación real usando JWT.
    return {
      ok: true,
      mensaje: 'Login operativo exitoso',
      token: 'TOKEN_DE_PRUEBA',
      usuario: {
        documento: dto.documento,
        rol: 'OPERATIVO',
      },
    };
  }

  async escanearQr(qr: string) {
    return {
      valido: true,
      qr,
      mensaje: 'QR escaneado correctamente',
    };
  }

  async registrarEntrada(placa: string, operativo: any) {
    await this.auditoriaService.registrar({
      accion: 'REGISTRAR_ENTRADA',
      entidad: 'VEHICULO',
      idUsuario: operativo?.idUsuario ?? operativo?.idusuario ?? 1,
      datosNuevos: {
        placa,
      },
      ip: '127.0.0.1',
      userAgent: 'Operativo',
    });

    const gateway: any = this.eventosGateway;
    if (typeof gateway.emitirVehiculoIngresado === 'function') {
      gateway.emitirVehiculoIngresado({
        placa,
        fecha: new Date(),
      });
    }

    return {
      ok: true,
      mensaje: 'Entrada registrada correctamente',
      placa,
    };
  }

  async registrarSalida(placa: string, operativo: any) {
    await this.auditoriaService.registrar({
      accion: 'REGISTRAR_SALIDA',
      entidad: 'VEHICULO',
      idUsuario: operativo?.idUsuario ?? operativo?.idusuario ?? 1,
      datosNuevos: {
        placa,
      },
      ip: '127.0.0.1',
      userAgent: 'Operativo',
    });

    const gateway: any = this.eventosGateway;
    if (typeof gateway.emitirVehiculoRetirado === 'function') {
      gateway.emitirVehiculoRetirado({
        placa,
        fecha: new Date(),
      });
    }

    return {
      ok: true,
      mensaje: 'Salida registrada correctamente',
      placa,
    };
  }
}