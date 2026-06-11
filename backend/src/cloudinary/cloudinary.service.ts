import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
    this.logger.log('Cloudinary configurado correctamente');
  }

  /**
   * Extrae el public_id de una URL de Cloudinary.
   * Ejemplo de URL:
   *   https://res.cloudinary.com/dxlgoeqih/image/upload/v1778616935/k8zgr0m42vvw5hfuia43.jpg
   * El public_id es: k8zgr0m42vvw5hfuia43
   * Si la imagen está en una carpeta, será: carpeta/k8zgr0m42vvw5hfuia43
   */
  extraerPublicId(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    try {
      // Buscar el patrón /upload/.../public_id.ext
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
      if (!match || !match[1]) return null;
      return match[1];
    } catch {
      return null;
    }
  }

  /**
   * Borra una imagen de Cloudinary usando su URL.
   * No lanza error si falla, solo lo loguea (para no bloquear el flujo principal).
   */
  async borrarPorUrl(url: string): Promise<void> {
    const publicId = this.extraerPublicId(url);
    if (!publicId) {
      this.logger.warn(`No se pudo extraer public_id de: ${url}`);
      return;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result === 'ok') {
        this.logger.log(`Imagen borrada de Cloudinary: ${publicId}`);
      } else if (result.result === 'not found') {
        this.logger.warn(`Imagen no encontrada en Cloudinary: ${publicId}`);
      } else {
        this.logger.warn(`Resultado inesperado al borrar ${publicId}: ${result.result}`);
      }
    } catch (error) {
      this.logger.error(`Error al borrar imagen ${publicId}`, error);
      // No lanzamos el error para no bloquear el borrado del registro
    }
  }

  async borrarVariasPorUrl(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.borrarPorUrl(url)));
  }
}