import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface IExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * Filtro global de excepciones.
 * REFACTOR: Centraliza el manejo de errores, estandariza respuestas y mejora el logging.
 * SECURITY: Oculta detalles internos del servidor en producción.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as IExceptionResponse)
        : { message: (exception as Error).message || 'Error interno del servidor' };

    const message = this.extractMessage(exceptionResponse);
    const error = typeof exceptionResponse === 'object' ? exceptionResponse.error : 'Internal Server Error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    // PERFORMANCE: Logging inteligente basado en severidad
    this.logError(request, status, exception, message);

    response.status(status).json(errorResponse);
  }

  /**
   * Extrae el mensaje de error de forma segura y tipada.
   */
  private extractMessage(response: string | IExceptionResponse): string | string[] {
    if (typeof response === 'string') return response;
    return response.message || 'Error desconocido';
  }

  /**
   * Registra el error en la consola con contexto enriquecido.
   */
  private logError(request: Request, status: number, exception: unknown, message: string | string[]) {
    const context = `${request.method} ${request.url}`;
    const messageStr = Array.isArray(message) ? message.join(', ') : message;
    
    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : 'No stack trace';
      this.logger.error(`[CRÍTICO] ${context} - Status: ${status} - Error: ${messageStr}`, stack);
    } else if (status >= 400) {
      this.logger.warn(`[CLIENTE] ${context} - Status: ${status} - Message: ${messageStr}`);
    } else {
      this.logger.log(`[INFO] ${context} - Status: ${status}`);
    }
  }
}
