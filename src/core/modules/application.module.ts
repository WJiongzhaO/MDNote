import { TYPES } from '../container/container.types';
import type { ServiceContainer } from '../container/service-container.interface';
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface';
import type { IGitRepository } from '../../domain/repositories/IGitRepository';
import { MarkdownProcessor } from '../../domain/services/markdown-processor.domain.service';
import { ExtensibleMarkdownProcessor } from '../../domain/services/extensible-markdown-processor.domain.service';
import { HandlebarsTemplateProcessor } from '../../domain/services/template-processor.service';
import { KatexMathRenderer } from '../../domain/services/katex-math-renderer.service';
import { MermaidRendererService } from '../../domain/services/mermaid-renderer.service';
import { MermaidMarkdownExtension } from '../../domain/services/mermaid-markdown-extension.service';
import { MarkdownProcessorInitializer } from '../../domain/services/markdown-processor-initializer.service';
import { AssetRendererService } from '../../domain/services/asset-renderer.service';
import { InMemoryAssetManager } from '../../infrastructure/services/asset-manager.service';
import { ApplicationService } from '../../application/services/application.service';
import { DocumentUseCases } from '../../application/usecases/document.usecases';
import { FolderUseCases } from '../../application/usecases/folder.usecases';
import { KnowledgeFragmentUseCases } from '../../application/usecases/knowledge-fragment.usecases';
import { GitUseCases } from '../../application/usecases/GitUseCases';
import { StorageAdapter } from '../../infrastructure/storage.adapter';
import { FileSystemAssetManager } from '../../infrastructure/services/file-system-asset-manager.service';
import { FragmentReferenceParser } from '../../domain/services/fragment-reference-parser.service';
import { FragmentReferenceResolver } from '../../domain/services/fragment-reference-resolver.service';
import { FragmentReferenceRegistrationService } from '../../domain/services/fragment-reference-registration.service';
import { FragmentReferenceSyncService } from '../../domain/services/fragment-reference-sync.service';
import { FileSystemImageStorageService } from '../../infrastructure/services/image-storage.service';
import { ElectronGitRepository } from '../../infrastructure/repositories/git/ElectronGitRepository';

// 变量系统服务
import { SimpleTemplateProcessor } from '../../domain/services/simple-template-processor.service';
import { FrontmatterParser } from '../../domain/services/frontmatter-parser.service';
import { FolderVariableResolver } from '../../domain/services/folder-variable-resolver.service';
import { VariableMerger } from '../../domain/services/variable-merger.service';
import { VariableUseCases } from '../../application/usecases/variable.usecases';

// 导出服务
import { ExportUseCases } from '../../application/usecases/export.usecases';
import { ExportFactory } from '../../infrastructure/services/export-factory.service';
import { WordExporter } from '../../infrastructure/services/exporters/word-exporter.service';
import { PDFExporter } from '../../infrastructure/services/exporters/pdf-exporter.service';
import { HTMLExporter } from '../../infrastructure/services/exporters/html-exporter.service';
import { MarkdownExporter } from '../../infrastructure/services/exporters/markdown-exporter.service';

/**
 * 应用模块配置 - 负责配置应用层的依赖关系
 */
