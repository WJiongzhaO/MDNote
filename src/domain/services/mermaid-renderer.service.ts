import { injectable } from 'inversify';
import type { MermaidRenderer } from './markdown-processor.interface';

export interface MermaidRenderOptions {
  theme?: 'default' | 'base' | 'dark' | 'forest' | 'neutral' | 'null';
  backgroundColor?: string;
  fontFamily?: string;
  securityLevel?: 'strict' | 'loose' | 'antiscript';
}

@injectable()
export class MermaidRendererService implements MermaidRenderer {
  private isInitialized = false;
  private mermaidInstance: any = null;
  private defaultOptions: MermaidRenderOptions = {
    theme: 'default',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    securityLevel: 'strict'
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 动态加载Mermaid库
      const mermaidModule = await import('mermaid');
      const mermaid = mermaidModule.default;

      // 配置Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: this.defaultOptions.theme,
        securityLevel: this.defaultOptions.securityLevel,
        fontFamily: this.defaultOptions.fontFamily,
        flowchart: {
          htmlLabels: true,
          useMaxWidth: true
        },
        sequence: {
          useMaxWidth: true,
          noteFontWeight: 'normal'
        },
        gantt: {
          useMaxWidth: true
        }
      });

      this.isInitialized = true;
      this.mermaidInstance = mermaid;
    } catch (error) {
      console.error('Mermaid初始化失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  async renderDiagram(diagram: string, options: MermaidRenderOptions = {}): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 合并配置
      const renderOptions = { ...this.defaultOptions, ...options };

      // 生成唯一的ID
      const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);

      // 检查mermaid实例是否可用
      if (!this.mermaidInstance) {
        throw new Error('Mermaid库未加载，请检查依赖配置');
      }

      // 渲染图表
      // 对于Mermaid 11.x版本，使用更兼容的API调用方式
      let svg: string;

      try {
        // 方法1: 使用render方法并处理Promise
        const result = await this.mermaidInstance.render(id, diagram);

        // 检查返回结果格式
        if (!result) {
          throw new Error('Mermaid渲染返回了空结果');
        }

        // 根据Mermaid API，render方法可能返回包含svg属性的对象或直接返回字符串
        if (typeof result === 'string') {
          svg = result;
        } else if (result.svg && typeof result.svg === 'string') {
          svg = result.svg;
        } else if (result.bindFunctions) {
          // Mermaid 11.x可能返回包含bindFunctions的对象
          svg = result.svg || '';
        } else if (result instanceof Promise) {
          // 如果返回的是Promise，等待它完成
          const resolvedResult = await result;

          // 递归处理嵌套的Promise
          if (resolvedResult instanceof Promise) {
            const deeplyResolved = await resolvedResult;

            if (typeof deeplyResolved === 'string') {
              svg = deeplyResolved;
            } else if (deeplyResolved.svg && typeof deeplyResolved.svg === 'string') {
              svg = deeplyResolved.svg;
            } else if (deeplyResolved.bindFunctions) {
              svg = deeplyResolved.svg || '';
            } else {
              throw new Error('深度Promise解析后的格式无法识别');
            }
          } else if (typeof resolvedResult === 'string') {
            svg = resolvedResult;
          } else if (resolvedResult.svg && typeof resolvedResult.svg === 'string') {
            svg = resolvedResult.svg;
          } else if (resolvedResult.bindFunctions) {
            svg = resolvedResult.svg || '';
          } else {
            throw new Error('Promise解析后的格式无法识别');
          }
        } else {
          console.error('无法识别的Mermaid返回格式:', result);
          throw new Error('Mermaid渲染返回了无法识别的格式');
        }
      } catch (renderError) {
        console.error('Mermaid render方法失败:', renderError);

        // 方法2: 尝试使用parse方法作为备选
        try {
          this.mermaidInstance.parse(diagram); // 验证语法

          // 如果语法正确，使用innerHTML方式渲染
          const tempDiv = document.createElement('div');
          tempDiv.className = 'mermaid';
          tempDiv.textContent = diagram;

          // 让Mermaid处理DOM元素
          this.mermaidInstance.run({ nodes: [tempDiv] });

          svg = tempDiv.innerHTML;
        } catch (parseError) {
          console.error('备选渲染方法也失败:', parseError);
          throw renderError; // 抛出原始错误
        }
      }

      if (typeof svg !== 'string') {
        console.error('Mermaid返回的SVG不是字符串:', typeof svg, svg);
        throw new Error('Mermaid渲染返回了非字符串结果');
      }

      // 包装SVG以便样式控制
      const wrappedSvg = this.wrapSvg(svg, renderOptions);

      return wrappedSvg;
    } catch (error) {
      console.error('Mermaid图表渲染失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // 返回错误信息，但保持文档可读性
      return this.createErrorFallback(diagram, error as Error);
    }
  }

  supportsDiagramType(diagramType: string): boolean {
    const supportedTypes = [
      'flowchart',
      'sequenceDiagram',
      'classDiagram',
      'stateDiagram',
      'entityRelationshipDiagram',
      'userJourney',
      'gantt',
      'pie',
      'quadrantChart',
      'requirementDiagram',
      'gitGraph',
      'mindmap',
      'timeline',
      'zenuml',
      'sankey'
    ];

    return supportedTypes.includes(diagramType.toLowerCase());
  }

  private wrapSvg(svg: string, options: MermaidRenderOptions): string {
    // 添加响应式样式和容器
    return `
      <div class="mermaid-container" style="
        background-color: ${options.backgroundColor};
        font-family: ${options.fontFamily};
        margin: 1rem 0;
        overflow: auto;
        text-align: center;
      ">
        <div class="mermaid-diagram" style="
          display: inline-block;
          max-width: 100%;
        ">
          ${svg}
        </div>
      </div>
    `;
  }

  private createErrorFallback(diagram: string, error: Error): string {
    return `
      <div class="mermaid-error" style="
        border: 1px solid #ff6b6b;
        background-color: #ffeaea;
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9rem;
        color: #d63031;
      ">
        <div style="font-weight: bold; margin-bottom: 0.5rem;">
          ❌ Mermaid图表渲染错误
        </div>
        <div style="margin-bottom: 0.5rem;">
          ${error.message}
        </div>
        <details style="margin-top: 0.5rem;">
          <summary style="cursor: pointer; font-size: 0.8rem;">查看原始代码</summary>
          <pre style="background-color: #f8f9fa; padding: 0.5rem; margin-top: 0.5rem; border-radius: 2px; overflow: auto;">${this.escapeHtml(diagram)}</pre>
        </details>
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
