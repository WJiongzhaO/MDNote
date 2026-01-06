/**
 * Word 导出工具函数
 * 用于处理 Word 导出中的图片、公式等资源
 */

import katex from 'katex';
// html2canvas 使用动态导入，避免构建时错误

/**
 * 图片资源接口
 */
export interface ImageResource {
  id: string; // 关系 ID (rId1, rId2, ...)
  fileName: string; // 文件名 (image1.png, formula1.png, ...)
  mimeType: string; // MIME 类型 (image/png, image/jpeg, ...)
  data: ArrayBuffer | Uint8Array; // 图片数据
  width?: number; // 宽度（像素）
  height?: number; // 高度（像素）
}

/**
 * 读取图片尺寸（仅浏览器环境）
 */
export async function getImageDimensions(src: string): Promise<{ width: number; height: number } | null> {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * 将 KaTeX 公式渲染为 SVG，然后转换为 PNG 数据
 * 注意：在浏览器环境中，SVG 转 PNG 需要使用 Canvas API
 */
export async function convertKaTeXToImage(
  latex: string,
  displayMode: boolean = false
): Promise<ImageResource | null> {
  try {
    // 1. 使用 KaTeX 渲染为 HTML
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: displayMode,
      output: 'html'
    });

    // 2. 在浏览器环境中，将 HTML 转换为图片
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return await convertHTMLToImage(html, displayMode);
    }

    // 3. 在 Node.js 环境中，可以使用 puppeteer 或其他工具
    // 这里暂时返回 null，后续可以扩展
    console.warn('KaTeX to image conversion in Node.js not yet implemented');
    return null;
  } catch (error) {
    console.error('Error converting KaTeX to image:', error);
    return null;
  }
}

/**
 * 将 HTML（KaTeX 渲染结果）转换为图片
 */
async function convertHTMLToImage(html: string, displayMode: boolean): Promise<ImageResource | null> {
  return new Promise((resolve) => {
    try {
      // 创建一个临时容器
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = displayMode ? '800px' : 'auto';
      container.style.padding = displayMode ? '20px' : '5px';
      container.style.backgroundColor = 'white';
      container.innerHTML = html;

      // 添加 KaTeX CSS（使用内联样式，避免 CSP 问题）
      const katexStyleId = 'katex-styles-inline';
      let katexStyleLoaded = false;
      
      if (!document.getElementById(katexStyleId)) {
        // 尝试使用内联样式（从 export-utils 获取）
        import('./export-utils').then(({ getKaTeXInlineStyles }) => {
          return getKaTeXInlineStyles();
        }).then((katexStyles) => {
          const styleElement = document.createElement('style');
          styleElement.id = katexStyleId;
          // 如果获取到内联样式，使用它；否则使用 CDN（可能被 CSP 阻止）
          if (katexStyles && katexStyles.includes('<style>')) {
            // 提取 style 标签内容
            const styleContent = katexStyles.replace(/<style[^>]*>|<\/style>/g, '');
            styleElement.textContent = styleContent;
            document.head.appendChild(styleElement);
            katexStyleLoaded = true;
            console.log('[Word Export] KaTeX CSS loaded as inline style');
          } else {
            // 回退到 CDN（可能被 CSP 阻止，但至少尝试）
            const link = document.createElement('link');
            link.id = katexStyleId;
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
            link.onload = () => {
              katexStyleLoaded = true;
              console.log('[Word Export] KaTeX CSS loaded from CDN');
            };
            link.onerror = () => {
              console.warn('[Word Export] Failed to load KaTeX CSS from CDN');
            };
            document.head.appendChild(link);
          }
        }).catch((error) => {
          console.warn('[Word Export] Failed to import/get KaTeX inline styles:', error);
          // 如果导入失败，直接使用 CDN
          const link = document.createElement('link');
          link.id = katexStyleId;
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
          link.onload = () => {
            katexStyleLoaded = true;
            console.log('[Word Export] KaTeX CSS loaded from CDN (fallback)');
          };
          link.onerror = () => {
            console.warn('[Word Export] Failed to load KaTeX CSS from CDN (fallback)');
          };
          document.head.appendChild(link);
        });
      } else {
        // CSS 已经存在
        katexStyleLoaded = true;
        console.log('[Word Export] KaTeX CSS already exists');
      }

      document.body.appendChild(container);

      // 等待渲染完成（确保 KaTeX CSS 已加载）
      // 使用 requestAnimationFrame 确保 DOM 已更新
      const waitForRender = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // 检查 CSS 是否已加载（如果使用 link，需要等待 onload）
            const checkAndConvert = () => {
              try {
                // KaTeX 渲染的 HTML 通常不包含 SVG，而是包含 span 元素和样式
                // 我们需要直接转换整个容器元素
                console.log('[Word Export] 开始转换 KaTeX 容器为图片');
                convertKaTeXElementToImage(container, displayMode)
                  .then((imageResource) => {
                    document.body.removeChild(container);
                    if (imageResource) {
                      console.log(`[Word Export] KaTeX 转换成功: ${imageResource.width}x${imageResource.height}px`);
                    } else {
                      console.warn('[Word Export] KaTeX 转换返回 null');
                    }
                    resolve(imageResource);
                  })
                  .catch((error) => {
                    console.error('[Word Export] Error converting KaTeX element to image:', error);
                    document.body.removeChild(container);
                    resolve(null);
                  });
              } catch (error) {
                console.error('[Word Export] Error in image conversion:', error);
                document.body.removeChild(container);
                resolve(null);
              }
            };
            
            // 如果 CSS 已加载，立即转换；否则等待
            if (katexStyleLoaded || document.getElementById(katexStyleId)) {
              setTimeout(checkAndConvert, 300); // 给 CSS 一些时间应用
            } else {
              // 等待 CSS 加载（最多等待 2 秒）
              let attempts = 0;
              const maxAttempts = 20;
              const checkInterval = setInterval(() => {
                attempts++;
                if (document.getElementById(katexStyleId) || attempts >= maxAttempts) {
                  clearInterval(checkInterval);
                  setTimeout(checkAndConvert, 300);
                }
              }, 100);
            }
          });
        });
      };
      
      waitForRender();
    } catch (error) {
      console.error('Error creating container:', error);
      resolve(null);
    }
  });
}


