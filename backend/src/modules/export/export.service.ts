import { Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { formatTimestamp } from '../../common/utils/date.util';
import { OrganizationService } from '../organization/organization.service';
import { ExportColumnDto, ExportTableDto } from './dto/export-table.dto';

const LABELS = {
  uz: { generated: 'Yaratilgan vaqt', generatedBy: 'Yaratuvchi', rows: 'Qatorlar soni', page: 'Sahifa', yes: 'Ha', no: 'Yo\'q' },
  ru: { generated: 'Сформировано', generatedBy: 'Сформировал', rows: 'Количество строк', page: 'Страница', yes: 'Да', no: 'Нет' },
};

const ROBOTO_VFS: Record<string, string> = require('pdfmake/build/vfs_fonts');
const fontBuffer = (name: string): Buffer => Buffer.from(ROBOTO_VFS[name], 'base64');

@Injectable()
export class ExportService {
  private readonly printer = new PdfPrinter({
    Roboto: {
      normal: fontBuffer('Roboto-Regular.ttf'),
      bold: fontBuffer('Roboto-Medium.ttf'),
      italics: fontBuffer('Roboto-Italic.ttf'),
      bolditalics: fontBuffer('Roboto-MediumItalic.ttf'),
    },
  });

  constructor(private readonly organizationService: OrganizationService) {}

  async toExcel(dto: ExportTableDto, actor: AuthenticatedUser): Promise<Buffer> {
    const locale = dto.locale ?? 'uz';
    const labels = LABELS[locale];
    const organization = await this.organizationService.get();
    const generatedAt = formatTimestamp();
    const workbook = new Workbook();
    workbook.creator = organization.name;
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(dto.title.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '), {
      pageSetup: { orientation: dto.orientation ?? 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      headerFooter: { oddFooter: `&L${organization.name}&C${labels.generated}: ${generatedAt}&R&P / &N` },
    });
    const columnCount = dto.columns.length;
    sheet.mergeCells(1, 1, 1, columnCount);
    sheet.getCell(1, 1).value = `${organization.name} — ${dto.title}`;
    sheet.getCell(1, 1).font = { bold: true, size: 14 };
    sheet.mergeCells(2, 1, 2, columnCount);
    sheet.getCell(2, 1).value = `${labels.generated}: ${generatedAt} · ${labels.generatedBy}: ${actor.fullName} · ${labels.rows}: ${dto.rows.length}${dto.subtitle ? ` · ${dto.subtitle}` : ''}`;
    sheet.getCell(2, 1).font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
    const headerRow = sheet.getRow(4);
    dto.columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.label;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { bottom: { style: 'thin' } };
    });
    dto.rows.forEach((row, rowIndex) => {
      const target = sheet.getRow(5 + rowIndex);
      dto.columns.forEach((column, index) => {
        target.getCell(index + 1).value = this.formatCell(row[column.key], column, labels) as never;
      });
    });
    dto.columns.forEach((column, index) => {
      const lengths = [column.label.length, ...dto.rows.map((row) => String(this.formatCell(row[column.key], column, labels) ?? '').length)];
      sheet.getColumn(index + 1).width = Math.min(60, Math.max(12, Math.max(...lengths) + 2));
    });
    sheet.views = [{ state: 'frozen', ySplit: 4 }];
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + dto.rows.length, column: columnCount } };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }

  async toPdf(dto: ExportTableDto, actor: AuthenticatedUser): Promise<Buffer> {
    const locale = dto.locale ?? 'uz';
    const labels = LABELS[locale];
    const organization = await this.organizationService.get();
    const generatedAt = formatTimestamp();
    const body = [
      dto.columns.map((column) => ({ text: column.label, style: 'tableHeader' })),
      ...dto.rows.map((row) => dto.columns.map((column) => ({ text: String(this.formatCell(row[column.key], column, labels) ?? ''), style: 'tableCell' }))),
    ];
    const definition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: dto.orientation ?? 'landscape',
      pageMargins: [28, 70, 28, 50],
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      header: {
        margin: [28, 20, 28, 0],
        columns: [
          { text: organization.name, bold: true, fontSize: 12 },
          { text: `${labels.generated}: ${generatedAt}`, alignment: 'right', fontSize: 9, color: '#6b7280' },
        ],
      },
      footer: (currentPage, pageCount) => ({
        margin: [28, 10, 28, 0],
        columns: [
          { text: `${labels.generatedBy}: ${actor.fullName} · ${labels.generated}: ${generatedAt}`, fontSize: 8, color: '#6b7280' },
          { text: `${labels.page} ${currentPage} / ${pageCount}`, alignment: 'right', fontSize: 8, color: '#6b7280' },
        ],
      }),
      watermark: { text: generatedAt, color: '#9ca3af', opacity: 0.08, bold: true, fontSize: 48 },
      content: [
        { text: dto.title, style: 'title' },
        { text: `${dto.subtitle ? `${dto.subtitle} · ` : ''}${labels.rows}: ${dto.rows.length}`, style: 'subtitle' },
        {
          table: { headerRows: 1, widths: dto.columns.map(() => '*'), body },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? '#1d4ed8' : rowIndex % 2 === 0 ? '#f3f4f6' : null),
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb',
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
          },
        },
      ],
      styles: {
        title: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
        subtitle: { fontSize: 9, color: '#6b7280', margin: [0, 0, 0, 12] },
        tableHeader: { bold: true, color: '#ffffff', fontSize: 9 },
        tableCell: { fontSize: 8.5 },
      },
    };
    const document = this.printer.createPdfKitDocument(definition);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.end();
    });
  }

  fileName(title: string, extension: string): string {
    const safe = title.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'export';
    const stamp = formatTimestamp().replace(/[.: ]/g, '-');
    return `${safe}_${stamp}.${extension}`;
  }

  private formatCell(value: unknown, column: ExportColumnDto, labels: (typeof LABELS)['uz']): string | number | Date | null {
    if (value === null || value === undefined) return null;
    switch (column.type) {
      case 'number':
        return typeof value === 'number' ? value : Number(value);
      case 'boolean':
        return value ? labels.yes : labels.no;
      case 'date':
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10).split('-').reverse().join('.') : String(value);
      case 'datetime':
        return formatTimestamp(new Date(value as string));
      default:
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }
  }
}
