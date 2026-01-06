import { injectable, inject } from 'inversify';
import { TYPES } from '../../../core/container/container.types';
import type { DocumentExportService, ExportOptions, ExportResult } from '../../../domain/services/document-export.interface';
import { ExportFormat } from '../../../domain/services/document-export.interface';
import type { ExtensibleMarkdownProcessor } from '../../../domain/services/extensible-markdown-processor.domain.service';
import { processImagesInHTML, getKaTeXStyles } from './export-utils';

// 动态导入 puppeteer，只在 Node.js 环境中使用
let puppeteer: any;
if (typeof window === 'undefined') {
  // Node.js 环境
  puppeteer = require('puppeteer');
}

/**
 * PDF导出器
 * 使用Puppeteer将Markdown文档导出为PDF格式
 */
@injectable()
export class PDFExporter implements DocumentExportService {
  constructor(
    @inject(TYPES.ExtensibleMarkdownProcessor)
    private readonly markdownProcessor: ExtensibleMarkdownProcessor
  ) {}

  supportsFormat(format: ExportFormat): boolean {
    return format === ExportFormat.PDF;
  }

  async export(options: ExportOptions): Promise<ExportResult> {
    const { title, content, documentId, variables = {} } = options;

    // 1. 处理Markdown内容（包括片段引用、变量替换等）
    let html = await this.markdownProcessor.processMarkdown(content, variables);

    // 2. 处理图片路径，转换为 base64（PDF 需要嵌入资源）
    if (documentId) {
      html = await processImagesInHTML(html, documentId);
    }

    // 3. 创建完整的HTML文档（包含 KaTeX CSS）
    const fullHtml = this.createHTMLDocument(title, html, options.customStyles);

    // 4. 使用Puppeteer生成PDF
    const pdfBuffer = await this.htmlToPDF(fullHtml);

    // 5. 生成文件名
    const filename = this.sanitizeFilename(title) + '.pdf';

    return {
      buffer: pdfBuffer,
      extension: 'pdf',
      mimeType: 'application/pdf',
      filename
    };
  }

  /**
   * 创建完整的HTML文档
   */
  private createHTMLDocument(title: string, content: string, customStyles?: string): string {
    const defaultStyles = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          padding: 2cm;
          font-size: 12pt;
        }
        h1 {
          font-size: 24pt;
          margin-top: 1em;
          margin-bottom: 0.5em;
          page-break-after: avoid;
        }
        h2 {
          font-size: 20pt;
          margin-top: 1em;
          margin-bottom: 0.5em;
          page-break-after: avoid;
        }
        h3 {
          font-size: 16pt;
          margin-top: 0.8em;
          margin-bottom: 0.4em;
          page-break-after: avoid;
        }
        h4, h5, h6 {
          margin-top: 0.6em;
          margin-bottom: 0.3em;
          page-break-after: avoid;
        }
        p {
          margin: 0.5em 0;
          text-align: justify;
        }
        ul, ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }
        li {
          margin: 0.2em 0;
        }
        code {
          background-color: #f4f4f4;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: "Consolas", "Monaco", monospace;
          font-size: 0.9em;
        }
        pre {
          background-color: #f4f4f4;
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
          margin: 1em 0;
          page-break-inside: avoid;
        }
        pre code {
          background-color: transparent;
          padding: 0;
        }
        blockquote {
          border-left: 4px solid #ddd;
          padding-left: 1em;
          margin-left: 0;
          color: #666;
          font-style: italic;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
          page-break-inside: avoid;
        }
        table th, table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        table th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        img {
          max-width: 100%;
          height: auto;
          page-break-inside: avoid;
        }
        hr {
          border: none;
          border-top: 1px solid #ddd;
          margin: 2em 0;
        }
        @page {
          margin: 2cm;
          @bottom-right {
            content: "第 " counter(page) " 页 / 共 " counter(pages) " 页";
            font-size: 9pt;
            color: #666;
          }
        }
      </style>
    `;

    // 添加 KaTeX CSS 支持
    const katexStyles = getKaTeXStyles();

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.escapeHtml(title)}</title>
          ${katexStyles}
          ${defaultStyles}
          ${customStyles || ''}
        </head>
        <body>
          <h1>${this.escapeHtml(title)}</h1>
          ${content}
        </body>
      </html>
    `;
  }

  /**
   * 将HTML转换为PDF
   */
  private async htmlToPDF(html: string): Promise<Buffer> {
    // 检查是否在 Node.js 环境中
    if (typeof window !== 'undefined' || !puppeteer) {
      throw new Error('PDF导出需要在 Node.js 环境中运行。请通过主进程调用。');
    }

    let browser;
    try {
      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // 设置内容，等待所有资源加载完成（包括图片和 CSS）
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // 等待 Mermaid 图表渲染（如果有）
      await page.evaluate(async () => {
        return new Promise<void>((resolve) => {
          // 检查是否有 Mermaid 占位符
          const mermaidPlaceholders = document.querySelectorAll('.mermaid-asset-placeholder');
          if (mermaidPlaceholders.length === 0) {
            resolve();
            return;
          }

          // 尝试在页面中渲染 Mermaid 图表
          const renderMermaid = async () => {
            try {
              // 动态加载 Mermaid
              const mermaidModule = await import('mermaid');
              const mermaid = mermaidModule.default;
              
              // 初始化 Mermaid
              mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose'
              });

              // 渲染所有占位符
              for (const placeholder of Array.from(mermaidPlaceholders)) {
                const diagram = (placeholder as HTMLElement).getAttribute('data-diagram');
                if (diagram) {
                  try {
                    // 解码 base64 编码的图表代码
                    const diagramCode = decodeURIComponent(atob(diagram));
                    const id = (placeholder as HTMLElement).getAttribute('data-asset-id') || 
                               `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    
                    // 渲染图表
                    const svg = await mermaid.render(id, diagramCode);
                    const svgString = typeof svg === 'string' ? svg : (svg.svg || '');
                    
                    if (svgString) {
                      // 替换占位符内容
                      placeholder.innerHTML = `
                        <div class="mermaid-container" style="text-align: center;">
                          ${svgString}
                        </div>
                      `;
                      placeholder.classList.remove('mermaid-asset-placeholder');
                      placeholder.classList.add('mermaid-asset-rendered');
                    }
                  } catch (error) {
                    console.warn('Failed to render Mermaid diagram:', error);
                  }
                }
              }
            } catch (error) {
              console.warn('Failed to load Mermaid in PDF export:', error);
            }
          };

          // 执行渲染
          renderMermaid().then(() => {
            // 等待渲染完成，检查是否还有未渲染的占位符
            let attempts = 0;
            const maxAttempts = 10;
            const checkInterval = 200; // 200ms

            const checkRendering = () => {
              const remainingPlaceholders = document.querySelectorAll('.mermaid-asset-placeholder');
              if (remainingPlaceholders.length === 0 || attempts >= maxAttempts) {
                resolve();
              } else {
                attempts++;
                setTimeout(checkRendering, checkInterval);
              }
            };

            setTimeout(checkRendering, checkInterval);
          });
        });
      });

      // 生成PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        },
        printBackground: true,
        preferCSSPageSize: false
      });

      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
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