/**
 * 将 KaTeX DOM 元素转换为图片（使用 Canvas）
 * 这是一个专门用于 KaTeX 元素的转换函数
 */
export async function convertKaTeXElementToImage(element: HTMLElement, displayMode: boolean): Promise<ImageResource | null> {
  return new Promise((resolve) => {
    try {
      // 获取元素的实际尺寸（不强制最小值，使用实际尺寸）
      const rect = element.getBoundingClientRect();
      // 对于行内公式，使用实际宽度；对于块级公式，确保有足够宽度
      let width = rect.width;
      let height = rect.height;
      
      // 如果尺寸为0或无效，使用合理的最小值
      if (width <= 0) {
        width = displayMode ? 400 : 100;
      }
      if (height <= 0) {
        height = displayMode ? 100 : 30;
      }
      
      console.log(`[Word Export] KaTeX 元素尺寸: ${width}x${height}px, displayMode: ${displayMode}`);

      // 使用 html2canvas 库转换（动态导入）
      (async () => {
        try {
          const html2canvas = (await import('html2canvas')).default;
          const scale = 2; // 提高分辨率
          
          console.log(`[Word Export] Using html2canvas for KaTeX conversion, element size: ${width}x${height}px, scale: ${scale}`);
          
          // 对于块级公式，确保容器有足够的宽度和正确的样式
          const originalDisplay = element.style.display;
          const originalWidth = element.style.width;
          const originalMaxWidth = element.style.maxWidth;
          const originalMargin = element.style.margin;
          const originalTextAlign = element.style.textAlign;
          const originalVerticalAlign = element.style.verticalAlign;
          
          if (displayMode) {
            element.style.display = 'block';
            element.style.width = 'auto';
            element.style.maxWidth = '100%';
            element.style.margin = '0 auto';
            element.style.textAlign = 'center';
          } else {
            element.style.display = 'inline-block';
            element.style.width = 'auto';
            element.style.verticalAlign = 'middle';
          }
          
          // 等待样式应用
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // 重新获取尺寸（样式应用后）
          const newRect = element.getBoundingClientRect();
          if (newRect.width > 0) width = newRect.width;
          if (newRect.height > 0) height = newRect.height;
          
          html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: scale,
            useCORS: true,
            logging: false,
            allowTaint: false,
            removeContainer: false
              }).then((canvas: HTMLCanvasElement) => {
                // 恢复原始样式
                element.style.display = originalDisplay;
                element.style.width = originalWidth;
                element.style.maxWidth = originalMaxWidth;
                element.style.margin = originalMargin;
                element.style.textAlign = originalTextAlign;
                element.style.verticalAlign = originalVerticalAlign;
                
                console.log(`[Word Export] html2canvas 转换完成: ${canvas.width}x${canvas.height}px`);
                canvas.toBlob((blob) => {
                  if (!blob) {
                    resolve(null);
                    return;
                  }
                  blob.arrayBuffer().then((buffer) => {
                    const id = `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    // html2canvas 使用 scale=2，所以实际尺寸需要除以2
                    const actualWidth = Math.round(canvas.width / 2);
                    const actualHeight = Math.round(canvas.height / 2);
                    console.log(`[Word Export] KaTeX image created (html2canvas): ${actualWidth}x${actualHeight}px (canvas: ${canvas.width}x${canvas.height}px)`);
                    resolve({
                      id: id,
                      fileName: `${id}.png`,
                      mimeType: 'image/png',
                      data: buffer,
                      width: actualWidth,
                      height: actualHeight
                    });
                  });
                }, 'image/png');
              }).catch((error: Error) => {
            console.warn('[Word Export] html2canvas conversion failed:', error);
            // 降级方案：尝试从文本内容重新渲染
            tryAlternativeMethod();
          });
        } catch (importError) {
          console.warn('[Word Export] Failed to import html2canvas:', importError);
          console.warn('[Word Export] Please ensure html2canvas is installed: npm install html2canvas');
          tryAlternativeMethod();
        }
      })();
      
      function tryAlternativeMethod() {
        // 如果没有 html2canvas，尝试从文本内容重新渲染为 SVG
        // 获取 KaTeX 元素的文本内容（可能包含 LaTeX）
        const textContent = element.textContent || '';
        const ariaLabel = element.getAttribute('aria-label');
        
        // 如果 aria-label 包含 LaTeX 代码，使用它
        let latexCode: string | null = null;
        if (ariaLabel && ariaLabel.startsWith('KaTeX:')) {
          latexCode = ariaLabel.substring(6).trim();
        } else if (textContent) {
          // 尝试从文本内容推断（不准确，但总比没有好）
          latexCode = textContent.trim();
        }

        if (latexCode) {
          // 重新渲染 KaTeX 为 HTML，然后转换为图片
          (async () => {
            try {
              // 动态导入 katex（如果还没有加载）
              const katexModule = await import('katex');
              const katex = katexModule.default;
              
              if (katex) {
                // 重新渲染 KaTeX
                const htmlString = katex.renderToString(latexCode, {
                  throwOnError: false,
                  displayMode: displayMode,
                  output: 'html'
                });
                
                // 创建临时容器来渲染
                const tempContainer = document.createElement('div');
                tempContainer.style.position = 'absolute';
                tempContainer.style.left = '-9999px';
                tempContainer.style.top = '-9999px';
                tempContainer.style.backgroundColor = 'white';
                tempContainer.innerHTML = htmlString;
                
                // 添加 KaTeX CSS
                if (!document.getElementById('katex-styles-inline')) {
                  const link = document.createElement('link');
                  link.id = 'katex-styles-inline';
                  link.rel = 'stylesheet';
                  link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
                  document.head.appendChild(link);
                }
                
                document.body.appendChild(tempContainer);
                
                // 等待渲染
                setTimeout(async () => {
                  // KaTeX 渲染的 HTML 不包含 SVG，需要直接转换整个元素
                  // 使用 html2canvas 转换（动态导入）
                  try {
                    const html2canvas = (await import('html2canvas')).default;
                    html2canvas(tempContainer, {
                      backgroundColor: '#ffffff',
                      scale: 2,
                      useCORS: true,
                      logging: false
                    }).then((canvas: HTMLCanvasElement) => {
                      document.body.removeChild(tempContainer);
                      canvas.toBlob((blob) => {
                        if (!blob) {
                          resolve(null);
                          return;
                        }
                        blob.arrayBuffer().then((buffer) => {
                          const id = `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                          // html2canvas 使用 scale=2，所以实际尺寸需要除以2
                          const actualWidth = Math.round(canvas.width / 2);
                          const actualHeight = Math.round(canvas.height / 2);
                          console.log(`[Word Export] KaTeX image created (re-render): ${actualWidth}x${actualHeight}px (canvas: ${canvas.width}x${canvas.height}px)`);
                          resolve({
                            id: id,
                            fileName: `${id}.png`,
                            mimeType: 'image/png',
                            data: buffer,
                            width: actualWidth,
                            height: actualHeight
                          });
                        });
                      }, 'image/png');
                    }).catch(() => {
                      document.body.removeChild(tempContainer);
                      resolve(null);
                    });
                  } catch (importError) {
                    console.warn('[Word Export] Failed to import html2canvas for re-render:', importError);
                    document.body.removeChild(tempContainer);
                    resolve(null);
                  }
                }, 300);
                return;
              }
            } catch (error) {
              console.warn('Failed to re-render KaTeX:', error);
            }
            
            // 如果所有方法都失败，返回 null
            console.warn('KaTeX element conversion failed: no html2canvas and cannot extract LaTeX');
            resolve(null);
          })();
        } else {
          // 如果所有方法都失败，返回 null
          console.warn('KaTeX element conversion failed: cannot extract LaTeX code');
          resolve(null);
        }
      }
    } catch (error) {
      console.error('Error converting KaTeX element to image:', error);
      resolve(null);
    }
  });
}

