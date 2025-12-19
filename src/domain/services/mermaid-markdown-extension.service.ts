import { injectable } from 'inversify';
import type { 
  MarkdownExtension, 
  MermaidRenderer,
  MermaidRenderOptions 
} from './markdown-processor.interface';

@injectable()
export class MermaidMarkdownExtension implements MarkdownExtension {
  name = 'mermaid';
  priority = 90; // 在数学公式之后处理
  
  private mermaidRenderer?: MermaidRenderer;
  private renderOptions: MermaidRenderOptions = {};

  setMermaidRenderer(renderer: MermaidRenderer): void {
    this.mermaidRenderer = renderer;
  }

  setRenderOptions(options: MermaidRenderOptions): void {
    this.renderOptions = options;
  }

  tokenizer = {
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
      console.log('Mermaid扩展渲染器被调用');
      console.log('Token信息:', token);
      
      if (this.mermaidRenderer && token?.diagram) {
        console.log('使用Mermaid渲染器渲染图表');
        try {
          const result = await this.mermaidRenderer.renderDiagram(token.diagram, this.renderOptions);
          console.log('Mermaid扩展渲染成功，结果长度:', result.length);
          return result;
        } catch (error) {
          console.error('Mermaid扩展渲染失败:', error);
          return this.createErrorFallback(token.diagram, error as Error);
        }
      }
      
      // 如果没有渲染器，返回原始代码块
      console.log('没有Mermaid渲染器，返回原始代码块');
      const text = token?.text || '';
      return `\n<pre><code class=\"language-mermaid\">${this.escapeHtml(text)}</code></pre>\n`;
    }
  };

  postProcess(html: string): string {
    // 处理内联的Mermaid语法（如果有的话）
    // 这里可以添加对 `mermaid` 内联语法的支持
    return html;
  }

  private createErrorFallback(diagram: string, error: Error): string {
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