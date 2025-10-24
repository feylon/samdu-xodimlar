import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser, SkipAudit } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ExportTableDto } from './dto/export-table.dto';
import { ExportService } from './export.service';

@ApiTags('Export')
@ApiBearerAuth()
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('excel')
  @HttpCode(200)
  @SkipAudit()
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiOperation({ summary: 'Render a table as Excel with generation timestamp header' })
  async excel(@Body() dto: ExportTableDto, @CurrentUser() actor: AuthenticatedUser, @Res() response: Response) {
    const buffer = await this.exportService.toExcel(dto, actor);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="${this.exportService.fileName(dto.title, 'xlsx')}"`);
    response.send(buffer);
  }

  @Post('pdf')
  @HttpCode(200)
  @SkipAudit()
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Render a table as PDF with timestamp watermark and footer' })
  async pdf(@Body() dto: ExportTableDto, @CurrentUser() actor: AuthenticatedUser, @Res() response: Response) {
    const buffer = await this.exportService.toPdf(dto, actor);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${this.exportService.fileName(dto.title, 'pdf')}"`);
    response.send(buffer);
  }
}
