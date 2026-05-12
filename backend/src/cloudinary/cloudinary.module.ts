import { Module, Global } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Global() // Hace que CloudinaryService esté disponible en toda la app sin importar el módulo
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}