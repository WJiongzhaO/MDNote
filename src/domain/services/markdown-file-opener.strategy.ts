import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { FileOpenerStrategy, FileOpenResult } from './file-opener.interface';
import { FrontmatterParser } from './frontmatter-parser.service';

/**
 * Markdown文件打开策略
 * 专门处理Markdown文件的打开和解析
 */
@injectable()
export class MarkdownFileOpenerStrategy implements FileOpenerStrategy {
  constructor(
    @inject(TYPES.FrontmatterParser) private frontmatterParser: FrontmatterParser
  ) {}

  getSupportedExtensions(): string[] {
    return ['md', 'markdown', 'mdown', 'mkd'];
  }

  getFileTypeDescription(): string {
    return 'Markdown文件';
  }

  canHandle(filePath: string): boolean {
    const extension = this.getFileExtension(filePath).toLowerCase();
    return this.getSupportedExtensions().includes(extension);
  }

  async openFile(filePath: string, content: string = ''): Promise<FileOpenResult> {
    console.log(`[MarkdownFileOpenerStrategy] 处理文件: ${filePath}`);
    console.log(`[MarkdownFileOpenerStrategy] 内容长度: ${content?.length || 0}`);
    console.log(`[MarkdownFileOpenerStrategy] 内容预览:`, content?.substring(0, 200) || 'null');

    try {
      // 解析frontmatter
      const frontmatterResult = this.frontmatterParser.parse(content);
      console.log(`[MarkdownFileOpenerStrategy] Frontmatter解析结果:`, frontmatterResult);

      // 提取标题
      const title = this.extractTitle(filePath, frontmatterResult.attributes, frontmatterResult.content);

      return {
        title,
        content: frontmatterResult.content,
        metadata: frontmatterResult.attributes,
        fileType: 'markdown',
        filePath
      };
    } catch (error) {
      console.warn('解析Markdown文件时出错，使用原始内容:', error);
      // 如果解析失败，返回原始内容
      return {
        title: this.getFileName(filePath),
        content,
        fileType: 'markdown',
        filePath
      };
    }
  }

  /**
   * 提取文件标题
   * 优先级：frontmatter.title > 第一个标题 > 文件名
   */
  private extractTitle(filePath: string, attributes: Record<string, any>, content: string): string {
    // 1. 检查frontmatter中的title
    if (attributes.title) {
      return attributes.title;
    }

    // 2. 检查内容中的第一个标题（# 开头）
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // 3. 使用文件名
    return this.getFileName(filePath);
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * 获取文件名（不含扩展名）
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    const fileNameWithExt = parts[parts.length - 1];
    const extIndex = fileNameWithExt.lastIndexOf('.');
    return extIndex > 0 ? fileNameWithExt.substring(0, extIndex) : fileNameWithExt;
  }
}