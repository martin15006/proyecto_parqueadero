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
  meta?: unknown;
}

/**
 * Interceptor global para estandarización de respuestas.
 * @template T Tipo de dato retornado por el endpoint.
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
        return {
          success: statusCode >= 200 && statusCode < 300,
          statusCode,
          message: payload?.message || 'Operación realizada con éxito',
          data: payload?.data !== undefined ? payload.data : payload,
          meta:
            payload?.meta ||
            (payload?.total !== undefined
              ? { total: payload.total, page: payload.page, lastPage: payload.lastPage }
              : undefined),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
