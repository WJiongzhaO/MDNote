import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface';
import { MarkdownProcessor } from '../../domain/services/markdown-processor.domain.service';
import { ExtensibleMarkdownProcessor } from '../../domain/services/extensible-markdown-processor.domain.service';
import { MarkdownProcessorInitializer } from '../../domain/services/markdown-processor-initializer.service';
import { DocumentUseCases } from '../usecases/document.usecases';
import { FolderUseCases } from '../usecases/folder.usecases';

@injectable()
export class ApplicationService {
  private isInitialized = false;
  
  constructor(
    @inject(TYPES.DocumentRepository) private documentRepository: DocumentRepository,
    @inject(TYPES.FolderRepository) private folderRepository: FolderRepository,
    @inject(TYPES.MarkdownProcessor) private markdownProcessor: MarkdownProcessor,
    @inject(TYPES.ExtensibleMarkdownProcessor) private extensibleMarkdownProcessor: ExtensibleMarkdownProcessor,
    @inject(TYPES.MarkdownProcessorInitializer) private markdownProcessorInitializer: MarkdownProcessorInitializer
  ) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 首先确保Mermaid渲染器已初始化
      const container = await import('../../core/container/inversify.container');
      const mermaidRenderer = container.InversifyContainer.getInstance().get<MermaidRenderer>(TYPES.MermaidRenderer);
      
      if (mermaidRenderer && typeof mermaidRenderer.initialize === 'function') {
        console.log('开始初始化Mermaid渲染器...');
        await mermaidRenderer.initialize();
        console.log('Mermaid渲染器初始化完成');
      }

      // 初始化Markdown处理器（包括Mermaid扩展）
      await this.markdownProcessorInitializer.initialize();
      this.isInitialized = true;
      console.log('应用服务初始化完成，Mermaid扩展已注册');
    } catch (error) {
      console.error('应用服务初始化失败:', error);
      throw error;
    }
  }

  getDocumentUseCases(): DocumentUseCases {
    // 使用新的可扩展处理器
    return new DocumentUseCases(this.documentRepository, this.extensibleMarkdownProcessor);
  }

  getFolderUseCases(): FolderUseCases {
    return new FolderUseCases(this.folderRepository);
  }

  // 向后兼容的方法
  getLegacyMarkdownProcessor(): MarkdownProcessor {
    return this.markdownProcessor;
  }

  getExtensibleMarkdownProcessor(): ExtensibleMarkdownProcessor {
    return this.extensibleMarkdownProcessor;
  }
}