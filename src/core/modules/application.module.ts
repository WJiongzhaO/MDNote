import { TYPES } from '../container/container.types'
import type { ServiceContainer } from '../container/service-container.interface'
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface'
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface'
import type { VaultRepository } from '../../domain/repositories/vault.repository.interface'
import { MarkdownProcessor } from '../../domain/services/markdown-processor.domain.service'
import { ExtensibleMarkdownProcessor } from '../../domain/services/extensible-markdown-processor.domain.service'
import { MarkdownProcessorInitializer } from '../../domain/services/markdown-processor-initializer.service'
import { DocumentUseCases } from '../../application/usecases/document.usecases'
import { FolderUseCases } from '../../application/usecases/folder.usecases'
import { KnowledgeFragmentUseCases } from '../../application/usecases/knowledge-fragment.usecases'
import { FragmentCategoryUseCases } from '../../application/usecases/fragment-category.usecases'
import { KnowledgeHealthService } from '../../application/services/knowledge-health.service'
import { RecommendationService } from '../../application/services/recommendation.service'
import { ReferenceGraphService } from '../../application/services/reference-graph.service'
import { VaultUseCases } from '../../application/usecases/vault.usecases'
import { StorageAdapter } from '../../infrastructure/storage.adapter'
import { FileSystemAssetManager } from '../../infrastructure/services/file-system-asset-manager.service'
import { FragmentReferenceParser } from '../../domain/services/fragment-reference-parser.service'
import { FragmentReferenceResolver } from '../../domain/services/fragment-reference-resolver.service'
import { FragmentReferenceRegistrationService } from '../../domain/services/fragment-reference-registration.service'
import { FragmentReferenceSyncService } from '../../domain/services/fragment-reference-sync.service'
import { FileSystemImageStorageService } from '../../infrastructure/services/image-storage.service'
import { FileSystemVaultRepository } from '../../infrastructure/repositories/file-system.vault.repository.impl'
import { FileSystemVaultRegistryRepository } from '../../infrastructure/repositories/vault-registry.repository.impl'
import type { VaultRegistryRepository } from '../../domain/repositories/vault-registry.repository.interface'
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface'

import { MermaidRendererService } from '../../domain/services/mermaid-renderer.service'
import { MermaidMarkdownExtension } from '../../domain/services/mermaid-markdown-extension.service'
import { AssetRendererService } from '../../domain/services/asset-renderer.service'
import { InMemoryAssetManager } from '../../infrastructure/services/asset-manager.service'
import { ApplicationService } from '../../application/services/application.service'
import { HandlebarsTemplateProcessor } from '../../domain/services/template-processor.service'
import { KatexMathRenderer } from '../../domain/services/katex-math-renderer.service'

import { SimpleTemplateProcessor } from '../../domain/services/simple-template-processor.service'
import { FrontmatterParser } from '../../domain/services/frontmatter-parser.service'

import { ExportUseCases } from '../../application/usecases/export.usecases'
import { ExportFactory } from '../../infrastructure/services/export-factory.service'
import { PDFExporter } from '../../infrastructure/services/exporters/pdf-exporter.service'
import { HTMLExporter } from '../../infrastructure/services/exporters/html-exporter.service'
import { MarkdownExporter } from '../../infrastructure/services/exporters/markdown-exporter.service'

import { FormatEditorService } from '../../domain/services/editor/format-editor.service'
import { InsertContentService } from '../../domain/services/editor/insert-content.service'
import { EditorToolbarUseCase } from '../../application/usecases/editor/editor-toolbar.usecase'

import { ShortcutRegistry } from '../../domain/services/ShortcutRegistry.service'
import { ConflictDetector } from '../../domain/services/ConflictDetector.service'
import { CommandExecutor } from '../../domain/services/CommandExecutor.service'
import { ShortcutManager } from '../../domain/services/ShortcutManager.service'
import { ShortcutCommandsFactory } from '../../application/usecases/shortcut/shortcut-commands.factory'
import { LocalStorageShortcutRepository } from '../../infrastructure/repositories/LocalStorageShortcutRepository'
import { KeyboardEventProcessor } from '../../infrastructure/services/KeyboardEventProcessor.service'
import { PlatformAdapter } from '../../infrastructure/services/PlatformAdapter.service'

