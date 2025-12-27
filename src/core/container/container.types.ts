/**
 * 依赖注入容器类型定义
 */
export const TYPES = {
  // 仓储接口
  DocumentRepository: Symbol.for('DocumentRepository'),
  FolderRepository: Symbol.for('FolderRepository'),
  KnowledgeFragmentRepository: Symbol.for('KnowledgeFragmentRepository'),
  GitRepository: Symbol.for('GitRepository'),
  
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
  GitUseCases: Symbol.for('GitUseCases'),
  VariableUseCases: Symbol.for('VariableUseCases'),
  
  // 基础设施
  StorageAdapter: Symbol.for('StorageAdapter'),
  AssetManager: Symbol.for('AssetManager'),
  
  // 事件总线
  EventBus: Symbol.for('EventBus'),
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