/**
 * 将 base64 图片数据转换为 ImageResource
 */
export function convertBase64ToImageResource(
  base64Data: string,
  imageId: string
): ImageResource | null {
  try {
    // 提取 MIME 类型和数据
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return null;
    }

    const mimeType = matches[1];
    const base64String = matches[2];

    // 将 base64 字符串转换为 ArrayBuffer
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 确定文件扩展名
    const ext = mimeType.split('/')[1] || 'png';
    const fileName = `${imageId}.${ext}`;

    return {
      id: imageId,
      fileName: fileName,
      mimeType: mimeType,
      data: bytes.buffer
    };
  } catch (error) {
    console.error('Error converting base64 to image resource:', error);
    return null;
  }
}

/**
 * 从 KaTeX HTML 元素中提取 LaTeX 代码
 */
export function extractLatexFromKaTeXElement(element: Element): string | null {
  try {
    // 方法1: 从 data-latex 属性提取（如果 KaTeX 添加了此属性）
    const latexAttr = element.getAttribute('data-latex');
    if (latexAttr) {
      return latexAttr;
    }

    // 方法2: 从 aria-label 提取（KaTeX 通常会添加此属性）
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      // aria-label 格式通常是 "KaTeX: latex code"
      if (ariaLabel.startsWith('KaTeX:')) {
        return ariaLabel.substring(6).trim();
      }
      return ariaLabel;
    }

    // 方法3: 从 KaTeX 的注释节点中提取（KaTeX 会在注释中保存原始 LaTeX）
    const commentNodes: Comment[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_COMMENT,
      null
    );
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.COMMENT_NODE) {
        const comment = node as Comment;
        const text = comment.textContent || '';
        // KaTeX 注释格式可能是 "KaTeX: latex code"
        if (text.trim().startsWith('KaTeX:')) {
          return text.trim().substring(6).trim();
        }
      }
    }

    // 方法4: 尝试从 KaTeX 的 .katex-mathml 元素中提取（如果存在）
    const mathmlElement = element.querySelector('.katex-mathml annotation[encoding="application/x-tex"]');
    if (mathmlElement) {
      const texContent = mathmlElement.textContent || '';
      if (texContent.trim()) {
        return texContent.trim();
      }
    }

    // 方法5: 如果以上方法都失败，尝试从文本内容中提取（不准确，但总比没有好）
    // 注意：这可能会提取到渲染后的文本，而不是原始 LaTeX
    const textContent = element.textContent || '';
    const trimmed = textContent.trim();
    
    // 如果文本内容看起来像 LaTeX（包含常见的 LaTeX 符号），返回它
    if (trimmed && (trimmed.includes('\\') || trimmed.includes('^') || trimmed.includes('_'))) {
      return trimmed;
    }

    return null;
  } catch (error) {
    console.error('Error extracting LaTeX from element:', error);
    return null;
  }
}