import { MarkdownFileOpenerStrategy } from '../../domain/services/markdown-file-opener.strategy'
import { TextFileOpenerStrategy } from '../../domain/services/text-file-opener.strategy'
import { JsonFileOpenerStrategy } from '../../domain/services/json-file-opener.strategy'
import { ImageFileOpenerStrategy } from '../../domain/services/image-file-opener.strategy'
import { FileOpenerManager } from '../../domain/services/file-opener-manager.service'
import { InMemoryAiGraphRepository } from '../../infrastructure/ai-graph/in-memory-ai-graph.repository'
import { KuzuAiGraphRepository } from '../../infrastructure/ai-graph/kuzu-ai-graph.repository'
import { LocalStorageAiGraphMetadataRepository } from '../../infrastructure/ai-graph/local-storage-ai-graph-metadata.repository'
import { AiGraphSettingsService } from '../../application/services/ai-graph-settings.service'
import { AiDocumentGraphService } from '../../application/services/ai-document-graph.service'
import { LangChainLlmGraphTransformerExtractor } from '../../infrastructure/ai-graph/langchain-llm-graph-transformer-extractor'
import type { AiGraphRepository } from '../../domain/repositories/ai-graph.repository.interface'
import type { AiGraphMetadataRepository } from '../../domain/repositories/ai-graph-metadata.repository.interface'
import type {
  AiGraphProviderConnectionResult,
  AiGraphProviderGateway,
} from '../../domain/services/ai-graph-provider.service'
import type { AiGraphEntity, AiGraphProviderConfig, AiGraphRelation, AiKnowledgeGraph } from '../../domain/types/ai-knowledge-graph.types'
import { normalizeAiGraphExtraction } from '../../domain/services/ai-graph-normalizer.service'
import { OpenAI } from '@langchain/openai'
import { LLMGraphTransformer } from '@langchain/community/experimental/graph_transformers/llm'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

class InMemoryAiGraphProviderGateway implements AiGraphProviderGateway {
  private config: AiGraphProviderConfig | null = null

  async load(): Promise<Partial<AiGraphProviderConfig> | null> {
    return this.config
  }

  async save(config: AiGraphProviderConfig): Promise<void> {
    this.config = config
  }

  async testConnection(): Promise<AiGraphProviderConnectionResult> {
    return { success: true }
  }
}

class MockDocumentGraphExtractor {
  async buildForDocument(
    docId: string,
    config: AiGraphProviderConfig,
  ): Promise<{ title: string; entities: AiGraphEntity[]; relations: AiGraphRelation[]; graph: AiKnowledgeGraph; contentHash: string; provider: string; model: string }> {
    return {
      title: docId,
      entities: [],
      relations: [],
      graph: { nodes: [], edges: [] },
      contentHash: `mock-${docId}`,
      provider: config.providerName,
      model: config.model,
    }
  }
}

class RealDocumentGraphExtractor {
  async buildForDocument(
    docId: string,
    config: AiGraphProviderConfig,
  ): Promise<{ title: string; entities: AiGraphEntity[]; relations: AiGraphRelation[]; graph: AiKnowledgeGraph; contentHash: string; provider: string; model: string }> {
    const model = new OpenAI({
      apiKey: config.apiKey,
      configuration: { baseURL: config.baseUrl },
      model: config.model,
      temperature: config.temperature ?? 0.1
    });
    const transformer = new LLMGraphTransformer({ llm: model as never });
    const extractor = new LangChainLlmGraphTransformerExtractor(transformer as never);
    const markdown = `# ${docId}\n${docId}`;
    const extracted = await extractor.extractChunk({
      chunkId: `${docId}:chunk:0`,
      docId,
      markdown,
      headingPath: [docId],
      startOffset: 0,
      endOffset: markdown.length
    });
    const normalized = normalizeAiGraphExtraction({
      docId,
      chunkId: `${docId}:chunk:0`,
      entities: extracted.entities,
      relations: extracted.relations
    });
    return {
      title: docId,
      entities: normalized.entities,
      relations: normalized.relations,
      graph: {
        nodes: normalized.entities.map(entity => ({
          id: entity.entityId,
          label: entity.name,
          entityType: entity.type,
          description: entity.description,
          primaryAnchor: entity.anchors[0],
          evidenceCount: entity.anchors.length,
          evidencePreview: entity.anchors.slice(0, 3)
        })),
        edges: normalized.relations.map(relation => ({
          id: relation.relationId,
          source: relation.sourceEntityId,
          target: relation.targetEntityId,
          relationType: relation.type,
          description: relation.description
        }))
      },
      contentHash: `real-${docId}`,
      provider: config.providerName,
      model: config.model
    }
  }
}

