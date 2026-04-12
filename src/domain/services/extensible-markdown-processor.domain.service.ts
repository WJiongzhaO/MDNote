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

// Mermaid图表缓存接口
interface MermaidCacheEntry {
  diagram: string;
  svg: string;
  timestamp: number;
  options: any;
}

// 图表存储方案接口
interface ChartStorageEntry {
  id: string;
  type: 'mermaid' | 'image' | 'chart';
  content: string;
  renderedContent?: string;
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
    created: number;
    updated: number;
  };
}

@injectable()
export class ExtensibleMarkdownProcessor implements MarkdownProcessor, DocumentProcessor {
  private extensions: Map<string, MarkdownExtension> = new Map();
  private templateProcessor?: TemplateProcessor;
  private mathRenderer?: MathRenderer;
  private mermaidRenderer?: MermaidRenderer;

  // Mermaid图表缓存
  private mermaidCache: Map<string, MermaidCacheEntry> = new Map();
  private cacheMaxSize = 100; // 最大缓存条目数
  private cacheTimeout = 5 * 60 * 1000; // 缓存超时时间（5分钟）

  // 图表存储管理
  private chartStorage: Map<string, ChartStorageEntry> = new Map();

  // 用于调试的单例ID
  private static instanceCounter = 0;
  private readonly instanceId: number;

