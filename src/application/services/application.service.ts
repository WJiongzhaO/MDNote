import { injectable, inject } from 'inversify'
import { TYPES } from '../../core/container/container.types'
import { InversifyContainer } from '../../core/container/inversify.container'
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface'
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface'
import type { MermaidRenderer } from '../../domain/services/mermaid-renderer.service'
import { MarkdownProcessor } from '../../domain/services/markdown-processor.domain.service'
import { ExtensibleMarkdownProcessor } from '../../domain/services/extensible-markdown-processor.domain.service'
import { MarkdownProcessorInitializer } from '../../domain/services/markdown-processor-initializer.service'
import { DocumentUseCases } from '../usecases/document.usecases'
import { FolderUseCases } from '../usecases/folder.usecases'
import { KnowledgeFragmentUseCases } from '../usecases/knowledge-fragment.usecases'
import type { FragmentCategoryUseCases } from '../usecases/fragment-category.usecases'
import { KnowledgeHealthService } from './knowledge-health.service'
import type { RecommendationService } from './recommendation.service'

@injectable()
export class ApplicationService {
  private isInitialized = false
  private knowledgeFragmentUseCases: KnowledgeFragmentUseCases | null = null
  private knowledgeHealthService: KnowledgeHealthService | null = null
  private currentVaultId: string = 'default'

  constructor(
    @inject(TYPES.DocumentRepository) private documentRepository: DocumentRepository,
    @inject(TYPES.FolderRepository) private folderRepository: FolderRepository,
    @inject(TYPES.MarkdownProcessor) private markdownProcessor: MarkdownProcessor,
    @inject(TYPES.ExtensibleMarkdownProcessor)
    private extensibleMarkdownProcessor: ExtensibleMarkdownProcessor,
    @inject(TYPES.MarkdownProcessorInitializer)
    private markdownProcessorInitializer: MarkdownProcessorInitializer,
  ) {}

  async initialize(vaultId?: string): Promise<void> {
    // 如果已经初始化过：
    // - 没有传入 vaultId：保持当前实例，跳过
    // - 传入的 vaultId 与当前相同：跳过
    // - 传入的 vaultId 与当前不同：切换数据（不创建新实例）
    if (this.isInitialized) {
      if (vaultId === undefined) {
        // 没有传入 vaultId，保持当前实例
        return
      }
      if (this.currentVaultId === vaultId) {
        // vaultId 相同，跳过
        return
      }
      // vaultId 不同，切换到新的知识库数据（使用 switchVault 而不是创建新实例）
      this.switchVault(vaultId)
      // 设置全局变量，确保其他组件可以获取正确的 vaultId
      if (typeof window !== 'undefined') {
        ;(window as any).__vaultId__ = vaultId
      }
      return
    }

    // 首次初始化
    const effectiveVaultId = vaultId ?? 'default'
    this.currentVaultId = effectiveVaultId
    // 设置全局变量，确保其他组件可以获取正确的 vaultId
    if (typeof window !== 'undefined') {
      ;(window as any).__vaultId__ = effectiveVaultId
    }

    try {
      const container = await import('../../core/container/inversify.container')
      const inversifyContainer = container.InversifyContainer.getInstance()
      const mermaidRenderer = inversifyContainer.get<MermaidRenderer>(TYPES.MermaidRenderer)

      if (mermaidRenderer && typeof mermaidRenderer.initialize === 'function') {
        await mermaidRenderer.initialize()
      }

      this.knowledgeFragmentUseCases = new KnowledgeFragmentUseCases(effectiveVaultId)
      this.knowledgeHealthService = new KnowledgeHealthService(effectiveVaultId)

      await this.markdownProcessorInitializer.initialize()

      // 重建引用计数（从数据库文档和外部文件重新统计）
      try {
        const { StorageAdapter } = await import('../../infrastructure/storage.adapter')
        const { FragmentReferenceCounterService } = await import(
          './fragment-reference-counter.service'
        )
        const counterService = new FragmentReferenceCounterService(effectiveVaultId)
        await counterService.rebuild(
          StorageAdapter.createDocumentRepository(),
          StorageAdapter.createKnowledgeFragmentRepository(effectiveVaultId),
        )
        console.log('[ApplicationService] Reference counters rebuilt')
      } catch (e) {
        console.warn('[ApplicationService] Rebuild reference counters failed:', e)
      }

      this.isInitialized = true
    } catch (error) {
      console.error('应用服务初始化失败:', error)
      throw error
    }
  }

  /**
   * 切换知识库
   */
  switchVault(vaultId: string): void {
    this.currentVaultId = vaultId
    if (this.knowledgeFragmentUseCases) {
      this.knowledgeFragmentUseCases.switchVault(vaultId)
    }
    if (this.knowledgeHealthService) {
      this.knowledgeHealthService.switchVault(vaultId)
    }
  }

  getCurrentVaultId(): string {
    return this.currentVaultId
  }

  getDocumentUseCases(): DocumentUseCases {
    const container = InversifyContainer.getInstance()
    return container.get<DocumentUseCases>(TYPES.DocumentUseCases)
  }

  getFolderUseCases(): FolderUseCases {
    return new FolderUseCases(this.folderRepository)
  }

  getKnowledgeFragmentUseCases(): KnowledgeFragmentUseCases {
    if (this.knowledgeFragmentUseCases) {
      return this.knowledgeFragmentUseCases
    }
    throw new Error('ApplicationService not initialized. Call initialize() first.')
  }

  getFragmentCategoryUseCases(): FragmentCategoryUseCases {
    return InversifyContainer.getInstance().get<FragmentCategoryUseCases>(
      TYPES.FragmentCategoryUseCases,
    )
  }

  getKnowledgeHealthService(): KnowledgeHealthService {
    if (this.knowledgeHealthService) {
      return this.knowledgeHealthService
    }
    throw new Error('ApplicationService not initialized. Call initialize() first.')
  }

  getRecommendationService(): RecommendationService {
    return InversifyContainer.getInstance().get<RecommendationService>(TYPES.RecommendationService)
  }
  getLegacyMarkdownProcessor(): MarkdownProcessor {
    return this.markdownProcessor
  }

  getExtensibleMarkdownProcessor(): ExtensibleMarkdownProcessor {
    return this.extensibleMarkdownProcessor
  }
}
