import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type {
  ExtensibleMarkdownProcessor,
  MermaidRenderer,
  MathRenderer,
  TemplateProcessor
} from './markdown-processor.interface';

@injectable()
export class MarkdownProcessorInitializer {
  constructor(
    @inject(TYPES.ExtensibleMarkdownProcessor)
    private markdownProcessor: ExtensibleMarkdownProcessor,
    @inject(TYPES.MermaidRenderer)
    private mermaidRenderer: MermaidRenderer,
    @inject(TYPES.MathRenderer)
    private mathRenderer: MathRenderer,
    @inject(TYPES.SimpleTemplateProcessor)
    private templateProcessor: TemplateProcessor,
    @inject(TYPES.MermaidMarkdownExtension)
    private mermaidExtension: any
  ) {
    console.log('[MarkdownProcessorInitializer] Constructor called, dependencies injected');
  }

  async initialize(): Promise<void> {
    console.log('[MarkdownProcessorInitializer] Initializing markdown processor components...');

    // 设置模板处理器到Markdown处理器
    console.log('[MarkdownProcessorInitializer] Setting template processor on markdown processor instance');
    this.markdownProcessor.setTemplateProcessor(this.templateProcessor);

    // 设置数学渲染器到Markdown处理器
    this.markdownProcessor.setMathRenderer(this.mathRenderer);

    // 设置Mermaid渲染器到Markdown处理器
    this.markdownProcessor.setMermaidRenderer(this.mermaidRenderer);

    // 配置Mermaid扩展
    if (this.mermaidExtension.setMermaidRenderer) {
      this.mermaidExtension.setMermaidRenderer(this.mermaidRenderer);
    }

    // 注册Mermaid扩展到Markdown处理器
    this.markdownProcessor.registerExtension(this.mermaidExtension);

    console.log('[MarkdownProcessorInitializer] Markdown processor initialization completed');
  }
}
