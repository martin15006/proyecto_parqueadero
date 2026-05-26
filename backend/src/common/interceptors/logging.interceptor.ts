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
    const httpContext = context.switchToHttp(); // TRACE: obtenemos el contexto HTTP para request/response (necesario para correlationId).
    const request = httpContext.getRequest(); // TRACE: request de Express (fuente de método/URL/headers) sin exponer PII en logs (RNF2).
    const response = httpContext.getResponse(); // TRACE: response de Express (permite devolver correlationId al cliente para depuración segura).
    const { method, url } = request; // RNF2: solo registramos metadatos técnicos (método/URL); no body ni userId (cédula/documento).
    const startedAt = Date.now(); // TRACE: timestamp para calcular latencia sin datos sensibles.

    // RNF2 (Privacidad): correlationId anónimo para rastrear solicitudes sin registrar PII (prohibido: documento/cédula).
    const headerCorrelation = request.headers?.['x-correlation-id']; // TRACE: admitimos correlationId externo (ej. gateway) sin confiar en PII.
    const correlationId =
      (typeof headerCorrelation === 'string' && headerCorrelation.trim().length > 0
        ? headerCorrelation.trim()
        : crypto.randomUUID()); // TRACE: generamos UUID si no viene uno válido.

    // RNF2 (Privacidad): devolvemos el correlationId al cliente para soporte sin exponer identidad del usuario.
    response.setHeader('x-correlation-id', correlationId); // TRACE: header estándar de correlación.

    // Control de verbosidad: DEBUG_HTTP solo habilita metadata técnica, nunca payloads (RNF2).
    const debugHttp = String(process.env.DEBUG_HTTP ?? '').toLowerCase(); // TRACE: flag de diagnóstico controlado por entorno.
    const shouldDebug = debugHttp === '1' || debugHttp === 'true' || debugHttp === 'yes'; // TRACE: evaluación explícita del flag.

    return next.handle().pipe(
      tap(() => {
        const delayMs = Date.now() - startedAt; // TRACE: latencia (ms) para performance sin registrar contenido sensible.
        const status = response.statusCode; // TRACE: código HTTP para auditoría técnica.

        // RNF2 (Privacidad): prohibido loguear userId/documento, contraseñas, tokens, QR o payload.
        // Por diseño, este interceptor no registra body de entrada ni respuesta.
        if (shouldDebug) {
          const hasAuthHeader = Boolean(request.headers?.authorization); // TRACE: booleano (no token) para diagnosticar autenticación.
          this.logger.log(
            `${method} ${url} - Status: ${status} - ${delayMs}ms - CorrelationId: ${correlationId} - AuthHeader: ${hasAuthHeader ? 'present' : 'absent'}`,
          );
          return;
        }

        // Logging mínimo seguro: solo metadatos + correlationId (RNF2).
        this.logger.log(
          `${method} ${url} - Status: ${status} - ${delayMs}ms - CorrelationId: ${correlationId}`,
        );
      }),
    );
  }
}