export class ApplicationModule {
  static configure(container: ServiceContainer): void {
    const aiGraphProviderGateway = new InMemoryAiGraphProviderGateway()
    const documentGraphExtractor = new RealDocumentGraphExtractor()
    const kuzuDbDir = join(process.cwd(), '.mdnote-ai-graph')
    if (!existsSync(kuzuDbDir)) {
      mkdirSync(kuzuDbDir, { recursive: true })
    }

    container
      .bind<DocumentRepository>(TYPES.DocumentRepository)
      .toConstantValue(StorageAdapter.createDocumentRepository())

    container
      .bind<FolderRepository>(TYPES.FolderRepository)
      .toConstantValue(StorageAdapter.createFolderRepository())

    container
      .bind<MarkdownProcessor>(TYPES.MarkdownProcessor)
      .toConstantValue(MarkdownProcessor.getInstance())

    container
      .bind<ExtensibleMarkdownProcessor>(TYPES.ExtensibleMarkdownProcessor)
      .toSingleton(ExtensibleMarkdownProcessor)

    container
      .bind<HandlebarsTemplateProcessor>(TYPES.TemplateProcessor)
      .to(HandlebarsTemplateProcessor)

    container.bind<KatexMathRenderer>(TYPES.MathRenderer).to(KatexMathRenderer)

    container
      .bind<MermaidRendererService>(TYPES.MermaidRenderer)
      .toSingleton(MermaidRendererService)

    container
      .bind<MermaidMarkdownExtension>(TYPES.MermaidMarkdownExtension)
      .to(MermaidMarkdownExtension)

    container
      .bind<MarkdownProcessorInitializer>(TYPES.MarkdownProcessorInitializer)
      .toSingleton(MarkdownProcessorInitializer)

    container.bind(TYPES.AssetManager).toSingleton(FileSystemAssetManager)

    const assetRenderer = new AssetRendererService()
    container.bind<AssetRendererService>(AssetRendererService as any).toConstantValue(assetRenderer)

    Promise.resolve().then(() => {
      try {
        const mermaidRenderer = container.get<MermaidRendererService>(TYPES.MermaidRenderer)
        const assetManager = container.get<any>(TYPES.AssetManager)
        assetRenderer.setMermaidRenderer(mermaidRenderer)
        assetRenderer.setAssetManager(assetManager)
      } catch (error) {
        console.error('[ApplicationModule] 设置AssetRenderer依赖失败:', error)
      }
    })

    container.bind<ApplicationService>(TYPES.ApplicationService).toSingleton(ApplicationService)

    // 按当前知识库 vaultId 提供片段仓储（与 ApplicationService.initialize / switchVault 一致）
    container.bind<KnowledgeFragmentRepository>(TYPES.KnowledgeFragmentRepository).toDynamicValue(ctx => {
      const app = ctx.container.get<ApplicationService>(TYPES.ApplicationService)
      return StorageAdapter.createKnowledgeFragmentRepository(app.getCurrentVaultId())
    })

    container.bind<DocumentUseCases>(TYPES.DocumentUseCases).toSingleton(DocumentUseCases)

    container.bind<FolderUseCases>(TYPES.FolderUseCases).to(FolderUseCases)

    container
      .bind<KnowledgeFragmentUseCases>(TYPES.KnowledgeFragmentUseCases)
      .to(KnowledgeFragmentUseCases)

    container.bind<FragmentCategoryUseCases>(TYPES.FragmentCategoryUseCases)
      .to(FragmentCategoryUseCases);

    container.bind<ReferenceGraphService>(TYPES.ReferenceGraphService)
      .to(ReferenceGraphService);
    container.bind<KnowledgeHealthService>(TYPES.KnowledgeHealthService)
      .to(KnowledgeHealthService);
    container.bind<RecommendationService>(TYPES.RecommendationService)
      .to(RecommendationService);

    container.bind<VaultRepository>(TYPES.VaultRepository).toSingleton(FileSystemVaultRepository)

    container
      .bind<VaultRegistryRepository>(TYPES.VaultRegistryRepository)
      .toSingleton(FileSystemVaultRegistryRepository)

    container.bind<VaultUseCases>(TYPES.VaultUseCases).toSingleton(VaultUseCases)

    container.bind<AiGraphRepository>(TYPES.AiGraphRepository).toDynamicValue(() => new KuzuAiGraphRepository({
      dbPath: join(kuzuDbDir, 'graph.kuzu')
    }))

    container
      .bind<AiGraphMetadataRepository>(TYPES.AiGraphMetadataRepository)
      .toSingleton(LocalStorageAiGraphMetadataRepository)

    container
      .bind<AiGraphSettingsService>(TYPES.AiGraphSettingsService)
      .toDynamicValue(() => new AiGraphSettingsService(aiGraphProviderGateway))

    container
      .bind<AiDocumentGraphService>(TYPES.AiDocumentGraphService)
      .toDynamicValue(ctx => new AiDocumentGraphService({
        metadataRepo: ctx.container.get<AiGraphMetadataRepository>(TYPES.AiGraphMetadataRepository),
        graphRepo: ctx.container.get<AiGraphRepository>(TYPES.AiGraphRepository),
        settingsGateway: aiGraphProviderGateway,
        extractor: documentGraphExtractor,
      }))

    container
      .bind<FragmentReferenceParser>(TYPES.FragmentReferenceParser)
      .to(FragmentReferenceParser)

    container.bind(TYPES.ImageStorageService).toSingleton(FileSystemImageStorageService)

    container
      .bind<FragmentReferenceResolver>(TYPES.FragmentReferenceResolver)
      .to(FragmentReferenceResolver)

    container
      .bind<FragmentReferenceRegistrationService>(TYPES.FragmentReferenceRegistrationService)
      .to(FragmentReferenceRegistrationService)

    container
      .bind<FragmentReferenceSyncService>(TYPES.FragmentReferenceSyncService)
      .to(FragmentReferenceSyncService)

    container
      .bind<SimpleTemplateProcessor>(TYPES.SimpleTemplateProcessor)
      .toSingleton(SimpleTemplateProcessor)

    container.bind<FrontmatterParser>(TYPES.FrontmatterParser).toSingleton(FrontmatterParser)

    container.bind<PDFExporter>(PDFExporter as any).to(PDFExporter)

    container.bind<HTMLExporter>(HTMLExporter as any).to(HTMLExporter)

    container.bind<MarkdownExporter>(MarkdownExporter as any).to(MarkdownExporter)

    container.bind<ExportFactory>(TYPES.ExportFactory).to(ExportFactory)

    container.bind<ExportUseCases>(TYPES.ExportUseCases).to(ExportUseCases)

    container.bind<FormatEditorService>(TYPES.FormatEditorService).to(FormatEditorService)

    container.bind<InsertContentService>(TYPES.InsertContentService).to(InsertContentService)

    container.bind<EditorToolbarUseCase>(TYPES.EditorToolbarUseCase).to(EditorToolbarUseCase)

    container.bind(TYPES.ShortcutRepository).toSingleton(LocalStorageShortcutRepository)

    container.bind(TYPES.ShortcutRegistry).toSingleton(ShortcutRegistry)

    container.bind(TYPES.ConflictDetector).toSingleton(ConflictDetector)

    container.bind(TYPES.CommandExecutor).toSingleton(CommandExecutor)

    container.bind(TYPES.ShortcutManager).toSingleton(ShortcutManager)

    container.bind(TYPES.ShortcutCommandsFactory).to(ShortcutCommandsFactory)

    container.bind(TYPES.KeyboardEventProcessor).toSingleton(KeyboardEventProcessor)

    container.bind(TYPES.PlatformAdapter).toSingleton(PlatformAdapter)

    container.bind(TYPES.FileOpenerManager).toSingleton(FileOpenerManager)

    container.bind(TYPES.MarkdownFileOpenerStrategy).to(MarkdownFileOpenerStrategy)

    container.bind(TYPES.TextFileOpenerStrategy).to(TextFileOpenerStrategy)
    container.bind(TYPES.JsonFileOpenerStrategy).to(JsonFileOpenerStrategy)
    container.bind(TYPES.ImageFileOpenerStrategy).to(ImageFileOpenerStrategy)
  }
}
