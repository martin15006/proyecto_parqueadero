import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private disabled = false;

  constructor(private readonly configService: ConfigService) {
    const disableEnv = this.configService.get<string>('DISABLE_EMAILS') ?? this.configService.get<boolean>('DISABLE_EMAILS');
    this.disabled = disableEnv === 'true' || disableEnv === true;

    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPassword = this.configService.get<string>('MAIL_PASSWORD');
    const mailHost = this.configService.get<string>('MAIL_HOST');
    const mailPortRaw = this.configService.get<string>('MAIL_PORT');
    const mailSecureRaw = this.configService.get<string>('MAIL_SECURE');
    const mailTlsRejectUnauthorizedRaw = this.configService.get<string>('MAIL_TLS_REJECT_UNAUTHORIZED');
    const mailTlsCiphers = this.configService.get<string>('MAIL_TLS_CIPHERS');
    const mailRequireTlsRaw = this.configService.get<string>('MAIL_REQUIRE_TLS');

    const mailPort = Number(mailPortRaw ?? '587');
    const mailSecure = (mailSecureRaw ?? '').toLowerCase() === 'true';
    const mailRequireTls = (mailRequireTlsRaw ?? '').toLowerCase() === 'true';
    const rejectUnauthorized =
      (mailTlsRejectUnauthorizedRaw ?? '').toLowerCase() === 'true'
        ? true
        : (process.env.NODE_ENV || '').toLowerCase() === 'production';

    if (this.disabled) {
      return;
    }

    if (!mailUser || !mailPassword) {
      this.disabled = true;
      return;
    }

    const transportOptions: any = mailHost
      ? {
          host: mailHost,
          port: Number.isFinite(mailPort) ? mailPort : 587,
          secure: mailSecure,
          requireTLS: mailRequireTls || (!mailSecure && (Number.isFinite(mailPort) ? mailPort : 587) === 2525),
          auth: {
            user: mailUser,
            pass: mailPassword,
          },
          tls: {
            rejectUnauthorized,
            ...(mailTlsCiphers ? { ciphers: mailTlsCiphers } : {}),
          },
        }
      : {
          service: 'gmail',
          auth: {
            user: mailUser,
            pass: mailPassword,
          },
        };

    this.transporter = nodemailer.createTransport(transportOptions);
  }

  async enviarCodigoOtp(destinatario: string, codigo: string, nombreUsuario: string): Promise<void> {
    const remitenteNombre = this.configService.get<string>('MAIL_FROM_NAME') ?? 'Parqueadero SENA';
    const remitenteCorreo = this.configService.get<string>('MAIL_USER');

    const html = this.plantillaHtml(codigo, nombreUsuario);

    if (this.disabled) {
      throw new InternalServerErrorException('Servicio de correo no configurado.');
    }

    if (!this.transporter || !remitenteCorreo) {
      throw new InternalServerErrorException('Servicio de correo no configurado.');
    }

    try {
      await this.transporter.sendMail({
        from: `"${remitenteNombre}" <${remitenteCorreo}>`,
        to: destinatario,
        subject: 'Tu código de acceso - Sistema de Parqueadero SENA',
        html,
      });
      // RNF2 (Privacidad): no registramos el correo del destinatario (PII) en logs.
      this.logger.log('Correo OTP enviado');
    } catch (error) {
      this.logger.error('Error al enviar correo OTP', error);
      throw new InternalServerErrorException(
        'No se pudo enviar el código de verificación. Intenta de nuevo.',
      );
    }
  }

  async enviarNotificacionSalidaEmergencia(
    destinatario: string,
    nombreUsuario: string,
    placa: string,
    motivo: string,
  ): Promise<void> {
    const remitenteNombre = this.configService.get<string>('MAIL_FROM_NAME') ?? 'Parqueadero SENA';
    const remitenteCorreo = this.configService.get<string>('MAIL_USER');

    const subject = 'Salida de emergencia registrada';
    const html = `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <h2 style="margin:0 0 12px 0;">Hola, ${nombreUsuario}</h2>
        <p style="margin:0 0 8px 0;">Se registró una salida de emergencia para tu vehículo.</p>
        <p style="margin:0 0 6px 0;"><strong>Placa:</strong> ${placa}</p>
        <p style="margin:0 0 6px 0;"><strong>Motivo:</strong> ${motivo}</p>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Si no reconoces esta acción, contacta al administrador del parqueadero.</p>
      </div>
    `;

    if (this.disabled) {
      // RNF2 (Privacidad): sin SMTP omitimos el envío sin imprimir correos/placas (PII).
      return;
    }

    if (!this.transporter || !remitenteCorreo) {
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${remitenteNombre}" <${remitenteCorreo}>`,
        to: destinatario,
        subject,
        html,
      });
      // RNF2 (Privacidad): no registramos correo (PII) en logs.
      this.logger.log('Notificación de salida de emergencia enviada');
    } catch (error) {
      this.logger.error('Error al enviar notificación de salida de emergencia', error);
      throw new InternalServerErrorException('No se pudo enviar la notificación de salida de emergencia.');
    }
  }

  private plantillaHtml(codigo: string, nombreUsuario: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Código de Verificación</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:30px 0;">
        <tr>
          <td align="center">
            <table width="500" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header verde SENA -->
              <tr>
                <td style="background-color:#39A900;padding:30px;text-align:center;">
                  <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:bold;">
                    Parqueadero SENA
                  </h1>
                </td>
              </tr>

              <!-- Cuerpo del correo -->
              <tr>
                <td style="padding:40px 30px;">
                  <h2 style="color:#000000;margin:0 0 20px 0;font-size:20px;">
                    Hola, ${nombreUsuario}
                  </h2>
                  <p style="color:#444444;font-size:15px;line-height:1.6;margin:0 0 25px 0;">
                    Hola ${nombreUsuario}, tu código de acceso al Sistema de Parqueadero del SENA es:
                  </p>

                  <!-- Código OTP -->
                  <div style="background-color:#E8F5EA;border:2px dashed #39A900;border-radius:10px;padding:25px;text-align:center;margin:25px 0;">
                    <p style="color:#007832;font-size:14px;margin:0 0 10px 0;font-weight:bold;">
                      TU CÓDIGO DE VERIFICACIÓN
                    </p>
                    <p style="color:#39A900;font-size:42px;font-weight:bold;letter-spacing:10px;margin:0;font-family:'Courier New',monospace;">
                      ${codigo}
                    </p>
                  </div>

                  <p style="color:#444444;font-size:14px;line-height:1.6;margin:20px 0 0 0;">
                    Este código expira en <strong>5 minutos</strong>.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#f5f5f5;padding:20px;text-align:center;border-top:1px solid #e0e0e0;">
                  <p style="color:#aaaaaa;font-size:12px;margin:0;">
                    Este es un correo automático, por favor no respondas a este mensaje.
                  </p>
                  <p style="color:#aaaaaa;font-size:12px;margin:5px 0 0 0;">
                    © 2026 SENA - Servicio Nacional de Aprendizaje
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }
}
