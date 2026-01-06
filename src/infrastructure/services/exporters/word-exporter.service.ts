import { injectable, inject } from 'inversify';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { TYPES } from '../../../core/container/container.types';
import type { DocumentExportService, ExportOptions, ExportResult } from '../../../domain/services/document-export.interface';
import { ExportFormat } from '../../../domain/services/document-export.interface';
import type { ExtensibleMarkdownProcessor } from '../../../domain/services/extensible-markdown-processor.domain.service';
import { processImagesInHTML, convertImageToBase64 } from './export-utils';
import {
  convertKaTeXToImage,
  convertKaTeXElementToImage,
  convertBase64ToImageResource,
  extractLatexFromKaTeXElement,
  extractMermaidFromPlaceholder,
  extractSVGFromMermaidElement,
  convertMermaidSVGToImage,
  getImageDimensions,
  type ImageResource
} from './word-export-utils';

// 动态导入 JSDOM，只在 Node.js 环境中使用
let JSDOM: any;
if (typeof window === 'undefined') {
  // Node.js 环境
  JSDOM = require('jsdom').JSDOM;
}

/**
 * Word导出器
 * 将Markdown文档导出为.docx格式
 * 
 * 注意：这是一个简化实现，使用基础的docx格式
 * 完整实现建议使用mammoth.js或html-docx-js库进行HTML到Word的转换
 */
@injectable()
export class WordExporter implements DocumentExportService {
  private imageResources: Map<string, ImageResource> = new Map();
  private relationshipCounter = 1;
  private mermaidRenderer: any = null;

  constructor(
    @inject(TYPES.ExtensibleMarkdownProcessor)
    private readonly markdownProcessor: ExtensibleMarkdownProcessor
  ) {
    // 延迟加载 Mermaid 渲染器（仅在浏览器环境中）
    if (typeof window !== 'undefined') {
      this.initializeMermaidRenderer();
    }
  }

  /**
   * 初始化 Mermaid 渲染器
   */
  private async initializeMermaidRenderer(): Promise<void> {
    try {
      const { InversifyContainer } = await import('../../../core/container/inversify.container');
      const container = InversifyContainer.getInstance();
      
      if (container && container.isBound(TYPES.MermaidRenderer)) {
        this.mermaidRenderer = container.get(TYPES.MermaidRenderer);
        if (this.mermaidRenderer && typeof this.mermaidRenderer.initialize === 'function') {
          await this.mermaidRenderer.initialize();
        }
      }
    } catch (error) {
      console.warn('Failed to initialize Mermaid renderer for Word export:', error);
    }
  }

  supportsFormat(format: ExportFormat): boolean {
    return format === ExportFormat.WORD;
  }

  async export(options: ExportOptions): Promise<ExportResult> {
    const { title, content, documentId, variables = {} } = options;

    // 重置状态
    this.imageResources.clear();
    this.relationshipCounter = 1;

    // 1. 处理Markdown内容（包括片段引用、变量替换等）
    let html = await this.markdownProcessor.processMarkdown(content, variables);

    // 2. 处理图片路径（转换为 base64）
    if (documentId) {
      html = await processImagesInHTML(html, documentId);
    }

    // 3. 将HTML转换为Word XML格式，并收集所有图片和公式
    let wordXml: string;
    let documentElement: Element | HTMLElement;
    
    if (typeof window === 'undefined' && JSDOM) {
      // Node.js 环境：使用 JSDOM
      const dom = new JSDOM(html);
      documentElement = dom.window.document.body;
    } else {
      // 浏览器环境：使用 DOM API
      const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
      if (tempDiv) {
        tempDiv.innerHTML = html;
        documentElement = tempDiv;
      } else {
        // 降级方案：简单文本提取
        const textContent = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        wordXml = this.createWordXML(title, textContent);
        const docxBuffer = await this.createDocxFromXML(wordXml);
        return {
          buffer: docxBuffer,
          extension: 'docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          filename: this.sanitizeFilename(title) + '.docx'
        };
      }
    }

    // 4. 处理图片和公式，转换为图片资源
    await this.processImagesAndFormulas(documentElement, documentId);

    // 5. 生成 Word XML
    wordXml = this.convertHTMLElementToWordXML(title, documentElement as HTMLElement);

    // 6. 创建docx文件（包含图片）
    const docxBuffer = await this.createDocxFromXML(wordXml);

    // 7. 生成文件名
    const filename = this.sanitizeFilename(title) + '.docx';

    return {
      buffer: docxBuffer,
      extension: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename
    };
  }

