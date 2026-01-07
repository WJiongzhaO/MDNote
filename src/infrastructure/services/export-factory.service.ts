import { injectable, inject } from 'inversify';
import type { DocumentExportService } from '../../domain/services/document-export.interface';
import { ExportFormat } from '../../domain/services/document-export.interface';
import { PDFExporter } from './exporters/pdf-exporter.service';
import { HTMLExporter } from './exporters/html-exporter.service';
import { MarkdownExporter } from './exporters/markdown-exporter.service';

/**
 * 导出服务工厂
 * 根据格式返回对应的导出器
 */
@injectable()
export class ExportFactory {
  private exporters: Map<ExportFormat, DocumentExportService> = new Map();

  constructor(
    @inject(PDFExporter) private readonly pdfExporter: PDFExporter,
    @inject(HTMLExporter) private readonly htmlExporter: HTMLExporter,
    @inject(MarkdownExporter) private readonly markdownExporter: MarkdownExporter
  ) {
    // 注册所有导出器
    this.exporters.set(ExportFormat.PDF, pdfExporter);
    this.exporters.set(ExportFormat.HTML, htmlExporter);
    this.exporters.set(ExportFormat.MARKDOWN, markdownExporter);
  }

  /**
   * 获取指定格式的导出器
   */
  getExporter(format: ExportFormat): DocumentExportService {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    return exporter;
  }

  /**
   * 获取所有支持的格式
   */
  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }
}

