import { injectable } from 'inversify';
import type { FileOpenerStrategy, FileOpenResult } from './file-opener.interface';

/**
 * 文本文件打开策略
 * 处理纯文本文件
 */
@injectable()
export class TextFileOpenerStrategy implements FileOpenerStrategy {
  private readonly supportedExtensions = [
    'txt', 'log', 'csv', 'tsv', 'xml', 'html', 'htm', 'css', 'js', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
    'php', 'rb', 'sh', 'bat', 'ps1', 'sql', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg'
    // 注意: json 由 JsonFileOpenerStrategy 单独处理
  ];

  getSupportedExtensions(): string[] {
    return this.supportedExtensions;
  }

  getFileTypeDescription(): string {
    return '文本文件';
  }

  canHandle(filePath: string): boolean {
    const extension = this.getFileExtension(filePath).toLowerCase();
    return this.supportedExtensions.includes(extension);
  }

  async openFile(filePath: string, content: string = ''): Promise<FileOpenResult> {
    const title = this.getFileName(filePath);
    const fileType = this.determineFileType(filePath);

    return {
      title,
      content,
      metadata: {
        fileType: fileType,
        extension: this.getFileExtension(filePath),
        lineCount: content.split('\n').length,
        charCount: content.length
      },
      fileType: 'text',
      filePath
    };
  }

  /**
   * 根据扩展名确定文件类型
   */
  private determineFileType(filePath: string): string {
    const extension = this.getFileExtension(filePath).toLowerCase();

    const typeMap: Record<string, string> = {
      'txt': '纯文本',
      'log': '日志文件',
      'csv': 'CSV文件',
      'tsv': 'TSV文件',
      'xml': 'XML文件',
      'html': 'HTML文件',
      'htm': 'HTML文件',
      'css': 'CSS样式表',
      'js': 'JavaScript文件',
      'py': 'Python文件',
      'java': 'Java文件',
      'c': 'C语言文件',
      'cpp': 'C++文件',
      'h': 'C/C++头文件',
      'hpp': 'C++头文件',
      'php': 'PHP文件',
      'rb': 'Ruby文件',
      'sh': 'Shell脚本',
      'bat': '批处理文件',
      'ps1': 'PowerShell脚本',
      'sql': 'SQL文件',
      'yaml': 'YAML文件',
      'yml': 'YAML文件',
      'toml': 'TOML文件',
      'ini': '配置文件',
      'conf': '配置文件',
      'cfg': '配置文件'
    };

    return typeMap[extension] || '文本文件';
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