import { onMounted, nextTick, type Ref } from 'vue';
import { InversifyContainer } from '../../core/container/inversify.container';
import { TYPES } from '../../core/container/container.types';
import { AssetRendererService } from '../../domain/services/asset-renderer.service';

/**
 * 资源渲染器组合式函数
 * 用于在Vue组件中渲染Mermaid图表等资源
 */
export function useAssetRenderer() {
  let assetRenderer: AssetRendererService | null = null;

  /**
   * 初始化资源渲染器
   */
  const initializeRenderer = async () => {
    if (assetRenderer) {
      return assetRenderer;
    }

    try {
      const container = InversifyContainer.getInstance();
      assetRenderer = container.get<AssetRendererService>(AssetRendererService);
      
      // 如果渲染器还没有初始化依赖，等待一下
      if (!assetRenderer) {
        await new Promise(resolve => setTimeout(resolve, 100));
        assetRenderer = container.get<AssetRendererService>(AssetRendererService);
      }
      
      return assetRenderer;
    } catch (error) {
      console.error('初始化资源渲染器失败:', error);
      return null;
    }
  };

  /**
   * 渲染容器中的所有占位符
   */
  const renderPlaceholders = async (container: HTMLElement | Ref<HTMLElement | undefined>) => {
    const renderer = await initializeRenderer();
    
    if (!renderer) {
      console.warn('资源渲染器未初始化，尝试直接渲染...');
      // 如果渲染器未初始化，尝试直接使用Mermaid渲染
      await renderPlaceholdersDirectly(container);
      return;
    }

    const element = container instanceof HTMLElement 
      ? container 
      : container.value;

    if (!element) {
      console.warn('容器元素不存在');
      return;
    }

    console.log('开始渲染占位符，容器:', element);
    const placeholders = element.querySelectorAll('.mermaid-asset-placeholder[data-asset-type="mermaid"]');
    console.log('找到占位符数量:', placeholders.length);
    
    await renderer.renderAllPlaceholders(element);
  };

  /**
   * 直接渲染占位符（备用方案）
   */
  const renderPlaceholdersDirectly = async (container: HTMLElement | Ref<HTMLElement | undefined>) => {
    const element = container instanceof HTMLElement 
      ? container 
      : container.value;

    if (!element) {
      return;
    }

    const placeholders = element.querySelectorAll('.mermaid-asset-placeholder[data-asset-type="mermaid"]');
    console.log('直接渲染模式：找到占位符数量:', placeholders.length);

    // 尝试从容器获取MermaidRenderer
    try {
      const container = InversifyContainer.getInstance();
      const mermaidRenderer = container.get(TYPES.MermaidRenderer);
      
      if (mermaidRenderer) {
        for (const placeholder of Array.from(placeholders)) {
          const diagram = decodeDiagram(placeholder.getAttribute('data-diagram') || '');
          if (diagram && mermaidRenderer.renderDiagram) {
            try {
              const svg = await mermaidRenderer.renderDiagram(diagram, {
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: 'inherit'
              });
              
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
              
              placeholder.classList.remove('mermaid-asset-placeholder');
              placeholder.classList.add('mermaid-asset-rendered');
            } catch (error) {
              console.error('直接渲染Mermaid失败:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('直接渲染失败:', error);
    }
  };

  /**
   * 解码Mermaid代码
   */
  const decodeDiagram = (encoded: string): string => {
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      return '';
    }
  };

  /**
   * 在组件挂载后自动渲染占位符
   */
  const useAutoRender = (containerRef: Ref<HTMLElement | undefined>) => {
    onMounted(async () => {
      await nextTick();
      
      // 延迟一点时间确保DOM完全渲染
      setTimeout(async () => {
        await renderPlaceholders(containerRef);
      }, 100);
    });
  };

  /**
   * 手动触发渲染（用于内容更新后）
   */
  const triggerRender = async (containerRef: Ref<HTMLElement | undefined>) => {
    await nextTick();
    setTimeout(async () => {
      await renderPlaceholders(containerRef);
    }, 100);
  };

  return {
    renderPlaceholders,
    useAutoRender,
    triggerRender,
    initializeRenderer
  };
}

