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
              border: 1px dashed #ccc;
              border-radius: 4px;
              padding: 0.5rem 1rem;
              margin: 0.5rem 0;
              background-color: #f8f9fa;
              display: inline-block;
              font-size: 0.85rem;
              color: #666;
            "
          >
            <div class="mermaid-loading" style="
              text-align: center;
              color: #666;
            ">
              <div>此处放置 mermaid 图表或图片</div>
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
    
    // 移除已经被占位符替换的mermaid代码块
    // 如果HTML中同时存在占位符和对应的代码块，移除代码块
    // 注意：在Node.js环境中，document可能不存在，需要检查
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // 查找所有mermaid占位符
      const placeholders = tempDiv.querySelectorAll('.mermaid-asset-placeholder[data-asset-type="mermaid"]');
      
      placeholders.forEach(placeholder => {
        // 查找占位符后面的代码块（可能是marked默认渲染的）
        let nextSibling = placeholder.nextElementSibling;
        while (nextSibling) {
          // 检查是否是mermaid代码块
          const codeElement = nextSibling.querySelector('code.language-mermaid, pre code.language-mermaid');
          if (codeElement) {
            // 移除这个代码块
            nextSibling.remove();
            break;
          }
          nextSibling = nextSibling.nextElementSibling;
        }
        
        // 也检查占位符前面的代码块（以防万一）
        let prevSibling = placeholder.previousElementSibling;
        while (prevSibling) {
          const codeElement = prevSibling.querySelector('code.language-mermaid, pre code.language-mermaid');
          if (codeElement) {
            prevSibling.remove();
            break;
          }
          prevSibling = prevSibling.previousElementSibling;
        }
      });
      
      return tempDiv.innerHTML;
    }
    
    // 如果document不存在，使用正则表达式移除重复的代码块
    // 查找紧跟在占位符后面的mermaid代码块
    let result = html;
    
    // 匹配占位符后面的代码块
    const placeholderAfterPattern = /(<div[^>]*class="mermaid-asset-placeholder"[^>]*>[\s\S]*?<\/div>)\s*(<pre><code[^>]*class="[^"]*language-mermaid[^"]*"[^>]*>[\s\S]*?<\/code><\/pre>)/g;
    result = result.replace(placeholderAfterPattern, '$1');
    
    // 匹配占位符前面的代码块
    const placeholderBeforePattern = /(<pre><code[^>]*class="[^"]*language-mermaid[^"]*"[^>]*>[\s\S]*?<\/code><\/pre>)\s*(<div[^>]*class="mermaid-asset-placeholder"[^>]*>[\s\S]*?<\/div>)/g;
    result = result.replace(placeholderBeforePattern, '$2');
    
    // 更通用的匹配：查找所有独立的mermaid代码块（不在占位符附近的）
    // 但保留那些没有对应占位符的代码块（可能是用户故意写的）
    // 这里我们只移除紧邻占位符的代码块
    
    return result;
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
