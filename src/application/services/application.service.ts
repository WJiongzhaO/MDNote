import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { InversifyContainer } from '../../core/container/inversify.container';
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface';
import type { MermaidRenderer } from '../../domain/services/mermaid-renderer.service';
import { MarkdownProcessor } from '../../domain/services/markdown-processor.domain.service';
import { ExtensibleMarkdownProcessor } from '../../domain/services/extensible-markdown-processor.domain.service';
import { MarkdownProcessorInitializer } from '../../domain/services/markdown-processor-initializer.service';
import { DocumentUseCases } from '../usecases/document.usecases';
import { FolderUseCases } from '../usecases/folder.usecases';
import { KnowledgeFragmentUseCases } from '../usecases/knowledge-fragment.usecases';
import type { FragmentCategoryUseCases } from '../usecases/fragment-category.usecases';
import type { KnowledgeHealthService } from './knowledge-health.service';
import type { RecommendationService } from './recommendation.service';

@injectable()
export class ApplicationService {
  private isInitialized = false;
  private knowledgeFragmentUseCases: KnowledgeFragmentUseCases | null = null;

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
      const inversifyContainer = container.InversifyContainer.getInstance();
      const mermaidRenderer = inversifyContainer.get<MermaidRenderer>(TYPES.MermaidRenderer);

      if (mermaidRenderer && typeof mermaidRenderer.initialize === 'function') {
        await mermaidRenderer.initialize();
      }

      // 获取并保存KnowledgeFragmentUseCases实例
      this.knowledgeFragmentUseCases = inversifyContainer.get<KnowledgeFragmentUseCases>(TYPES.KnowledgeFragmentUseCases);

      // 初始化Markdown处理器（包括Mermaid扩展）
      await this.markdownProcessorInitializer.initialize();
      this.isInitialized = true;
    } catch (error) {
      console.error('应用服务初始化失败:', error);
      throw error;
    }
  }

  getDocumentUseCases(): DocumentUseCases {
    // 从容器获取单例实例，确保使用的是同一个实例（已配置好模板处理器）
    const container = InversifyContainer.getInstance();
    return container.get<DocumentUseCases>(TYPES.DocumentUseCases);
  }

  getFolderUseCases(): FolderUseCases {
    return new FolderUseCases(this.folderRepository);
  }

  getKnowledgeFragmentUseCases(): KnowledgeFragmentUseCases {
    if (this.knowledgeFragmentUseCases) {
      return this.knowledgeFragmentUseCases;
    }
    throw new Error('ApplicationService not initialized. Call initialize() first.');
  }

  getFragmentCategoryUseCases(): FragmentCategoryUseCases {
    return InversifyContainer.getInstance().get<FragmentCategoryUseCases>(TYPES.FragmentCategoryUseCases);
  }

  getKnowledgeHealthService(): KnowledgeHealthService {
    return InversifyContainer.getInstance().get<KnowledgeHealthService>(TYPES.KnowledgeHealthService);
  }

  getRecommendationService(): RecommendationService {
    return InversifyContainer.getInstance().get<RecommendationService>(TYPES.RecommendationService);
  }

  // 向后兼容的方法
  getLegacyMarkdownProcessor(): MarkdownProcessor {
    return this.markdownProcessor;
  }

  getExtensibleMarkdownProcessor(): ExtensibleMarkdownProcessor {
    return this.extensibleMarkdownProcessor;
  }
}