export class ApplicationModule {
  static configure(container: ServiceContainer): void {
    // 配置仓储实现
    container.bind<DocumentRepository>(TYPES.DocumentRepository)
      .toConstantValue(StorageAdapter.createDocumentRepository());
    
    container.bind<FolderRepository>(TYPES.FolderRepository)
      .toConstantValue(StorageAdapter.createFolderRepository());

    container.bind(TYPES.KnowledgeFragmentRepository)
      .toConstantValue(StorageAdapter.createKnowledgeFragmentRepository());

    // 配置领域服务（暂时保持单例模式，后续重构）
    container.bind<MarkdownProcessor>(TYPES.MarkdownProcessor)
      .toConstantValue(MarkdownProcessor.getInstance());

    // 配置新的可扩展处理器（使用单例确保只有一个实例）
    container.bind<ExtensibleMarkdownProcessor>(TYPES.ExtensibleMarkdownProcessor)
      .toSingleton(ExtensibleMarkdownProcessor);

    container.bind<HandlebarsTemplateProcessor>(TYPES.TemplateProcessor)
      .to(HandlebarsTemplateProcessor);

    container.bind<KatexMathRenderer>(TYPES.MathRenderer)
      .to(KatexMathRenderer);

    container.bind<MermaidRendererService>(TYPES.MermaidRenderer)
      .toSingleton(MermaidRendererService);

    container.bind<MermaidMarkdownExtension>(TYPES.MermaidMarkdownExtension)
      .to(MermaidMarkdownExtension);

    container.bind<MarkdownProcessorInitializer>(TYPES.MarkdownProcessorInitializer)
      .toSingleton(MarkdownProcessorInitializer);

    // 配置资源管理服务（使用文件系统存储）
    container.bind(TYPES.AssetManager)
      .toSingleton(FileSystemAssetManager);

    // 配置资源渲染服务（延迟初始化依赖）
    // 先创建实例，然后在配置完成后设置依赖
    const assetRenderer = new AssetRendererService();
    container.bind(AssetRendererService)
      .toConstantValue(assetRenderer);
    
    // 在配置完成后设置依赖（使用Promise确保顺序）
    Promise.resolve().then(() => {
      try {
        const mermaidRenderer = container.get<MermaidRendererService>(TYPES.MermaidRenderer);
        const assetManager = container.get(TYPES.AssetManager);
        assetRenderer.setMermaidRenderer(mermaidRenderer);
        assetRenderer.setAssetManager(assetManager);
      } catch (error) {
        console.error('[ApplicationModule] 设置AssetRenderer依赖失败:', error);
      }
    });

    // 配置应用服务（使用单例确保只有一个实例）
    container.bind<ApplicationService>(TYPES.ApplicationService)
      .toSingleton(ApplicationService);

    container.bind<DocumentUseCases>(TYPES.DocumentUseCases)
      .toSingleton(DocumentUseCases);

    container.bind<FolderUseCases>(TYPES.FolderUseCases)
      .to(FolderUseCases);

    container.bind<KnowledgeFragmentUseCases>(TYPES.KnowledgeFragmentUseCases)
      .to(KnowledgeFragmentUseCases);

    // 配置 Git 仓储和用例
    // 使用ElectronGitRepository，通过IPC与主进程通信
    container.bind<IGitRepository>(TYPES.GitRepository)
      .to(ElectronGitRepository);

    container.bind<GitUseCases>(TYPES.GitUseCases)
      .to(GitUseCases);

    // 配置引用相关服务
    container.bind<FragmentReferenceParser>(TYPES.FragmentReferenceParser)
      .to(FragmentReferenceParser);

    container.bind(TYPES.ImageStorageService)
      .toSingleton(FileSystemImageStorageService);

    container.bind<FragmentReferenceResolver>(TYPES.FragmentReferenceResolver)
      .to(FragmentReferenceResolver);

    container.bind<FragmentReferenceRegistrationService>(TYPES.FragmentReferenceRegistrationService)
      .to(FragmentReferenceRegistrationService);

    container.bind<FragmentReferenceSyncService>(TYPES.FragmentReferenceSyncService)
      .to(FragmentReferenceSyncService);

    // 配置变量系统服务
    container.bind<SimpleTemplateProcessor>(TYPES.SimpleTemplateProcessor)
      .toSingleton(SimpleTemplateProcessor);

    container.bind<FrontmatterParser>(TYPES.FrontmatterParser)
      .toSingleton(FrontmatterParser);

    container.bind<FolderVariableResolver>(TYPES.FolderVariableResolver)
      .toSingleton(FolderVariableResolver);

    container.bind<VariableMerger>(TYPES.VariableMerger)
      .toSingleton(VariableMerger);

    container.bind<VariableUseCases>(TYPES.VariableUseCases)
      .toSingleton(VariableUseCases);

    // 配置导出服务
    container.bind<WordExporter>(WordExporter)
      .to(WordExporter);

    container.bind<PDFExporter>(PDFExporter)
      .to(PDFExporter);

    container.bind<HTMLExporter>(HTMLExporter)
      .to(HTMLExporter);

    container.bind<MarkdownExporter>(MarkdownExporter)
      .to(MarkdownExporter);

    container.bind<ExportFactory>(TYPES.ExportFactory)
      .to(ExportFactory);

    container.bind<ExportUseCases>(TYPES.ExportUseCases)
      .to(ExportUseCases);

    // 配置处理器之间的依赖关系
    this.configureProcessorDependencies(container);
  }

  private static configureProcessorDependencies(container: ServiceContainer): void {
    // 处理器依赖关系将在使用时自动配置
    // 这里不再需要手动配置，因为依赖注入已经处理了这些关系
  }
}