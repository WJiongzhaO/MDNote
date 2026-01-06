import { injectable, inject, optional } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { FileOpenerStrategy, FileOpenResult } from './file-opener.interface';
import { MarkdownFileOpenerStrategy } from './markdown-file-opener.strategy';
import { TextFileOpenerStrategy } from './text-file-opener.strategy';
import { JsonFileOpenerStrategy } from './json-file-opener.strategy';
import { ImageFileOpenerStrategy } from './image-file-opener.strategy';

/**
 * 文件打开策略管理器
 * 负责管理和调度不同的文件打开策略
 */
@injectable()
export class FileOpenerManager {
  private strategies: FileOpenerStrategy[] = [];

  constructor(
    @inject(TYPES.MarkdownFileOpenerStrategy) @optional() private markdownStrategy?: MarkdownFileOpenerStrategy,
    @inject(TYPES.TextFileOpenerStrategy) @optional() private textStrategy?: TextFileOpenerStrategy,
    @inject(TYPES.JsonFileOpenerStrategy) @optional() private jsonStrategy?: JsonFileOpenerStrategy,
    @inject(TYPES.ImageFileOpenerStrategy) @optional() private imageStrategy?: ImageFileOpenerStrategy
  ) {
    // 手动注册策略（顺序很重要：具体的策略在前，通用的在后）
    // 1. Markdown - 最常用的具体格式
    if (this.markdownStrategy) this.strategies.push(this.markdownStrategy);
    // 2. JSON - 特定格式，需要在通用文本之前匹配
    if (this.jsonStrategy) this.strategies.push(this.jsonStrategy);
    // 3. Image - 图片文件
    if (this.imageStrategy) this.strategies.push(this.imageStrategy);
    // 4. Text - 通用文本，作为兜底（放最后）
    if (this.textStrategy) this.strategies.push(this.textStrategy);
  }

  /**
   * 注册新的文件打开策略
   */
  registerStrategy(strategy: FileOpenerStrategy): void {
    if (!this.strategies.includes(strategy)) {
      this.strategies.push(strategy);
    }
  }

  /**
   * 注销文件打开策略
   */
  unregisterStrategy(strategy: FileOpenerStrategy): void {
    const index = this.strategies.indexOf(strategy);
    if (index > -1) {
      this.strategies.splice(index, 1);
    }
  }

  /**
   * 获取支持指定文件路径的策略
   */
  getStrategyForFile(filePath: string): FileOpenerStrategy | null {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    console.log(`[FileOpenerManager] 文件名: ${fileName}, 扩展名: ${extension}`);

    for (const strategy of this.strategies) {
      const canHandle = strategy.canHandle(filePath);
      console.log(`[FileOpenerManager] 策略 ${strategy.constructor.name} canHandle(${filePath}): ${canHandle}`);
      if (canHandle) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * 获取所有支持的文件扩展名
   */
  getAllSupportedExtensions(): string[] {
    const extensions = new Set<string>();
    this.strategies.forEach(strategy => {
      strategy.getSupportedExtensions().forEach(ext => extensions.add(ext));
    });
    return Array.from(extensions).sort();
  }

  /**
   * 获取所有支持的文件类型描述
   */
  getSupportedFileTypes(): Array<{ extensions: string[], description: string }> {
    return this.strategies.map(strategy => ({
      extensions: strategy.getSupportedExtensions(),
      description: strategy.getFileTypeDescription()
    }));
  }

  /**
   * 打开文件
   */
  async openFile(filePath: string, content?: string): Promise<FileOpenResult> {
    console.log(`[FileOpenerManager] 查找文件策略: ${filePath}`);
    console.log(`[FileOpenerManager] 可用策略数量: ${this.strategies.length}`);

    this.strategies.forEach((strategy, index) => {
      console.log(`[FileOpenerManager] 策略 ${index}: ${strategy.constructor.name} - 支持: ${strategy.getSupportedExtensions().join(', ')}`);
    });

    const strategy = this.getStrategyForFile(filePath);
    console.log(`[FileOpenerManager] 匹配到的策略: ${strategy ? strategy.constructor.name : 'null'}`);

    if (!strategy) {
      // 如果没有找到合适的策略，使用默认的文本策略
      console.log(`[FileOpenerManager] 未找到匹配策略，使用默认文本策略`);
      return this.openAsDefaultText(filePath, content || '');
    }

    try {
      // 对于某些文件类型（如图片），我们不需要文件内容
      const fileContent = this.needsContent(filePath) ? (content || '') : '';
      return await strategy.openFile(filePath, fileContent);
    } catch (error) {
      console.error(`使用策略 ${strategy.constructor.name} 打开文件失败:`, error);
      // 如果策略执行失败，回退到默认文本处理
      return this.openAsDefaultText(filePath, content || '');
    }
  }

  /**
   * 判断文件类型是否需要读取内容
   */
  private needsContent(filePath: string): boolean {
    const strategy = this.getStrategyForFile(filePath);
    // 图片文件不需要读取文本内容
    return !(strategy && strategy.getFileTypeDescription() === '图片文件');
  }

  /**
   * 默认的文本文件处理
   */
  private openAsDefaultText(filePath: string, content: string): FileOpenResult {
    const fileName = this.getFileName(filePath);

    return {
      title: fileName,
      content,
      metadata: {
        fallback: true,
        reason: '没有找到合适的处理策略'
      },
      fileType: 'text',
      filePath
    };
  }

  /**
   * 获取文件名
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || '未命名文件';
  }

  /**
   * 获取所有注册的策略
   */
  getRegisteredStrategies(): FileOpenerStrategy[] {
    return [...this.strategies];
  }
}