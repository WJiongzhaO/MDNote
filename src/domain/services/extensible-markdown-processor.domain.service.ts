import { injectable } from 'inversify';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { 
  MarkdownProcessor, 
  MarkdownExtension, 
  TemplateProcessor, 
  MathRenderer, 
  MermaidRenderer,
  DocumentProcessor, 
  ProcessedDocument, 
  DocumentMetadata, 
  DocumentProcessingOptions 
} from './markdown-processor.interface';

@injectable()
export class ExtensibleMarkdownProcessor implements MarkdownProcessor, DocumentProcessor {
  private extensions: Map<string, MarkdownExtension> = new Map();
  private templateProcessor?: TemplateProcessor;
  private mathRenderer?: MathRenderer;
  private mermaidRenderer?: MermaidRenderer;

  constructor() {
    this.configureMarked();
    this.registerDefaultExtensions();
  }

  private configureMarked(): void {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  private registerDefaultExtensions(): void {
    // 默认注册数学公式扩展
    this.registerExtension({
      name: 'math',
      priority: 100,
      tokenizer: {
        name: 'mathInline',
        level: 'inline',
        start(src: string) { return src.match(/\$/)?.index; },
        tokenizer(src: string) {
          const rule = /^\$([^$\n]+?)\$/;
          const match = rule.exec(src);
          if (match) {
            return {
              type: 'mathInline',
              raw: match[0],
              text: match[1].trim()
            };
          }
        },
        renderer: (token: any) => {
          if (this.mathRenderer && token?.text) {
            return this.mathRenderer.renderInline(token.text);
          }
          const text = token?.text || '';
          return `$${text}$`;
        }
      }
    });
    
    // 默认注册Mermaid扩展（基础版本，不依赖渲染器）
    this.registerExtension({
      name: 'mermaid',
      priority: 90,
      tokenizer: {
        name: 'mermaid',
        level: 'block',
        start(src: string) { 
          return src.match(/^```mermaid\s*\n/)?.index; 
        },
        tokenizer(src: string) {
          const rule = /^```mermaid\s*\n([\s\S]*?)\n```/;
          const match = rule.exec(src);
          
          if (match) {
            return {
              type: 'mermaid',
              raw: match[0],
              text: match[1].trim(),
              diagram: match[1].trim()
            };
          }
        },
        renderer: async (token: any) => {
          if (this.mermaidRenderer && token?.diagram) {
            try {
              return await this.mermaidRenderer.renderDiagram(token.diagram, {});
            } catch (error) {
              console.error('Mermaid扩展渲染失败:', error);
              return this.createMermaidErrorFallback(token.diagram, error as Error);
            }
          }
          
          // 如果没有渲染器，返回原始代码块
          const text = token?.text || '';
          return `\n<pre><code class=\"language-mermaid\">${this.escapeHtml(text)}</code></pre>\n`;
        }
      }
    });
  }

  async processMarkdown(content: string): Promise<string> {
    console.log('Markdown处理器开始处理内容');
    console.log('输入内容长度:', content.length);
    
    // 预处理扩展
    let processedContent = content;
    for (const extension of this.getExtensionsByPriority()) {
      if (extension.preProcess) {
        processedContent = extension.preProcess(processedContent);
      }
    }

    // 模板处理
    if (this.templateProcessor) {
      processedContent = await this.templateProcessor.processTemplate(processedContent, {});
    }

    // Markdown 转换
    console.log('开始Markdown转换...');
    let html = marked(processedContent) as string;
    console.log('Markdown转换完成，HTML长度:', html.length);

    // 后处理扩展
    for (const extension of this.getExtensionsByPriority()) {
      if (extension.postProcess) {
        html = extension.postProcess(html);
      }
    }

    // 安全清理
    console.log('开始HTML安全清理...');
    const result = DOMPurify.sanitize(html);
    console.log('HTML安全清理完成，结果长度:', result.length);
    
    return result;
  }

  async processDocument(content: string, options: DocumentProcessingOptions = {}): Promise<ProcessedDocument> {
    const { 
      variables = {}, 
      templateEngine = false, 
      mathRendering = true, 
      sanitize = true 
    } = options;

    let processedContent = content;

    // 模板处理
    if (templateEngine && this.templateProcessor) {
      processedContent = await this.templateProcessor.processTemplate(processedContent, variables);
    }

    // Markdown 转换
    let html = marked(processedContent) as string;

    // 安全清理
    if (sanitize) {
      html = DOMPurify.sanitize(html);
    }

    // 提取元数据
    const metadata = this.extractMetadata(content);
    
    // 提取变量
    const extractedVariables = this.templateProcessor ? 
      this.templateProcessor.extractVariables(content) : [];

    // 提取引用（未来功能）
    const references: string[] = [];

    return {
      html,
      metadata,
      variables: extractedVariables,
      references
    };
  }

  extractTitle(content: string): string {
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('# ')) {
        return trimmedLine.substring(2).trim();
      }
    }

    const firstLine = lines[0] || '';
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  registerExtension(extension: MarkdownExtension): void {
    this.extensions.set(extension.name, extension);
    this.updateMarkedExtensions();
  }

  unregisterExtension(extensionName: string): void {
    this.extensions.delete(extensionName);
    this.updateMarkedExtensions();
  }

  setTemplateProcessor(processor: TemplateProcessor): void {
    this.templateProcessor = processor;
  }

  setMathRenderer(renderer: MathRenderer): void {
    this.mathRenderer = renderer;
  }

  setMermaidRenderer(renderer: MermaidRenderer): void {
    this.mermaidRenderer = renderer;
  }

  private getExtensionsByPriority(): MarkdownExtension[] {
    return Array.from(this.extensions.values())
      .sort((a, b) => b.priority - a.priority);
  }

  private updateMarkedExtensions(): void {
    const extensions = this.getExtensionsByPriority()
      .filter(ext => ext.tokenizer)
      .map(ext => ext.tokenizer);

    marked.use({
      extensions
    });
  }

  private extractMetadata(content: string): DocumentMetadata {
    const title = this.extractTitle(content);
    const slug = this.generateSlug(title);
    
    // 计算字数
    const textContent = content.replace(/[#*`~\[\]()]/g, '').replace(/\s+/g, ' ');
    const wordCount = textContent.split(' ').filter(word => word.length > 0).length;
    const characterCount = textContent.length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // 假设每分钟阅读200字

    return {
      title,
      slug,
      wordCount,
      characterCount,
      estimatedReadingTime
    };
  }

  private createMermaidErrorFallback(diagram: string, error: Error): string {
    return `
      <div class="mermaid-error" style="
        border: 1px solid #ffa726;
        background-color: #fff3e0;
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9rem;
        color: #ef6c00;
      ">
        <div style="font-weight: bold; margin-bottom: 0.5rem;">
          ⚠️ Mermaid图表（未渲染）
        </div>
        <pre style="background-color: #f8f9fa; padding: 0.5rem; margin: 0; border-radius: 2px; overflow: auto;">${this.escapeHtml(diagram)}</pre>
        <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #666;">
          错误: ${error.message}
        </div>
      </div>
    `;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}