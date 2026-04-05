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
import { KnowledgeHealthService } from './knowledge-health.service'

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

  async initialize(vaultId: string = 'default'): Promise<void> {
    // 每次调用都强制使用新的 vaultId 重新创建实例
    // 这样可以确保每个知识库使用独立的数据存储
    this.currentVaultId = vaultId

    try {
      const container = await import('../../core/container/inversify.container')
      const inversifyContainer = container.InversifyContainer.getInstance()
      const mermaidRenderer = inversifyContainer.get<MermaidRenderer>(TYPES.MermaidRenderer)

      if (mermaidRenderer && typeof mermaidRenderer.initialize === 'function') {
        await mermaidRenderer.initialize()
      }

      // 每次都创建新的 KnowledgeFragmentUseCases 实例，传入当前 vaultId
      this.knowledgeFragmentUseCases = new KnowledgeFragmentUseCases(vaultId)

      // 每次都创建新的 KnowledgeHealthService 实例，传入当前 vaultId
      this.knowledgeHealthService = new KnowledgeHealthService(vaultId)

      // 初始化Markdown处理器（包括Mermaid扩展）
      await this.markdownProcessorInitializer.initialize()
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

  getKnowledgeHealthService(): KnowledgeHealthService {
    if (this.knowledgeHealthService) {
      return this.knowledgeHealthService
    }
    throw new Error('ApplicationService not initialized. Call initialize() first.')
  }

  getLegacyMarkdownProcessor(): MarkdownProcessor {
    return this.markdownProcessor
  }

  getExtensibleMarkdownProcessor(): ExtensibleMarkdownProcessor {
    return this.extensibleMarkdownProcessor
  }
}
