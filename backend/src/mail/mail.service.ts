import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  /**
   * Envía el código OTP al correo del usuario.
   */
  async enviarCodigoOtp(destinatario: string, codigo: string, nombreUsuario: string): Promise<void> {
    const remitenteNombre = this.configService.get<string>('MAIL_FROM_NAME') ?? 'Parqueadero SENA';
    const remitenteCorreo = this.configService.get<string>('MAIL_USER');

    const html = this.plantillaHtml(codigo, nombreUsuario);

    try {
      await this.transporter.sendMail({
        from: `"${remitenteNombre}" <${remitenteCorreo}>`,
        to: destinatario,
        subject: 'Tu código de verificación - SENA',
        html,
      });
      this.logger.log(`Correo OTP enviado a ${destinatario}`);
    } catch (error) {
      this.logger.error(`Error al enviar correo a ${destinatario}`, error);
      throw new InternalServerErrorException(
        'No se pudo enviar el código de verificación. Intenta de nuevo.',
      );
    }
  }

  /**
   * Plantilla HTML del correo con la identidad SENA.
   */
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
                    Recibimos una solicitud para iniciar sesión en tu cuenta. 
                    Para continuar, usa el siguiente código de verificación:
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
                    Si no fuiste tú quien intentó iniciar sesión, por favor ignora este correo.
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