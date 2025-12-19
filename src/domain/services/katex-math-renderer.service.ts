import { injectable } from 'inversify';
import katex from 'katex';
import type { MathRenderer } from './markdown-processor.interface';

@injectable()
export class KatexMathRenderer implements MathRenderer {
  renderInline(math: string): string {
    try {
      return katex.renderToString(math, {
        throwOnError: false,
        displayMode: false,
        output: 'html'
      });
    } catch (error) {
      console.warn('KaTeX inline rendering error:', error);
      return `$${math}$`;
    }
  }

  renderBlock(math: string): string {
    try {
      return katex.renderToString(math, {
        throwOnError: false,
        displayMode: true,
        output: 'html'
      });
    } catch (error) {
      console.warn('KaTeX block rendering error:', error);
      return `$$${math}$$`;
    }
  }

  supportsFormat(format: string): boolean {
    return ['latex', 'tex'].includes(format.toLowerCase());
  }
}