import { injectable } from 'inversify';
import type { FileOpenerStrategy, FileOpenResult } from './file-opener.interface';

/**
 * JSON文件打开策略
 * 专门处理JSON文件的打开和格式化
 */
@injectable()
export class JsonFileOpenerStrategy implements FileOpenerStrategy {
  getSupportedExtensions(): string[] {
    return ['json'];
  }

  getFileTypeDescription(): string {
    return 'JSON文件';
  }

  canHandle(filePath: string): boolean {
    const extension = this.getFileExtension(filePath).toLowerCase();
    return extension === 'json';
  }

  async openFile(filePath: string, content: string = ''): Promise<FileOpenResult> {
    try {
      // 尝试解析JSON以验证格式
      const parsedJson = JSON.parse(content);

      // 格式化JSON内容
      const formattedContent = this.formatJsonContent(content);

      const metadata = this.extractJsonMetadata(parsedJson);

      return {
        title: this.getFileName(filePath),
        content: formattedContent,
        metadata: {
          ...metadata,
          isValidJson: true,
          originalSize: content.length,
          formattedSize: formattedContent.length
        },
        fileType: 'json',
        filePath
      };
    } catch (error) {
      // 如果JSON解析失败，当作普通文本处理
      console.warn('JSON文件解析失败，当作普通文本处理:', error);

      return {
        title: this.getFileName(filePath),
        content,
        metadata: {
          isValidJson: false,
          parseError: error instanceof Error ? error.message : '未知错误'
        },
        fileType: 'json',
        filePath
      };
    }
  }

  /**
   * 格式化JSON内容
   */
  private formatJsonContent(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // 如果解析失败，返回原始内容
      return content;
    }
  }

  /**
   * 提取JSON文件的元数据
   */
  private extractJsonMetadata(parsedJson: any): Record<string, any> {
    const metadata: Record<string, any> = {
      jsonType: Array.isArray(parsedJson) ? 'array' : 'object'
    };

    if (Array.isArray(parsedJson)) {
      metadata.arrayLength = parsedJson.length;
    } else if (typeof parsedJson === 'object' && parsedJson !== null) {
      metadata.keysCount = Object.keys(parsedJson).length;
      metadata.topLevelKeys = Object.keys(parsedJson).slice(0, 10); // 只显示前10个键
    }

    return metadata;
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * 获取文件名
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || '未命名文件';
  }
}