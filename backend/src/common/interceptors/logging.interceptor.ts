import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('LoggingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const now = Date.now();
    const userId = user?.sub || 'anonymous';
    const debugHttp = String(process.env.DEBUG_HTTP ?? '').toLowerCase();
    const shouldDebug = debugHttp === '1' || debugHttp === 'true' || debugHttp === 'yes';

    let bodyKeys: string[] | undefined;
    if (shouldDebug && body && typeof body === 'object') {
      bodyKeys = Object.keys(body).filter((k) => {
        const key = k.toLowerCase();
        return ![
          'contra',
          'password',
          'token',
          'accesstoken',
          'refresh_token',
          'refreshtoken',
          'authorization',
        ].includes(key);
      });
    }

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        const status = response.statusCode;
        if (shouldDebug) {
          const origin = request.headers?.origin;
          const userAgent = request.headers?.['user-agent'];
          const hasAuth = Boolean(request.headers?.authorization);
          this.logger.log(
            `${method} ${url} - User: ${userId} - Status: ${status} - ${delay}ms - Origin: ${origin || '-'} - Auth: ${hasAuth ? 'yes' : 'no'} - BodyKeys: ${bodyKeys ? bodyKeys.join(',') : '-' } - UA: ${userAgent || '-'}`,
          );
        } else {
          this.logger.log(
            `${method} ${url} - User: ${userId} - Status: ${status} - ${delay}ms`,
          );
        }
      }),
    );
  }
}
