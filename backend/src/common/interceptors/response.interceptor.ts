import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;
  timestamp: string;
}

/**
 * Interceptor Global para Estandarización de Respuestas.
 * MOBILE_API: Garantiza que el cliente móvil reciba siempre un objeto con success, data y message.
 * SERIALIZATION: Filtra y estructura la salida final tras la ejecución de los controladores.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || HttpStatus.OK;

    return next.handle().pipe(
      map((payload) => {
        // MOBILE_API: Estructura consistente para facilitar el parseo en React Native/Flutter
        return {
          success: statusCode >= 200 && statusCode < 300,
          statusCode,
          message: payload?.message || 'Operación realizada con éxito',
          // SERIALIZATION: Si el servicio ya devolvió una estructura paginada, la respetamos
          data: payload?.data !== undefined ? payload.data : payload,
          // SERIALIZATION: Metadatos de paginación extraídos para control de scroll infinito en móviles
          meta: payload?.meta || (payload?.total !== undefined ? { total: payload.total, page: payload.page, lastPage: payload.lastPage } : undefined),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
