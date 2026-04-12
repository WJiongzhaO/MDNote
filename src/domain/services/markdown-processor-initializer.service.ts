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
  ) {}

  async initialize(): Promise<void> {
    this.markdownProcessor.setTemplateProcessor(this.templateProcessor);
    this.markdownProcessor.setMathRenderer(this.mathRenderer);
    this.markdownProcessor.setMermaidRenderer(this.mermaidRenderer);

    if (this.mermaidExtension.setMermaidRenderer) {
      this.mermaidExtension.setMermaidRenderer(this.mermaidRenderer);
    }

    this.markdownProcessor.registerExtension(this.mermaidExtension);
  }
}
