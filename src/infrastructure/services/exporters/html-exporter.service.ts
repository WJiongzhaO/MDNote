import { injectable, inject } from 'inversify';
import { TYPES } from '../../../core/container/container.types';
import type { DocumentExportService, ExportOptions, ExportResult } from '../../../domain/services/document-export.interface';
import { ExportFormat } from '../../../domain/services/document-export.interface';
import type { ExtensibleMarkdownProcessor } from '../../../domain/services/extensible-markdown-processor.domain.service';
import { ExportPresets } from '../../../domain/types/export-config.types';
import { processImagesInHTML, getKaTeXStyles } from './export-utils';
import { generateStylesFromConfig, generateTableOfContents } from './export-style-generator';

/**
 * HTML导出器
 * 将Markdown文档导出为HTML格式
 */
@injectable()
export class HTMLExporter implements DocumentExportService {
  constructor(
    @inject(TYPES.ExtensibleMarkdownProcessor)
    private readonly markdownProcessor: ExtensibleMarkdownProcessor
  ) {}

  supportsFormat(format: ExportFormat): boolean {
    return format === ExportFormat.HTML;
  }

  async export(options: ExportOptions): Promise<ExportResult> {
    const { title, content, documentId, variables = {} } = options;

    // 使用配置（如果没有提供，使用默认配置）
    const exportConfig = options.config || ExportPresets.default;

    // 1. 处理Markdown内容（包括片段引用、变量替换等）
    let html = await this.markdownProcessor.processMarkdown(content, variables);

    // 2. 处理图片路径，转换为 base64（确保导出文件包含图片）
    if (documentId) {
      html = await processImagesInHTML(html, documentId);
    }

    // 3. 处理 Mermaid 图表：确保所有图表都已渲染为 SVG
    html = await this.processMermaidDiagrams(html);

    // 4. 生成目录（如果需要）
    let tocHtml = '';
    if (exportConfig.includeTableOfContents) {
      tocHtml = generateTableOfContents(html);
    }

    // 5. 创建完整的HTML文档（使用配置样式）
    const fullHtml = this.createHTMLDocument(title, html, exportConfig, tocHtml);

    // 6. 生成文件名
    const filename = this.sanitizeFilename(title) + '.html';

    // 使用 TextEncoder 生成 ArrayBuffer（浏览器兼容）
    const encoder = new TextEncoder();
    const buffer = encoder.encode(fullHtml).buffer;
    
    return {
      buffer: buffer as any,
      extension: 'html',
      mimeType: 'text/html',
      filename
    };
  }

  /**
   * 处理 Mermaid 图表，确保所有图表都已渲染为 SVG
   */
  private async processMermaidDiagrams(html: string): Promise<string> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // Node.js 环境，无法渲染，返回原始 HTML
      return html;
    }

    try {
      // 创建临时 DOM 来解析和渲染
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // 查找所有 Mermaid 占位符
      const placeholders = tempDiv.querySelectorAll('.mermaid-asset-placeholder');
      
      if (placeholders.length === 0) {
        return html; // 没有需要处理的图表
      }

      // 尝试获取 Mermaid 渲染器
      let mermaidRenderer: any = null;
      try {
        const { InversifyContainer } = await import('../../../core/container/inversify.container');
        const { TYPES } = await import('../../../core/container/container.types');
        const container = InversifyContainer.getInstance();
        
        if (container && container.isBound(TYPES.MermaidRenderer)) {
          mermaidRenderer = container.get(TYPES.MermaidRenderer);
          if (mermaidRenderer && typeof mermaidRenderer.initialize === 'function') {
            await mermaidRenderer.initialize();
          }
        }
      } catch (error) {
        console.warn('Failed to get Mermaid renderer for HTML export:', error);
      }

      // 渲染所有占位符
      for (const placeholder of Array.from(placeholders)) {
        const encodedDiagram = (placeholder as HTMLElement).getAttribute('data-diagram');
        if (encodedDiagram && mermaidRenderer) {
          try {
            // 解码图表代码
            const diagramCode = decodeURIComponent(atob(encodedDiagram));
            
            // 渲染图表
            const svg = await mermaidRenderer.renderDiagram(diagramCode, {
              theme: 'default',
              securityLevel: 'loose',
              fontFamily: 'inherit'
            });

            if (svg) {
              // 替换占位符内容
              placeholder.innerHTML = `
                <div class="mermaid-container" style="text-align: center; margin: 1rem 0;">
                  ${svg}
                </div>
              `;
              placeholder.classList.remove('mermaid-asset-placeholder');
              placeholder.classList.add('mermaid-asset-rendered');
            }
          } catch (error) {
            console.warn('Failed to render Mermaid diagram in HTML export:', error);
            // 保留占位符，显示错误信息
            placeholder.innerHTML = '<div style="padding: 1rem; color: #d63031;">[Mermaid图表渲染失败]</div>';
          }
        }
      }

      return tempDiv.innerHTML;
    } catch (error) {
      console.error('Error processing Mermaid diagrams in HTML export:', error);
      return html; // 出错时返回原始 HTML
    }
  }

  /**
   * 创建完整的HTML文档
   */
  private createHTMLDocument(title: string, content: string, config: any, tocHtml: string): string {
    // 生成基于配置的样式
    const configStyles = generateStylesFromConfig(config);

    // 添加 KaTeX CSS 支持
    const katexStyles = getKaTeXStyles();

    // 额外的网页优化样式
    const webOptimizedStyles = `
      <style>
        body {
          max-width: 900px;
          margin: 0 auto;
          background-color: white;
        }
        
        .table-of-contents {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 6px;
          margin-bottom: 2rem;
          border-left: 4px solid #007bff;
        }
        
        @media screen and (max-width: 768px) {
          body {
            padding: 1rem;
          }
        }
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.escapeHtml(title)}</title>
          ${katexStyles}
          ${configStyles}
          ${webOptimizedStyles}
        </head>
        <body>
          ${tocHtml}
          ${content}
          ${config.includeFooter && config.footerText ? `
            <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 0.9em;">
              ${config.footerText}
            </footer>
          ` : ''}
        </body>
      </html>
    `;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .trim()
      .substring(0, 200);
  }
}

