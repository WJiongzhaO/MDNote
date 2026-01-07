import { injectable, inject } from 'inversify';
import { TYPES } from '../../../core/container/container.types';
import type { DocumentExportService, ExportOptions, ExportResult } from '../../../domain/services/document-export.interface';
import { ExportFormat } from '../../../domain/services/document-export.interface';
import type { ExtensibleMarkdownProcessor } from '../../../domain/services/extensible-markdown-processor.domain.service';
import { ExportPresets } from '../../../domain/types/export-config.types';
import { processImagesInHTML, getKaTeXStyles } from './export-utils';
import { generateStylesFromConfig, generateTableOfContents } from './export-style-generator';

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

    // 使用配置（如果没有提供，使用默认配置）
    const exportConfig = options.config || ExportPresets.default;

    // 1. 处理Markdown内容（包括片段引用、变量替换等）
    let html = await this.markdownProcessor.processMarkdown(content, variables);

    // 2. 处理图片路径，转换为 base64（PDF 需要嵌入资源）
    if (documentId) {
      html = await processImagesInHTML(html, documentId);
    }

    // 3. 生成目录（如果需要）
    let tocHtml = '';
    if (exportConfig.includeTableOfContents) {
      tocHtml = generateTableOfContents(html);
    }

    // 4. 创建完整的HTML文档（包含 KaTeX CSS 和配置样式）
    const fullHtml = this.createHTMLDocument(title, html, exportConfig, tocHtml);

    // 5. 使用Puppeteer生成PDF
    const pdfBuffer = await this.htmlToPDF(fullHtml, exportConfig);

    // 6. 生成文件名
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
  private createHTMLDocument(title: string, content: string, config: any, tocHtml: string): string {
    // 生成基于配置的样式
    const configStyles = generateStylesFromConfig(config);

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
          ${configStyles}
        </head>
        <body>
          ${tocHtml}
          ${content}
        </body>
      </html>
    `;
  }

  /**
   * 将HTML转换为PDF
   */
  private async htmlToPDF(html: string, config: any): Promise<Buffer> {
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

      // 生成PDF（使用配置中的页面设置）
      const pdfBuffer = await page.pdf({
        format: config.page.pageSize,
        landscape: config.page.orientation === 'landscape',
        margin: {
          top: `${config.page.marginTop}cm`,
          right: `${config.page.marginRight}cm`,
          bottom: `${config.page.marginBottom}cm`,
          left: `${config.page.marginLeft}cm`
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: config.includeHeader || config.includeFooter || config.includePageNumbers,
        headerTemplate: config.includeHeader && config.headerText ? 
          `<div style="font-size:9pt;text-align:center;width:100%;color:#666;">${config.headerText}</div>` : '<div></div>',
        footerTemplate: config.includeFooter && config.footerText ? 
          `<div style="font-size:9pt;text-align:center;width:100%;color:#666;">${config.footerText}</div>` : 
          (config.includePageNumbers ? '<div style="font-size:9pt;text-align:center;width:100%;color:#666;">第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页</div>' : '<div></div>')
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

