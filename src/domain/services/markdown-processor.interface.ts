export interface MarkdownProcessor {
  processMarkdown(content: string): Promise<string>;
  extractTitle(content: string): string;
  generateSlug(title: string): string;
  registerExtension(extension: MarkdownExtension): void;
  unregisterExtension(extensionName: string): void;
}

export interface ExtensibleMarkdownProcessor extends MarkdownProcessor {
  setTemplateProcessor(processor: TemplateProcessor): void;
  setMathRenderer(renderer: MathRenderer): void;
  setMermaidRenderer(renderer: MermaidRenderer): void;
}

export interface MarkdownExtension {
  name: string;
  priority: number;
  preProcess?(content: string): string;
  postProcess?(content: string): string;
  tokenizer?: any;
  renderer?: any;
}

export interface TemplateProcessor {
  processTemplate(content: string, variables: Record<string, any>): Promise<string>;
  extractVariables(content: string): string[];
  registerVariableResolver(name: string, resolver: VariableResolver): void;
}

export interface VariableResolver {
  resolve(variableName: string, context: any): Promise<string>;
}

export interface MathRenderer {
  renderInline(math: string): string;
  renderBlock(math: string): string;
  supportsFormat(format: string): boolean;
}

export interface MermaidRenderer {
  renderDiagram(diagram: string, options?: MermaidRenderOptions): Promise<string>;
  supportsDiagramType(diagramType: string): boolean;
  initialize(): Promise<void>;
}

export interface MermaidRenderOptions {
  theme?: string;
  backgroundColor?: string;
  fontFamily?: string;
  securityLevel?: 'strict' | 'loose' | 'antiscript';
}

export interface DocumentProcessor {
  processDocument(content: string, options?: DocumentProcessingOptions): Promise<ProcessedDocument>;
}

export interface ProcessedDocument {
  html: string;
  metadata: DocumentMetadata;
  variables: string[];
  references: string[];
}

export interface DocumentMetadata {
  title: string;
  slug: string;
  wordCount: number;
  characterCount: number;
  estimatedReadingTime: number;
}

export interface DocumentProcessingOptions {
  variables?: Record<string, any>;
  templateEngine?: boolean;
  mathRendering?: boolean;
  sanitize?: boolean;
}