  /**
   * 处理 HTML 中的图片、公式和 Mermaid 图表，转换为图片资源
   */
  private async processImagesAndFormulas(element: Element | HTMLElement, documentId?: string): Promise<void> {
    // 确保 Mermaid 渲染器已初始化
    if (!this.mermaidRenderer && typeof window !== 'undefined') {
      await this.initializeMermaidRenderer();
    }

    // 处理所有图片
    const images = element.querySelectorAll('img');
    for (const img of Array.from(images)) {
      const src = img.getAttribute('src') || '';
      if (src && src.startsWith('data:')) {
        // base64 图片
        const imageId = `rId${this.relationshipCounter++}`;
        const imageResource = convertBase64ToImageResource(src, imageId);
        if (imageResource) {
          imageResource.id = imageId;
          // 获取图片的真实尺寸
          await this.getImageDimensions(img as HTMLImageElement, imageResource);
          // 使用 src 作为 key，方便后续查找
          this.imageResources.set(src, imageResource);
          img.setAttribute('data-word-image-id', imageId);
        }
      }
    }

    // 处理所有 KaTeX 公式（包括行内和块级）
    // 注意：行内公式使用 .katex，块级公式使用 .katex-display
    const katexElements = element.querySelectorAll('.katex, .katex-display');
    console.log(`[Word Export] 找到 ${katexElements.length} 个 KaTeX 公式元素`);
    
    // 去重：避免同一个公式被处理多次（可能因为DOM结构导致）
    const processedFormulas = new Set<string>();
    
    for (const katexEl of Array.from(katexElements)) {
      // 检查是否是父元素（避免处理嵌套的 KaTeX 元素）
      const isParent = !katexEl.parentElement?.classList.contains('katex') && 
                       !katexEl.parentElement?.classList.contains('katex-display');
      
      if (!isParent) {
        console.log(`[Word Export] 跳过嵌套的 KaTeX 元素`);
        continue;
      }
      
      const latex = extractLatexFromKaTeXElement(katexEl);
      console.log(`[Word Export] 提取 LaTeX: ${latex ? latex.substring(0, 50) : 'null'}`);
      
      if (latex) {
        // 使用 latex 作为唯一标识，避免重复处理
        const formulaKey = `${latex}_${katexEl.classList.contains('katex-display') ? 'display' : 'inline'}`;
        if (processedFormulas.has(formulaKey)) {
          console.log(`[Word Export] 跳过已处理的公式: ${latex.substring(0, 30)}`);
          continue;
        }
        processedFormulas.add(formulaKey);
        
        const isDisplayMode = katexEl.classList.contains('katex-display');
        console.log(`[Word Export] 开始转换 KaTeX 公式为图片 (displayMode: ${isDisplayMode}, latex: ${latex.substring(0, 30)})`);
        
        // 对于行内公式，直接使用元素本身进行转换（更准确）
        let imageResource: ImageResource | null = null;
        if (!isDisplayMode && typeof window !== 'undefined') {
          // 行内公式：直接转换元素
          console.log('[Word Export] 行内公式：直接转换元素');
          imageResource = await convertKaTeXElementToImage(katexEl as HTMLElement, false);
        } else {
          // 块级公式或浏览器环境外：使用 LaTeX 代码重新渲染
          imageResource = await convertKaTeXToImage(latex, isDisplayMode);
        }
        
        if (imageResource) {
          const imageId = `rId${this.relationshipCounter++}`;
          imageResource.id = imageId;
          // 使用 latex 作为 key（同时考虑 displayMode）
          this.imageResources.set(formulaKey, imageResource);
          katexEl.setAttribute('data-word-image-id', imageId);
          console.log(`[Word Export] KaTeX 公式转换成功，ID: ${imageId}, 尺寸: ${imageResource.width}x${imageResource.height}px`);
        } else {
          console.warn(`[Word Export] KaTeX 公式转换失败: ${latex.substring(0, 50)}`);
        }
      } else {
        console.warn(`[Word Export] 无法从 KaTeX 元素提取 LaTeX 代码`);
        // 尝试从元素本身获取更多信息用于调试
        console.warn(`[Word Export] 元素信息:`, {
          classList: Array.from(katexEl.classList),
          ariaLabel: katexEl.getAttribute('aria-label'),
          textContent: katexEl.textContent?.substring(0, 100),
          tagName: katexEl.tagName
        });
      }
    }

    // 处理所有 Mermaid 图表占位符
    const mermaidPlaceholders = element.querySelectorAll('.mermaid-asset-placeholder, .mermaid-asset-rendered, .mermaid-container');
    console.log(`[Word Export] 找到 ${mermaidPlaceholders.length} 个 Mermaid 图表占位符`);
    for (const placeholder of Array.from(mermaidPlaceholders)) {
      // 尝试从已渲染的 SVG 中提取
      let svgString = extractSVGFromMermaidElement(placeholder);
      console.log(`[Word Export] 从占位符提取 SVG: ${svgString ? '成功' : '失败'}`);
      
      // 如果没有已渲染的 SVG，尝试从占位符中提取代码并渲染
      if (!svgString) {
        const diagramCode = extractMermaidFromPlaceholder(placeholder);
        console.log(`[Word Export] 提取 Mermaid 代码: ${diagramCode ? '成功' : '失败'}`);
        if (diagramCode && this.mermaidRenderer) {
          try {
            console.log(`[Word Export] 开始渲染 Mermaid 图表`);
            // 渲染 Mermaid 图表
            svgString = await this.mermaidRenderer.renderDiagram(diagramCode, {
              theme: 'default',
              securityLevel: 'loose',
              fontFamily: 'inherit'
            });
            console.log(`[Word Export] Mermaid 图表渲染成功，SVG 长度: ${svgString ? svgString.length : 0}`);
          } catch (error) {
            console.warn('[Word Export] Failed to render Mermaid diagram for export:', error);
            continue;
          }
        } else {
          console.warn(`[Word Export] 无法渲染 Mermaid: diagramCode=${!!diagramCode}, renderer=${!!this.mermaidRenderer}`);
        }
      }

      // 将 SVG 转换为图片
      if (svgString) {
        const diagramCode = extractMermaidFromPlaceholder(placeholder) || '';
        console.log(`[Word Export] 开始将 Mermaid SVG 转换为图片`);
        const imageResource = await convertMermaidSVGToImage(svgString, diagramCode);
        if (imageResource) {
          const imageId = `rId${this.relationshipCounter++}`;
          imageResource.id = imageId;
          // 使用占位符的唯一标识作为 key
          const placeholderId = placeholder.getAttribute('data-asset-id') || 
                                placeholder.getAttribute('id') || 
                                `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          this.imageResources.set(placeholderId, imageResource);
          placeholder.setAttribute('data-word-image-id', imageId);
          console.log(`[Word Export] Mermaid 图表转换成功，ID: ${imageId}, placeholderId: ${placeholderId}`);
        } else {
          console.warn(`[Word Export] Mermaid SVG 转图片失败`);
        }
      } else {
        console.warn(`[Word Export] 没有 SVG 可以转换`);
      }
    }
  }

  /**
   * 从HTML元素提取文本内容（浏览器环境）
   */
  private extractTextFromHTMLElement(element: HTMLElement): string {
    return this.extractTextFromHTML(element as any);
  }

  /**
   * 获取图片的真实尺寸
   */
  private async getImageDimensions(img: HTMLImageElement, imageResource: ImageResource): Promise<void> {
    // 方法1: 从HTML属性获取
    const attrWidth = parseInt(img.getAttribute('width') || '', 10);
    const attrHeight = parseInt(img.getAttribute('height') || '', 10);
    if (!isNaN(attrWidth) && attrWidth > 0 && !isNaN(attrHeight) && attrHeight > 0) {
      imageResource.width = attrWidth;
      imageResource.height = attrHeight;
      console.log(`[Word Export] Image dimensions from attributes: ${attrWidth}x${attrHeight}`);
      return;
    }

    // 方法2: 从DOM元素的实际尺寸获取（naturalWidth/naturalHeight）
    if (img.naturalWidth && img.naturalHeight) {
      imageResource.width = img.naturalWidth;
      imageResource.height = img.naturalHeight;
      console.log(`[Word Export] Image dimensions from natural size: ${img.naturalWidth}x${img.naturalHeight}`);
      return;
    }

    // 方法3: 从图片数据加载获取（异步，仅当需要时）
    if (imageResource.data && typeof window !== 'undefined') {
      return new Promise((resolve) => {
        const imgElement = new Image();
        const blob = new Blob([imageResource.data], { type: imageResource.mimeType });
        const url = URL.createObjectURL(blob);
        
        imgElement.onload = () => {
          imageResource.width = imgElement.naturalWidth;
          imageResource.height = imgElement.naturalHeight;
          console.log(`[Word Export] Image dimensions from data: ${imgElement.naturalWidth}x${imgElement.naturalHeight}`);
          URL.revokeObjectURL(url);
          resolve();
        };
        
        imgElement.onerror = () => {
          URL.revokeObjectURL(url);
          // 使用默认值（保持合理比例）
          if (!imageResource.width) imageResource.width = 400;
          if (!imageResource.height) imageResource.height = 300;
          console.warn(`[Word Export] Failed to load image, using defaults: ${imageResource.width}x${imageResource.height}`);
          resolve();
        };
        
        imgElement.src = url;
      });
    }

    // 方法4: 使用默认值（保持合理比例）
    if (!imageResource.width) imageResource.width = 400;
    if (!imageResource.height) imageResource.height = 300;
    console.log(`[Word Export] Using default image dimensions: ${imageResource.width}x${imageResource.height}`);
  }

  /**
   * 将 HTML 元素转换为 Word XML（JSDOM Element）
   */
  private convertHTMLToWordXML(title: string, body: Element): string {
    let paragraphsXml = '';

    // 添加标题
    paragraphsXml += `
      <w:p>
        <w:pPr>
          <w:pStyle w:val="Title"/>
        </w:pPr>
        <w:r>
          <w:t>${this.escapeXml(title)}</w:t>
        </w:r>
      </w:p>
    `;

    // 处理 body 内容
    paragraphsXml += this.convertElementToWordXML(body);

    return this.wrapWordDocument(paragraphsXml);
  }

  /**
   * 将 HTML 元素转换为 Word XML（浏览器 HTMLElement）
   */
  private convertHTMLElementToWordXML(title: string, element: HTMLElement): string {
    let paragraphsXml = '';

    // 添加标题
    paragraphsXml += `
      <w:p>
        <w:pPr>
          <w:pStyle w:val="Title"/>
        </w:pPr>
        <w:r>
          <w:t>${this.escapeXml(title)}</w:t>
        </w:r>
      </w:p>
    `;

    // 处理元素内容
    paragraphsXml += this.convertElementToWordXML(element as any);

    return this.wrapWordDocument(paragraphsXml);
  }

  /**
   * 将元素转换为 Word XML 段落
   */
  private convertElementToWordXML(element: Element | HTMLElement): string {
    let xml = '';

    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === 3) {
        // 文本节点 - 需要先处理，因为可能被包含在段落中
        const text = (node.textContent || '').trim();
        if (text) {
          // 如果当前没有段落，创建一个
          xml += `
            <w:p>
              <w:r>
                <w:t xml:space="preserve">${this.escapeXml(text)}</w:t>
              </w:r>
            </w:p>
          `;
        }
      } else if (node.nodeType === 1) {
        // 元素节点
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();

        if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || 
            tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
          const level = parseInt(tagName.substring(1));
          const text = this.extractTextContent(el);
          xml += `
            <w:p>
              <w:pPr>
                <w:pStyle w:val="Heading${level}"/>
              </w:pPr>
              <w:r>
                <w:t>${this.escapeXml(text)}</w:t>
              </w:r>
            </w:p>
          `;
        } else if (tagName === 'p') {
          // 段落：支持内联格式（粗体、斜体、代码等）
          xml += this.convertParagraphToWordXML(el);
        } else if (tagName === 'ul' || tagName === 'ol') {
          // 列表
          const listItems = el.querySelectorAll('li');
          listItems.forEach((li, index) => {
            xml += this.convertListItemToWordXML(li, 0, tagName === 'ol' ? 1 : 2);
          });
        } else if (tagName === 'li') {
          xml += this.convertListItemToWordXML(el, 0, 1);
        } else if (tagName === 'table') {
          // 表格
          xml += this.convertTableToWordXML(el);
        } else if (tagName === 'br') {
          xml += `
            <w:p>
              <w:r>
                <w:br/>
              </w:r>
            </w:p>
          `;
        } else if (tagName === 'img') {
          // 图片：嵌入到 Word 文档
          const imageId = el.getAttribute('data-word-image-id');
          const src = el.getAttribute('src') || '';
          const alt = el.getAttribute('alt') || '图片';
          
          if (imageId && this.imageResources.has(src)) {
            // 有图片资源，嵌入图片
            xml += this.createImageParagraph(imageId);
          } else {
            // 没有图片资源，显示占位符
            xml += `
              <w:p>
                <w:r>
                  <w:t>[${this.escapeXml(alt)}]</w:t>
                </w:r>
              </w:p>
            `;
          }
        } else if (tagName.startsWith('span') && el.classList.contains('katex-display')) {
          // 块级公式：转换为图片嵌入（独立段落）
          const imageId = el.getAttribute('data-word-image-id');
          const latex = extractLatexFromKaTeXElement(el);
          
          console.log(`[Word Export] 处理块级 KaTeX 元素: imageId=${imageId}, latex=${latex ? latex.substring(0, 30) : 'null'}`);
          
          // 查找图片资源（使用 formulaKey）
          let imageResource: ImageResource | null = null;
          const formulaKey = latex ? `${latex}_display` : null;
          
          // 方法1: 通过 imageId 直接查找
          if (imageId) {
            for (const [key, resource] of this.imageResources.entries()) {
              if (resource.id === imageId) {
                imageResource = resource;
                console.log(`[Word Export] 通过 imageId 找到块级公式图片资源: ${imageId}`);
                break;
              }
            }
          }
          
          // 方法2: 通过 formulaKey 查找
          if (!imageResource && formulaKey && this.imageResources.has(formulaKey)) {
            imageResource = this.imageResources.get(formulaKey) || null;
            console.log(`[Word Export] 通过 formulaKey 找到块级公式图片资源: ${formulaKey.substring(0, 30)}`);
          }
          
          if (imageResource && imageResource.id) {
            // 有公式图片资源，嵌入图片（块级公式，独立段落）
            console.log(`[Word Export] 嵌入块级 KaTeX 公式图片: ${imageResource.id}`);
            xml += this.createImageParagraph(imageResource.id, true);
          } else {
            // 没有公式图片资源，显示文本
            const formulaText = el.textContent || '[公式]';
            console.warn(`[Word Export] 未找到块级 KaTeX 公式图片资源，显示文本: ${formulaText.substring(0, 50)}`);
            xml += `
              <w:p>
                <w:r>
                  <w:t>${this.escapeXml(formulaText)}</w:t>
                </w:r>
              </w:p>
            `;
          }
        } else if (tagName.startsWith('span') && el.classList.contains('katex') && !el.classList.contains('katex-display')) {
          // 行内公式：应该在段落中处理，这里跳过（避免重复处理）
          // 行内公式会在 convertParagraphToWordXML 中处理
          console.log(`[Word Export] 跳过行内公式（将在段落中处理）`);
          // 不处理，让它在段落中处理
        } else if (tagName === 'div' && (
          el.classList.contains('mermaid-asset-placeholder') ||
          el.classList.contains('mermaid-asset-rendered') ||
          el.classList.contains('mermaid-container')
        )) {
          // Mermaid 图表：转换为图片嵌入
          const imageId = el.getAttribute('data-word-image-id');
          const placeholderId = el.getAttribute('data-asset-id') || 
                               el.getAttribute('id') || 
                               '';
          
          // 查找图片资源（通过 placeholderId 或 imageId）
          let foundResource = false;
          if (placeholderId && this.imageResources.has(placeholderId)) {
            const resource = this.imageResources.get(placeholderId);
            if (resource && resource.id === imageId) {
              foundResource = true;
            }
          }
          
          // 如果通过 placeholderId 找不到，尝试通过 imageId 查找
          if (!foundResource && imageId) {
            for (const [key, resource] of this.imageResources.entries()) {
              if (resource.id === imageId) {
                foundResource = true;
                break;
              }
            }
          }
          
          if (foundResource && imageId) {
            // 有图表图片资源，嵌入图片
            xml += this.createImageParagraph(imageId, true);
          } else {
            // 没有图表图片资源，显示占位符文本
            xml += `
              <w:p>
                <w:r>
                  <w:t>[Mermaid图表]</w:t>
                </w:r>
              </w:p>
            `;
          }
        } else {
          // 其他元素：递归处理
          xml += this.convertElementToWordXML(el);
        }
      }
    }

    return xml;
  }

  /**
   * 将段落转换为 Word XML（支持格式）
   */
  private convertParagraphToWordXML(paragraph: Element | HTMLElement): string {
    let runsXml = '';
    
    for (const node of Array.from(paragraph.childNodes)) {
      if (node.nodeType === 3) {
        // 文本节点
        const text = (node.textContent || '').trim();
        if (text) {
          runsXml += `
              <w:r>
                <w:t xml:space="preserve">${this.escapeXml(text)}</w:t>
              </w:r>`;
        }
      } else if (node.nodeType === 1) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();
        
        if (tagName === 'strong' || tagName === 'b') {
          // 粗体
          const text = this.extractTextContent(el);
          runsXml += `
              <w:r>
                <w:rPr>
                  <w:b/>
                </w:rPr>
                <w:t xml:space="preserve">${this.escapeXml(text)}</w:t>
              </w:r>`;
        } else if (tagName === 'em' || tagName === 'i') {
          // 斜体
          const text = this.extractTextContent(el);
          runsXml += `
              <w:r>
                <w:rPr>
                  <w:i/>
                </w:rPr>
                <w:t xml:space="preserve">${this.escapeXml(text)}</w:t>
              </w:r>`;
        } else if (tagName === 'code') {
          // 代码（内联）
          const text = this.extractTextContent(el);
          runsXml += `
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>
                  <w:color w:val="C7254E"/>
                  <w:shd w:val="clear" w:color="auto" w:fill="F9F2F4"/>
                </w:rPr>
                <w:t xml:space="preserve">${this.escapeXml(text)}</w:t>
              </w:r>`;
        } else if (tagName.startsWith('span') && el.classList.contains('katex') && !el.classList.contains('katex-display')) {
          // 行内公式：转换为内联图片
          const imageId = el.getAttribute('data-word-image-id');
          const latex = extractLatexFromKaTeXElement(el);
          const formulaKey = latex ? `${latex}_inline` : null;
          
          console.log(`[Word Export] 处理行内 KaTeX 公式: imageId=${imageId}, latex=${latex ? latex.substring(0, 30) : 'null'}`);
          
          // 查找图片资源
          let imageResource: ImageResource | null = null;
          
          // 方法1: 通过 imageId 直接查找
          if (imageId) {
            for (const [key, resource] of this.imageResources.entries()) {
              if (resource.id === imageId) {
                imageResource = resource;
                console.log(`[Word Export] 通过 imageId 找到行内公式图片资源: ${imageId}`);
                break;
              }
            }
          }
          
          // 方法2: 通过 formulaKey 查找
          if (!imageResource && formulaKey && this.imageResources.has(formulaKey)) {
            imageResource = this.imageResources.get(formulaKey) || null;
            console.log(`[Word Export] 通过 formulaKey 找到行内公式图片资源: ${formulaKey.substring(0, 30)}`);
          }
          
          if (imageResource && imageResource.id) {
            // 有公式图片资源，嵌入内联图片
            console.log(`[Word Export] 嵌入行内 KaTeX 公式图片: ${imageResource.id}`);
            runsXml += this.createInlineImage(imageResource.id);
          } else {
            // 没有公式图片资源，显示文本
            const formulaText = el.textContent || '[公式]';
            console.warn(`[Word Export] 未找到行内 KaTeX 公式图片资源，显示文本: ${formulaText.substring(0, 50)}`);
            runsXml += `
              <w:r>
                <w:t xml:space="preserve">${this.escapeXml(formulaText)}</w:t>
              </w:r>`;
          }
        } else if (tagName === 'br') {
          runsXml += `
              <w:r>
                <w:br/>
              </w:r>`;
        } else {
          // 其他元素：递归处理
          const text = this.extractTextContent(el);
          if (text) {
            runsXml += `
              <w:r>
                <w:t xml:space="preserve">${this.escapeXml(text)}</w:t>
              </w:r>`;
          }
        }
      }
    }

    return `
      <w:p>
        ${runsXml}
      </w:p>
    `;
  }

  /**
   * 提取元素的纯文本内容
   */
  private extractTextContent(element: Element | HTMLElement): string {
    let text = '';
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === 3) {
        text += node.textContent || '';
      } else if (node.nodeType === 1) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'br') {
          text += '\n';
        } else if (tagName.startsWith('span') && el.classList.contains('katex')) {
          // KaTeX 公式：保留文本内容
          text += el.textContent || '';
        } else {
          text += this.extractTextContent(el);
        }
      }
    }
    return text.trim();
  }

  /**
   * 包装 Word 文档 XML
   */
  private wrapWordDocument(bodyContent: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyContent}
  </w:body>
</w:document>`;
  }

  /**
   * 创建Word XML结构
   */
  private createWordXML(title: string, content: string): string {
    // 将文本分段
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    let paragraphsXml = '';
    paragraphs.forEach(para => {
      const lines = para.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        paragraphsXml += `
          <w:p>
            <w:r>
              <w:t xml:space="preserve">${this.escapeXml(line.trim())}</w:t>
            </w:r>
          </w:p>
        `;
      });
      paragraphsXml += '<w:p><w:r><w:t></w:t></w:r></w:p>'; // 段落间距
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Title"/>
      </w:pPr>
      <w:r>
        <w:t>${this.escapeXml(title)}</w:t>
      </w:r>
    </w:p>
    ${paragraphsXml}
  </w:body>
</w:document>`;
  }

  /**
   * 创建图片段落 XML
   */
  private createImageParagraph(imageId: string, isDisplayMode: boolean = false): string {
    // 通过 ID 查找图片资源
    const imageResource = Array.from(this.imageResources.values()).find(img => img.id === imageId);
    if (!imageResource) {
      console.warn(`Image resource not found for ID: ${imageId}`);
      return `
        <w:p>
          <w:r>
            <w:t>[图片]</w:t>
          </w:r>
        </w:p>
      `;
    }

    // 计算图片尺寸（Word 使用 EMU 单位：1 inch = 914400 EMU）
    // 假设 96 DPI：1 px = 1/96 inch = 914400/96 ≈ 9525 EMU
    // 保持原始宽高比，只限制最大尺寸以避免过大
    const maxWidthPx = 1200;  // 最大宽度 1200px（约 12.5 inch，适合A4纸张）
    const maxHeightPx = 1600;  // 最大高度 1600px（约 16.7 inch，适合A4纸张）
    
    // 获取图片尺寸，必须使用原始尺寸以保持比例
    let widthPx = imageResource.width;
    let heightPx = imageResource.height;
    
    // 如果缺少尺寸信息，使用合理的默认值（但保持比例）
    if (!widthPx || widthPx <= 0) {
      if (heightPx && heightPx > 0) {
        // 如果有高度，使用 4:3 比例计算宽度
        widthPx = Math.round(heightPx * 4 / 3);
      } else {
        widthPx = 400;
      }
    }
    if (!heightPx || heightPx <= 0) {
      if (widthPx && widthPx > 0) {
        // 如果有宽度，使用 4:3 比例计算高度
        heightPx = Math.round(widthPx * 3 / 4);
      } else {
        heightPx = 300;
      }
    }

    // 计算原始宽高比（必须严格保持）
    const originalAspectRatio = widthPx / heightPx;
    console.log(`[Word Export] 原始图片尺寸: ${widthPx}x${heightPx}px, 宽高比: ${originalAspectRatio.toFixed(4)}`);

    // 等比例缩放到限制内（严格保持宽高比）
    // 计算缩放比例，确保两个维度都不超过限制
    const widthRatio = widthPx > maxWidthPx ? maxWidthPx / widthPx : 1;
    const heightRatio = heightPx > maxHeightPx ? maxHeightPx / heightPx : 1;
    const ratio = Math.min(widthRatio, heightRatio); // 使用较小的比例，确保两个维度都不超过限制
    
    // 应用缩放，严格保持宽高比
    // 先计算一个维度的缩放后尺寸，然后根据原始宽高比计算另一个维度
    if (widthPx > maxWidthPx || heightPx > maxHeightPx) {
      // 需要缩放
      if (widthRatio < heightRatio) {
        // 宽度是限制因素
        widthPx = maxWidthPx;
        heightPx = Math.round(widthPx / originalAspectRatio);
      } else {
        // 高度是限制因素
        heightPx = maxHeightPx;
        widthPx = Math.round(heightPx * originalAspectRatio);
      }
    }
    // 如果不需要缩放，保持原始尺寸
    
    // 验证宽高比是否严格保持
    const newAspectRatio = widthPx / heightPx;
    const aspectRatioDiff = Math.abs(newAspectRatio - originalAspectRatio);
    if (aspectRatioDiff > 0.0001) {
      console.warn(`[Word Export] 警告：宽高比偏差！原始: ${originalAspectRatio.toFixed(4)}, 新: ${newAspectRatio.toFixed(4)}, 差值: ${aspectRatioDiff.toFixed(4)}`);
      // 强制根据宽度重新计算高度以严格保持比例
      heightPx = Math.round(widthPx / originalAspectRatio);
      console.log(`[Word Export] 修正后尺寸: ${widthPx}x${heightPx}px, 宽高比: ${(widthPx/heightPx).toFixed(4)}`);
    }

    // 转换为 EMU（1 inch = 914400 EMU，96 DPI 下 1 px ≈ 9525 EMU）
    const EMU_PER_PX = 914400 / 96; // ≈ 9525
    const widthEmu = Math.round(widthPx * EMU_PER_PX);
    const heightEmu = Math.round(heightPx * EMU_PER_PX);
    
    console.log(`[Word Export] Image dimensions: ${widthPx}x${heightPx}px, EMU: ${widthEmu}x${heightEmu}, ratio: ${(widthPx/heightPx).toFixed(2)}`);

    return `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
        </w:pPr>
        <w:r>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
              <wp:effectExtent l="0" t="0" r="0" b="0"/>
              <wp:docPr id="${this.relationshipCounter}" name="Picture ${this.relationshipCounter++}"/>
              <wp:cNvGraphicFramePr>
                <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1" noChangeShapeType="1"/>
              </wp:cNvGraphicFramePr>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                      <pic:cNvPr id="0" name="Picture"/>
                      <pic:cNvPicPr/>
                    </pic:nvPicPr>
                    <pic:blipFill>
                      <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${imageId}"/>
                      <a:stretch>
                        <a:fillRect/>
                      </a:stretch>
                    </pic:blipFill>
                    <pic:spPr>
                      <a:xfrm>
                        <a:off x="0" y="0"/>
                        <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
                      </a:xfrm>
                      <a:prstGeom prst="rect">
                        <a:avLst/>
                      </a:prstGeom>
                    </pic:spPr>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>
    `;
  }

  /**
   * 从XML创建docx文件
   * docx文件本质上是一个ZIP文件，包含XML文件
   */
  private async createDocxFromXML(wordXml: string): Promise<Buffer> {
    // 创建一个最小的docx结构
    // 实际应用中，应该使用完整的docx模板
    
    // 这里使用PizZip创建一个ZIP文件
    const zip = new PizZip();
    
    // 添加必要的关系文件
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
    
    // 生成文档关系 XML（包含图片关系）
    let documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

    // 添加图片关系
    let relId = 2;
    for (const imageResource of this.imageResources.values()) {
      documentRelsXml += `
  <Relationship Id="${imageResource.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageResource.fileName}"/>`;
    }

    documentRelsXml += `
</Relationships>`;
    
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:b/>
      <w:sz w:val="32"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:b/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:b/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="Heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:b/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
</w:styles>`;
    
    // 生成内容类型 XML（包含图片类型）
    let contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>`;

    // 添加图片内容类型
    const imageTypes = new Set<string>();
    for (const imageResource of this.imageResources.values()) {
      const ext = imageResource.fileName.split('.').pop()?.toLowerCase() || 'png';
      if (!imageTypes.has(ext)) {
        imageTypes.add(ext);
        const contentType = this.getImageContentType(imageResource.mimeType);
        contentTypesXml += `
  <Default Extension="${ext}" ContentType="${contentType}"/>`;
      }
    }

    contentTypesXml += `
</Types>`;
    
    // 添加文件到ZIP
    zip.file('_rels/.rels', relsXml);
    zip.file('word/_rels/document.xml.rels', documentRelsXml);
    zip.file('word/document.xml', wordXml);
    zip.file('word/styles.xml', stylesXml);
    zip.file('[Content_Types].xml', contentTypesXml);

    // 添加图片文件到 media 目录
    for (const imageResource of this.imageResources.values()) {
      const imageData = imageResource.data instanceof Uint8Array 
        ? imageResource.data 
        : new Uint8Array(imageResource.data);
      zip.file(`word/media/${imageResource.fileName}`, imageData);
    }
    
    // 生成 ArrayBuffer（浏览器兼容）
    // 在浏览器中使用 'arraybuffer' 或 'uint8array'，在 Node.js 中使用 'nodebuffer'
    const isNode = typeof window === 'undefined';
    if (isNode) {
      return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as any;
    } else {
      return zip.generate({ type: 'arraybuffer', compression: 'DEFLATE' }) as any;
    }
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 将列表项转换为 Word XML
   */
  private convertListItemToWordXML(li: Element, level: number, numId: number): string {
    const text = this.extractTextContent(li);
    return `
      <w:p>
        <w:pPr>
          <w:numPr>
            <w:ilvl w:val="${level}"/>
            <w:numId w:val="${numId}"/>
          </w:numPr>
        </w:pPr>
        <w:r>
          <w:t>${this.escapeXml(text)}</w:t>
        </w:r>
      </w:p>
    `;
  }

  /**
   * 将表格转换为 Word XML
   */
  private convertTableToWordXML(table: Element): string {
    let tableXml = '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>';

    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      tableXml += '<w:tr>';
      const cells = row.querySelectorAll('td, th');
      cells.forEach(cell => {
        const isHeader = cell.tagName.toLowerCase() === 'th';
        const text = this.extractTextContent(cell);
        tableXml += `
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="2000" w:type="dxa"/>
            </w:tcPr>
            <w:p>
              <w:pPr>
                ${isHeader ? '<w:pStyle w:val="TableHeading"/>' : ''}
              </w:pPr>
              <w:r>
                <w:rPr>
                  ${isHeader ? '<w:b/>' : ''}
                </w:rPr>
                <w:t>${this.escapeXml(text)}</w:t>
              </w:r>
            </w:p>
          </w:tc>`;
      });
      tableXml += '</w:tr>';
    });

    tableXml += '</w:tbl>';
    return tableXml;
  }

  /**
   * 创建内联图片 XML（用于行内公式）
   */
  private createInlineImage(imageId: string): string {
    // 通过 ID 查找图片资源
    const imageResource = Array.from(this.imageResources.values()).find(img => img.id === imageId);
    if (!imageResource) {
      console.warn(`Inline image resource not found for ID: ${imageId}`);
      return `
        <w:t>[图片]</w:t>`;
    }

    // 计算图片尺寸（严格保持原始宽高比）
    const maxWidthPx = 600;  // 行内图片最大宽度
    const maxHeightPx = 400; // 行内图片最大高度
    
    // 获取图片原始尺寸
    let widthPx = imageResource.width || 100;
    let heightPx = imageResource.height || 30;
    
    // 计算原始宽高比（必须严格保持）
    const originalAspectRatio = widthPx / heightPx;
    
    // 等比例缩放到限制内（严格保持宽高比）
    const widthRatio = widthPx > maxWidthPx ? maxWidthPx / widthPx : 1;
    const heightRatio = heightPx > maxHeightPx ? maxHeightPx / heightPx : 1;
    const ratio = Math.min(widthRatio, heightRatio);
    
    if (ratio < 1) {
      // 需要缩放
      if (widthRatio < heightRatio) {
        widthPx = maxWidthPx;
        heightPx = Math.round(widthPx / originalAspectRatio);
      } else {
        heightPx = maxHeightPx;
        widthPx = Math.round(heightPx * originalAspectRatio);
      }
    }

    // 转换为 EMU
    const EMU_PER_PX = 914400 / 96;
    const widthEmu = Math.round(widthPx * EMU_PER_PX);
    const heightEmu = Math.round(heightPx * EMU_PER_PX);
    
    console.log(`[Word Export] Inline image dimensions: ${widthPx}x${heightPx}px, EMU: ${widthEmu}x${heightEmu}`);

    return `
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="${this.relationshipCounter}" name="Picture ${this.relationshipCounter++}"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1" noChangeShapeType="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="0" name="Picture"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${imageId}"/>
                  <a:stretch>
                    <a:fillRect/>
                  </a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect">
                    <a:avLst/>
                  </a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>`;
  }

  /**
   * 获取图片的 Content-Type
   */
  private getImageContentType(mimeType: string): string {
    const contentTypes: Record<string, string> = {
      'image/png': 'image/png',
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/gif': 'image/gif',
      'image/webp': 'image/webp',
      'image/svg+xml': 'image/svg+xml',
      'image/bmp': 'image/bmp'
    };
    return contentTypes[mimeType.toLowerCase()] || 'image/png';
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .trim()
      .substring(0, 200);
  }
}
