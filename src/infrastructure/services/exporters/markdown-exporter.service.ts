import { injectable, inject } from 'inversify';
import { TYPES } from '../../../core/container/container.types';
import type { DocumentExportService, ExportOptions, ExportResult } from '../../../domain/services/document-export.interface';
import { ExportFormat } from '../../../domain/services/document-export.interface';

/**
 * Markdown导出器
 * 直接导出原始Markdown内容
 */
@injectable()
export class MarkdownExporter implements DocumentExportService {
  supportsFormat(format: ExportFormat): boolean {
    return format === ExportFormat.MARKDOWN;
  }

  async export(options: ExportOptions): Promise<ExportResult> {
    const { title, content } = options;

    // 直接返回Markdown内容，可以添加frontmatter
    const markdownContent = this.createMarkdownDocument(title, content);

    // 生成文件名
    const filename = this.sanitizeFilename(title) + '.md';

    // 使用 TextEncoder 生成 ArrayBuffer（浏览器兼容）
    const encoder = new TextEncoder();
    const buffer = encoder.encode(markdownContent).buffer;
    
    return {
      buffer: buffer as any,
      extension: 'md',
      mimeType: 'text/markdown',
      filename
    };
  }

  /**
   * 创建Markdown文档（可选择性添加frontmatter）
   */
  private createMarkdownDocument(title: string, content: string): string {
    // 检查是否已有frontmatter
    const trimmed = content.trimStart();
    if (trimmed.startsWith('---')) {
      // 已有frontmatter，直接返回
      return content;
    }

    // 添加标题（如果内容不包含标题）
    // 这里简单处理，直接返回原始内容
    return content;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .trim()
      .substring(0, 200);
  }
}

