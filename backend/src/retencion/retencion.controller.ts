import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RetencionService } from './retencion.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/retencion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RetencionController {
  constructor(private readonly retencionService: RetencionService) {}

  @Post('ejecutar')
  @ApiOperation({ summary: 'Ejecutar la purga de retención manualmente (Admin)' })
  ejecutar(@Query('dias') dias?: string) {
    const n = dias !== undefined ? Math.max(0, parseInt(dias, 10) || 0) : undefined;
    return this.retencionService.purgar(n);
  }
}
