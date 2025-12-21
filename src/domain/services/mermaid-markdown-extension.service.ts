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
    renderer: (token: any) => {
      console.log('Mermaid扩展渲染器被调用（占位符方案）');
      console.log('Token信息:', token);
      
      if (token?.diagram) {
        // 使用占位符方案，避免异步Promise问题
        // 占位符包含data属性存储Mermaid代码，由前端JavaScript异步渲染
        const diagramId = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const encodedDiagram = this.encodeDiagram(token.diagram);
        
        return `
          <div 
            class="mermaid-asset-placeholder" 
            data-asset-type="mermaid"
            data-asset-id="${diagramId}"
            data-diagram="${encodedDiagram}"
            style="
              border: 1px solid #e0e0e0;
              border-radius: 4px;
              padding: 1rem;
              margin: 1rem 0;
              background-color: #f8f9fa;
              position: relative;
              min-height: 200px;
              display: flex;
              align-items: center;
              justify-content: center;
            "
          >
            <div class="mermaid-loading" style="
              text-align: center;
              color: #666;
            ">
              <div style="margin-bottom: 0.5rem;">🔄 正在渲染Mermaid图表...</div>
              <div style="font-size: 0.8rem; opacity: 0.7;">请稍候</div>
            </div>
          </div>
        `;
      }
      
      // 如果没有图表代码，返回原始代码块
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

  /**
   * 编码Mermaid代码（用于HTML属性）
   */
  private encodeDiagram(diagram: string): string {
    return btoa(encodeURIComponent(diagram));
  }
}