  constructor() {
    ExtensibleMarkdownProcessor.instanceCounter++;
    this.instanceId = ExtensibleMarkdownProcessor.instanceCounter;

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
    // 注册行内公式扩展 $...$
    this.registerExtension({
      name: 'mathInline',
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

    // 注册块级公式扩展 $$...$$
    this.registerExtension({
      name: 'mathBlock',
      priority: 100,
      tokenizer: {
        name: 'mathBlock',
        level: 'block',
        start(src: string) { return src.match(/^\$\$/)?.index; },
        tokenizer(src: string) {
          const rule = /^\$\$([\s\S]+?)\$\$/;
          const match = rule.exec(src);
          if (match) {
            return {
              type: 'mathBlock',
              raw: match[0],
              text: match[1].trim()
            };
          }
        },
        renderer: (token: any) => {
          if (this.mathRenderer && token?.text) {
            return this.mathRenderer.renderBlock(token.text);
          }
          const text = token?.text || '';
          return `$$${text}$$`;
        }
      }
    });

    // 注意：Mermaid扩展应该通过MarkdownProcessorInitializer注册
    // 这里不再注册默认的mermaid扩展，避免重复注册
  }

  async processMarkdown(content: string, variables: Record<string, any> = {}): Promise<string> {
    // 预处理扩展
    let processedContent = content;
    for (const extension of this.getExtensionsByPriority()) {
      if (extension.preProcess) {
        processedContent = extension.preProcess(processedContent);
      }
    }

    // 模板处理（使用传入的变量）
    if (this.templateProcessor) {
      processedContent = await this.templateProcessor.processTemplate(processedContent, variables);
    } else {
      console.warn(`[ExtensibleMarkdownProcessor] Instance #${this.instanceId}: Template processor not configured, variables will not be replaced`);
    }

    // Markdown 转换
    let html = marked(processedContent) as string;

    // 后处理扩展（按优先级从高到低）
    for (const extension of this.getExtensionsByPriority()) {
      if (extension.postProcess) {
        html = extension.postProcess(html);
      }
    }
    
    // 额外的后处理：移除所有独立的mermaid代码块（如果它们紧跟在占位符后面）
    // 这是为了确保即使扩展的postProcess没有正确工作，也能移除重复的代码块
    html = this.removeDuplicateMermaidCodeBlocks(html);

    // 安全清理（配置允许 KaTeX 生成的标签和属性）
    const result = DOMPurify.sanitize(html, {
      ADD_TAGS: ['annotation', 'semantics', 'mtext', 'mn', 'mo', 'mi', 'mspace', 'mrow', 'ms', 'mprescripts'],
      ADD_ATTR: ['mathvariant', 'displaystyle', 'scriptlevel', 'data-lexer', 'encoding']
    });

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

  /**
   * 编码Mermaid代码（用于HTML属性）
   */
  private encodeDiagram(diagram: string): string {
    return btoa(encodeURIComponent(diagram));
  }

  /**
   * 移除重复的Mermaid代码块
   * 如果HTML中同时存在占位符和对应的代码块，移除代码块
   */
  private removeDuplicateMermaidCodeBlocks(html: string): string {
    // 使用正则表达式移除紧跟在占位符后面的mermaid代码块
    // 匹配占位符后面的代码块
    let result = html.replace(
      /(<div[^>]*class="mermaid-asset-placeholder"[^>]*>[\s\S]*?<\/div>)\s*(<pre><code[^>]*class="[^"]*language-mermaid[^"]*"[^>]*>[\s\S]*?<\/code><\/pre>)/g,
      '$1'
    );
    
    // 匹配占位符前面的代码块
    result = result.replace(
      /(<pre><code[^>]*class="[^"]*language-mermaid[^"]*"[^>]*>[\s\S]*?<\/code><\/pre>)\s*(<div[^>]*class="mermaid-asset-placeholder"[^>]*>[\s\S]*?<\/div>)/g,
      '$2'
    );
    
    return result;
  }

  // Mermaid异步渲染和缓存管理方法
  private generateCacheKey(diagram: string, options: any): string {
    const optionsStr = JSON.stringify(options);
    return btoa(diagram + optionsStr).substring(0, 32);
  }

  private async renderMermaidAsync(diagram: string, cacheKey: string, options: any): Promise<void> {
    if (!this.mermaidRenderer) return;

    try {
      console.log('开始异步渲染Mermaid图表:', cacheKey);
      const svg = await this.mermaidRenderer.renderDiagram(diagram, options);

      // 更新缓存
      this.mermaidCache.set(cacheKey, {
        diagram,
        svg,
        timestamp: Date.now(),
        options
      });

      // 清理过期的缓存
      this.cleanupCache();

      // 更新DOM中的占位符
      this.updateMermaidPlaceholder(cacheKey, svg);

      console.log('Mermaid图表异步渲染完成:', cacheKey);
    } catch (error) {
      console.error('Mermaid异步渲染失败:', error);
      const errorHtml = this.createMermaidErrorFallback(diagram, error as Error);
      this.updateMermaidPlaceholder(cacheKey, errorHtml);
    }
  }

  private createMermaidPlaceholder(diagram: string, cacheKey: string): string {
    return `
      <div class="mermaid-placeholder" data-cache-key="${cacheKey}" style="
        border: 1px dashed #ccc;
        background-color: #f8f9fa;
        padding: 0.5rem 1rem;
        margin: 0.5rem 0;
        border-radius: 4px;
        display: inline-block;
        color: #666;
        font-size: 0.85rem;
      ">
        此处放置 mermaid 图表或图片
      </div>
    `;
  }

  private updateMermaidPlaceholder(cacheKey: string, content: string): void {
    // 使用setTimeout确保DOM已渲染完成
    setTimeout(() => {
      const placeholder = document.querySelector(`[data-cache-key="${cacheKey}"]`);
      if (placeholder && placeholder.parentNode) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = content;
        placeholder.parentNode.replaceChild(wrapper.firstChild!, placeholder);
      }
    }, 0);
  }

  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // 清理过期缓存
    for (const [key, entry] of this.mermaidCache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.mermaidCache.delete(key));

    // 清理超出大小的缓存
    if (this.mermaidCache.size > this.cacheMaxSize) {
      const entries = Array.from(this.mermaidCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const excess = entries.length - this.cacheMaxSize;
      for (let i = 0; i < excess; i++) {
        this.mermaidCache.delete(entries[i][0]);
      }
    }
  }

  // 图表存储管理方法
  storeChart(chartData: Omit<ChartStorageEntry, 'id' | 'metadata'>): string {
    const id = 'chart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const entry: ChartStorageEntry = {
      id,
      ...chartData,
      metadata: {
        created: Date.now(),
        updated: Date.now(),
        ...chartData.metadata
      }
    };

    this.chartStorage.set(id, entry);
    return id;
  }

  getChart(id: string): ChartStorageEntry | undefined {
    return this.chartStorage.get(id);
  }

  updateChart(id: string, updates: Partial<ChartStorageEntry>): boolean {
    const entry = this.chartStorage.get(id);
    if (!entry) return false;

    Object.assign(entry, updates);
    entry.metadata.updated = Date.now();
    return true;
  }

  deleteChart(id: string): boolean {
    return this.chartStorage.delete(id);
  }

  getAllCharts(): ChartStorageEntry[] {
    return Array.from(this.chartStorage.values());
  }

  searchCharts(query: string, type?: string): ChartStorageEntry[] {
    return this.getAllCharts().filter(chart => {
      const matchesType = !type || chart.type === type;
      const matchesQuery = !query ||
        chart.content.toLowerCase().includes(query.toLowerCase()) ||
        chart.metadata.title?.toLowerCase().includes(query.toLowerCase()) ||
        chart.metadata.description?.toLowerCase().includes(query.toLowerCase()) ||
        chart.metadata.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

      return matchesType && matchesQuery;
    });
  }
}
