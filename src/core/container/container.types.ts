/**
 * 依赖注入容器类型定义
 */
export const TYPES = {
  // 仓储接口
  DocumentRepository: Symbol.for('DocumentRepository'),
  FolderRepository: Symbol.for('FolderRepository'),
  KnowledgeFragmentRepository: Symbol.for('KnowledgeFragmentRepository'),
  FragmentCategoryRepository: Symbol.for('FragmentCategoryRepository'),
  GitRepository: Symbol.for('GitRepository'),
  VaultRepository: Symbol.for('VaultRepository'),
  VaultRegistryRepository: Symbol.for('VaultRegistryRepository'),

  // 领域服务
  MarkdownProcessor: Symbol.for('MarkdownProcessor'),
  ExtensibleMarkdownProcessor: Symbol.for('ExtensibleMarkdownProcessor'),
  TemplateProcessor: Symbol.for('TemplateProcessor'),
  MathRenderer: Symbol.for('MathRenderer'),
  MermaidRenderer: Symbol.for('MermaidRenderer'),
  MermaidMarkdownExtension: Symbol.for('MermaidMarkdownExtension'),
  MarkdownProcessorInitializer: Symbol.for('MarkdownProcessorInitializer'),
  FragmentReferenceParser: Symbol.for('FragmentReferenceParser'),
  FragmentReferenceResolver: Symbol.for('FragmentReferenceResolver'),
  FragmentReferenceRegistrationService: Symbol.for('FragmentReferenceRegistrationService'),
  FragmentReferenceSyncService: Symbol.for('FragmentReferenceSyncService'),
  ImageStorageService: Symbol.for('ImageStorageService'),

  // 变量系统领域服务
  SimpleTemplateProcessor: Symbol.for('SimpleTemplateProcessor'),
  FrontmatterParser: Symbol.for('FrontmatterParser'),
  FolderVariableResolver: Symbol.for('FolderVariableResolver'),
  VariableMerger: Symbol.for('VariableMerger'),

  // 应用服务
  ApplicationService: Symbol.for('ApplicationService'),
  DocumentUseCases: Symbol.for('DocumentUseCases'),
  FolderUseCases: Symbol.for('FolderUseCases'),
  KnowledgeFragmentUseCases: Symbol.for('KnowledgeFragmentUseCases'),
  FragmentCategoryUseCases: Symbol.for('FragmentCategoryUseCases'),
  GitUseCases: Symbol.for('GitUseCases'),
  VariableUseCases: Symbol.for('VariableUseCases'),
  ExportUseCases: Symbol.for('ExportUseCases'),
  VaultUseCases: Symbol.for('VaultUseCases'),

  // 编辑器工具栏相关
  FormatEditorService: Symbol.for('FormatEditorService'),
  InsertContentService: Symbol.for('InsertContentService'),
  EditorToolbarUseCase: Symbol.for('EditorToolbarUseCase'),
  ShortcutManager: Symbol.for('ShortcutManager'),

  // 快捷键系统
  ShortcutRepository: Symbol.for('ShortcutRepository'),
  ShortcutRegistry: Symbol.for('ShortcutRegistry'),
  ConflictDetector: Symbol.for('ConflictDetector'),
  CommandExecutor: Symbol.for('CommandExecutor'),
  ShortcutCommandsFactory: Symbol.for('ShortcutCommandsFactory'),
  KeyboardEventProcessor: Symbol.for('KeyboardEventProcessor'),
  PlatformAdapter: Symbol.for('PlatformAdapter'),

  // 工作3 引用图谱与健康度
  ReferenceGraphService: Symbol.for('ReferenceGraphService'),
  KnowledgeHealthService: Symbol.for('KnowledgeHealthService'),
  RecommendationService: Symbol.for('RecommendationService'),

  // 导出服务
  ExportFactory: Symbol.for('ExportFactory'),

  // 基础设施
  StorageAdapter: Symbol.for('StorageAdapter'),
  AssetManager: Symbol.for('AssetManager'),

  // 事件总线
  EventBus: Symbol.for('EventBus'),

  // 文件打开策略
  FileOpenerManager: Symbol.for('FileOpenerManager'),
  MarkdownFileOpenerStrategy: Symbol.for('MarkdownFileOpenerStrategy'),
  TextFileOpenerStrategy: Symbol.for('TextFileOpenerStrategy'),
  JsonFileOpenerStrategy: Symbol.for('JsonFileOpenerStrategy'),
  ImageFileOpenerStrategy: Symbol.for('ImageFileOpenerStrategy'),
} as const;

export interface ServiceContainer {
  get<T>(serviceIdentifier: symbol): T;
  bind<T>(serviceIdentifier: symbol): BindingToSyntax<T>;
}

export interface BindingToSyntax<T> {
  to(constructor: new (...args: any[]) => T): void;
  toConstantValue(value: T): void;
  toSingleton(constructor: new (...args: any[]) => T): void;
}
