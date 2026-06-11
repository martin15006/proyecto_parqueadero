import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('LoggingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    const { method, url } = request;
    const startedAt = Date.now();

    // RNF2 (Privacidad): correlationId anónimo para rastrear solicitudes sin registrar PII (prohibido: documento/cédula).
    const headerCorrelation = request.headers?.['x-correlation-id'];
    const correlationId =
      (typeof headerCorrelation === 'string' && headerCorrelation.trim().length > 0
        ? headerCorrelation.trim()
        : crypto.randomUUID());

    response.setHeader('x-correlation-id', correlationId);

    const debugHttp = String(process.env.DEBUG_HTTP ?? '').toLowerCase();
    const shouldDebug = debugHttp === '1' || debugHttp === 'true' || debugHttp === 'yes';

    return next.handle().pipe(
      tap(() => {
        const delayMs = Date.now() - startedAt;
        const status = response.statusCode;

        // RNF2 (Privacidad): prohibido loguear userId/documento, contraseñas, tokens, QR o payload.
        // Por diseño, este interceptor no registra body de entrada ni respuesta.
        if (shouldDebug) {
          const hasAuthHeader = Boolean(request.headers?.authorization);
          this.logger.log(
            `${method} ${url} - Status: ${status} - ${delayMs}ms - CorrelationId: ${correlationId} - AuthHeader: ${hasAuthHeader ? 'present' : 'absent'}`,
          );
          return;
        }

        this.logger.log(
          `${method} ${url} - Status: ${status} - ${delayMs}ms - CorrelationId: ${correlationId}`,
        );
      }),
    );
  }
}