/**
 * 从 Mermaid 占位符元素中提取 Mermaid 代码
 */
export function extractMermaidFromPlaceholder(element: Element): string | null {
  try {
    // 从 data-diagram 属性提取（base64编码）
    const encodedDiagram = element.getAttribute('data-diagram');
    if (encodedDiagram) {
      try {
        return decodeURIComponent(atob(encodedDiagram));
      } catch (error) {
        console.warn('Failed to decode Mermaid diagram:', error);
      }
    }

    // 如果占位符已经被渲染，尝试从 SVG 中提取
    const svgElement = element.querySelector('svg');
    if (svgElement) {
      // 已渲染的图表，无法提取原始代码，返回 null
      return null;
    }

    return null;
  } catch (error) {
    console.error('Error extracting Mermaid from placeholder:', error);
    return null;
  }
}

/**
 * 从已渲染的 Mermaid 元素中获取 SVG
 */
export function extractSVGFromMermaidElement(element: Element): string | null {
  try {
    // 查找 SVG 元素
    const svgElement = element.querySelector('svg');
    if (svgElement) {
      const serializer = new XMLSerializer();
      return serializer.serializeToString(svgElement);
    }
    return null;
  } catch (error) {
    console.error('Error extracting SVG from Mermaid element:', error);
    return null;
  }
}

