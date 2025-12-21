import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { 
  ExtensibleMarkdownProcessor, 
  MermaidRenderer,
  MathRenderer
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
    @inject(TYPES.MermaidMarkdownExtension)
    private mermaidExtension: any
  ) {}

  async initialize(): Promise<void> {
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
    
    console.log('Markdown处理器初始化完成，数学公式和Mermaid扩展已注册');
  }
}