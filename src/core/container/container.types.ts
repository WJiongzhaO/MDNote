/**
 * 依赖注入容器类型定义
 */
export const TYPES = {
  // 仓储接口
  DocumentRepository: Symbol.for('DocumentRepository'),
  FolderRepository: Symbol.for('FolderRepository'),
  
  // 领域服务
  MarkdownProcessor: Symbol.for('MarkdownProcessor'),
  ExtensibleMarkdownProcessor: Symbol.for('ExtensibleMarkdownProcessor'),
  TemplateProcessor: Symbol.for('TemplateProcessor'),
  MathRenderer: Symbol.for('MathRenderer'),
  MermaidRenderer: Symbol.for('MermaidRenderer'),
  MermaidMarkdownExtension: Symbol.for('MermaidMarkdownExtension'),
  MarkdownProcessorInitializer: Symbol.for('MarkdownProcessorInitializer'),
  
  // 应用服务
  ApplicationService: Symbol.for('ApplicationService'),
  DocumentUseCases: Symbol.for('DocumentUseCases'),
  FolderUseCases: Symbol.for('FolderUseCases'),
  
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