/**
 * 将 Mermaid SVG 转换为图片资源
 * @param svgString SVG 字符串
 * @param diagramCode 原始 Mermaid 代码（用于缓存 key）
 */
export async function convertMermaidSVGToImage(
  svgString: string,
  diagramCode?: string
): Promise<ImageResource | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('Mermaid SVG to image conversion requires browser environment');
    return null;
  }

  try {
    // 解析 SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg') as SVGElement;
    
    if (!svgElement) {
      console.error('Invalid SVG string');
      return null;
    }

    // 获取 SVG 尺寸
    const width = parseInt(svgElement.getAttribute('width') || '800', 10);
    const height = parseInt(svgElement.getAttribute('height') || '600', 10);

    // 转换为图片（使用 SVG 字符串直接转换，避免 blob URL）
    return await convertSVGToImage(svgElement, false, width, height);
  } catch (error) {
    console.error('Error converting Mermaid SVG to image:', error);
    return null;
  }
}

/**
 * 将 SVG 元素转换为图片（支持自定义尺寸）
 */
async function convertSVGToImage(
  svg: SVGElement,
  displayMode: boolean,
  width?: number,
  height?: number
): Promise<ImageResource | null> {
  return new Promise((resolve) => {
    try {
      // 获取 SVG 的 XML 字符串
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);

      // 创建图片对象
      const img = new Image();
      
      // 使用 data URL 而不是 blob URL，避免 CSP 问题
      // 将 SVG 字符串编码为 base64 data URL
      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
      const url = `data:image/svg+xml;base64,${svgBase64}`;

      img.onload = () => {
        try {
          // 创建 Canvas
          const canvas = document.createElement('canvas');
          const scale = 2; // 提高分辨率
          
          // 确定实际尺寸（优先使用传入的尺寸，否则使用图片的自然尺寸）
          const actualWidth = width || img.naturalWidth || img.width;
          const actualHeight = height || img.naturalHeight || img.height;
          
          // Canvas 尺寸（用于高分辨率渲染）
          const canvasWidth = actualWidth * scale;
          const canvasHeight = actualHeight * scale;
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          // 设置白色背景
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // 绘制图片（保持宽高比）
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

          // 转换为 PNG
          canvas.toBlob((blob) => {
            // data URL 不需要 revoke
            if (!blob) {
              resolve(null);
              return;
            }

            blob.arrayBuffer().then((buffer) => {
              // 根据 displayMode 决定 ID 前缀
              const idPrefix = displayMode ? 'formula' : 'mermaid';
              const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              // 保存实际像素尺寸（不是缩放后的canvas尺寸）
              console.log(`[Word Export] ${idPrefix} image created: ${actualWidth}x${actualHeight}px (canvas: ${canvasWidth}x${canvasHeight}px, scale: ${scale})`);
              resolve({
                id: id,
                fileName: `${id}.png`,
                mimeType: 'image/png',
                data: buffer,
                width: actualWidth,
                height: actualHeight
              });
            });
          }, 'image/png');
        } catch (error) {
          console.error('Error converting SVG to canvas:', error);
          resolve(null);
        }
      };

      img.onerror = () => {
        // data URL 不需要 revoke
        resolve(null);
      };

      img.src = url;
    } catch (error) {
      console.error('Error in SVG conversion:', error);
      resolve(null);
    }
  });
}

