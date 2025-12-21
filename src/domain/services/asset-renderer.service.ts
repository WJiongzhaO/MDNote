import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { MermaidRenderer } from './markdown-processor.interface';
import type { AssetManager } from './asset-manager.interface';

/**
 * 资源渲染服务 - 负责异步渲染Mermaid图表等资源
 */
export interface AssetRenderer {
  /**
   * 渲染Mermaid图表占位符
   */
  renderMermaidPlaceholder(diagram: string, assetId?: string): string;

  /**
   * 异步渲染所有占位符
   */
  renderAllPlaceholders(container: HTMLElement): Promise<void>;

  /**
   * 渲染单个Mermaid占位符
   */
  renderMermaidPlaceholderAsync(placeholder: HTMLElement): Promise<void>;
}

@injectable()
export class AssetRendererService implements AssetRenderer {
  private mermaidRenderer?: MermaidRenderer;
  private assetManager?: AssetManager;

  constructor() {
    // 延迟注入，避免循环依赖
  }

  /**
   * 设置Mermaid渲染器
   */
  setMermaidRenderer(renderer: MermaidRenderer): void {
    this.mermaidRenderer = renderer;
  }

  /**
   * 设置资源管理器
   */
  setAssetManager(manager: AssetManager): void {
    this.assetManager = manager;
  }

  /**
   * 创建Mermaid图表占位符HTML
   * 使用data属性存储原始代码，避免Promise问题
   */
  renderMermaidPlaceholder(diagram: string, assetId?: string): string {
    const id = assetId || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const encodedDiagram = this.encodeDiagram(diagram);
    
    return `
      <div 
        class="mermaid-asset-placeholder" 
        data-asset-type="mermaid"
        data-asset-id="${id}"
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

  /**
   * 渲染容器中的所有占位符
   */
  async renderAllPlaceholders(container: HTMLElement): Promise<void> {
    const placeholders = container.querySelectorAll('.mermaid-asset-placeholder[data-asset-type="mermaid"]');
    console.log('[AssetRenderer] 找到占位符数量:', placeholders.length);
    
    if (placeholders.length === 0) {
      console.log('[AssetRenderer] 没有找到需要渲染的占位符');
      return;
    }

    if (!this.mermaidRenderer) {
      console.warn('[AssetRenderer] Mermaid渲染器未初始化，尝试延迟初始化...');
      // 尝试延迟获取
      await new Promise(resolve => setTimeout(resolve, 200));
      if (!this.mermaidRenderer) {
        console.error('[AssetRenderer] Mermaid渲染器仍然未初始化');
        // 显示错误信息
        Array.from(placeholders).forEach(placeholder => {
          const diagram = this.decodeDiagram(placeholder.getAttribute('data-diagram') || '');
          this.showError(placeholder as HTMLElement, 'Mermaid渲染器未初始化');
        });
        return;
      }
    }
    
    const renderPromises = Array.from(placeholders).map(placeholder => 
      this.renderMermaidPlaceholderAsync(placeholder as HTMLElement)
    );

    await Promise.allSettled(renderPromises);
    console.log('[AssetRenderer] 所有占位符渲染完成');
  }

  /**
   * 异步渲染单个Mermaid占位符
   */
  async renderMermaidPlaceholderAsync(placeholder: HTMLElement): Promise<void> {
    const diagram = this.decodeDiagram(placeholder.getAttribute('data-diagram') || '');
    const assetId = placeholder.getAttribute('data-asset-id') || '';

    console.log('[AssetRenderer] 开始渲染占位符:', assetId, '代码长度:', diagram.length);

    if (!diagram) {
      console.error('[AssetRenderer] Mermaid代码为空');
      this.showError(placeholder, 'Mermaid代码为空');
      return;
    }

    if (!this.mermaidRenderer) {
      console.error('[AssetRenderer] Mermaid渲染器未初始化');
      this.showError(placeholder, 'Mermaid渲染器未初始化');
      return;
    }

    try {
      console.log('[AssetRenderer] 调用Mermaid渲染器...');
      // 渲染Mermaid图表
      const svg = await this.mermaidRenderer.renderDiagram(diagram, {
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit'
      });

      console.log('[AssetRenderer] Mermaid渲染成功，SVG长度:', svg.length);
      
      // 替换占位符内容
      placeholder.innerHTML = `
        <div class="mermaid-container" style="
          background-color: transparent;
          margin: 0;
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
      
      // 移除占位符类，添加已渲染类
      placeholder.classList.remove('mermaid-asset-placeholder');
      placeholder.classList.add('mermaid-asset-rendered');
      
      console.log('[AssetRenderer] 占位符已替换为渲染结果');

      // 可选：保存渲染结果到资源管理器
      if (assetId && this.assetManager) {
        try {
          await this.assetManager.updateAsset(assetId, {
            renderedContent: svg
          });
        } catch (error) {
          console.warn('保存Mermaid渲染结果失败:', error);
        }
      }
    } catch (error) {
      console.error('Mermaid渲染失败:', error);
      this.showError(placeholder, error instanceof Error ? error.message : '渲染失败');
    }
  }

  /**
   * 显示错误信息
   */
  private showError(placeholder: HTMLElement, message: string): void {
    const diagram = this.decodeDiagram(placeholder.getAttribute('data-diagram') || '');
    
    placeholder.innerHTML = `
      <div class="mermaid-error" style="
        border: 1px solid #ff6b6b;
        background-color: #ffeaea;
        padding: 1rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9rem;
        color: #d63031;
      ">
        <div style="font-weight: bold; margin-bottom: 0.5rem;">
          ❌ Mermaid图表渲染错误
        </div>
        <div style="margin-bottom: 0.5rem;">
          ${this.escapeHtml(message)}
        </div>
        <details style="margin-top: 0.5rem;">
          <summary style="cursor: pointer; font-size: 0.8rem;">查看原始代码</summary>
          <pre style="background-color: #f8f9fa; padding: 0.5rem; margin-top: 0.5rem; border-radius: 2px; overflow: auto;">${this.escapeHtml(diagram)}</pre>
        </details>
      </div>
    `;
  }

  /**
   * 编码Mermaid代码（用于HTML属性）
   */
  private encodeDiagram(diagram: string): string {
    return btoa(encodeURIComponent(diagram));
  }

  /**
   * 解码Mermaid代码
   */
  private decodeDiagram(encoded: string): string {
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      return '';
    }
  }

  /**
   * HTML转义
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

