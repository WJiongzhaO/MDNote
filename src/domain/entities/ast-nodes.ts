import type { ASTNode } from './ast-node.interface';
import { NodeType, type TextMark } from '../types/knowledge-fragment.types';

/**
 * 文本节点
 */
export class TextNode implements ASTNode {
  readonly type = NodeType.TEXT;
  readonly children: ASTNode[] = [];
  
  constructor(
    public readonly content: string,
    public readonly marks: TextMark[] = []
  ) {}

  toMarkdown(): string {
    let result = this.content;
    
    // 应用标记
    if (this.marks.includes('bold')) {
      result = `**${result}**`;
    }
    if (this.marks.includes('italic')) {
      result = `*${result}*`;
    }
    if (this.marks.includes('code')) {
      result = `\`${result}\``;
    }
    if (this.marks.includes('strikethrough')) {
      result = `~~${result}~~`;
    }
    
    return result;
  }

  toJSON(): any {
    return {
      type: this.type,
      content: this.content,
      marks: this.marks
    };
  }

  static fromJSON(data: any): TextNode {
    return new TextNode(data.content || '', data.marks || []);
  }
}

/**
 * 图片节点
 */
export class ImageNode implements ASTNode {
  readonly type = NodeType.IMAGE;
  readonly children: ASTNode[] = [];

  constructor(
    public readonly src: string,
    public readonly alt: string = '',
    public readonly assetId?: string
  ) {}

  /**
   * 获取资源路径
   */
  getAssetPath(): string {
    return this.assetId || this.src;
  }

  toMarkdown(): string {
    return `![${this.alt}](${this.src})`;
  }

  toJSON(): any {
    return {
      type: this.type,
      src: this.src,
      alt: this.alt,
      assetId: this.assetId
    };
  }

  static fromJSON(data: any): ImageNode {
    return new ImageNode(data.src || '', data.alt || '', data.assetId);
  }
}

/**
 * 标题节点
 */
export class HeadingNode implements ASTNode {
  readonly type = NodeType.HEADING;
  readonly children: ASTNode[] = [];

  constructor(
    public readonly level: number,
    public readonly text: string = ''
  ) {
    if (level < 1 || level > 6) {
      throw new Error('Heading level must be between 1 and 6');
    }
  }

  toMarkdown(): string {
    const prefix = '#'.repeat(this.level);
    return `${prefix} ${this.text}`;
  }

  toJSON(): any {
    return {
      type: this.type,
      level: this.level,
      text: this.text
    };
  }

  static fromJSON(data: any): HeadingNode {
    return new HeadingNode(data.level || 1, data.text || '');
  }
}

/**
 * 代码块节点
 */
export class CodeBlockNode implements ASTNode {
  readonly type = NodeType.CODE_BLOCK;
  readonly children: ASTNode[] = [];

  constructor(
    public readonly content: string,
    public readonly language: string = ''
  ) {}

  /**
   * 判断是否为Mermaid图表
   */
  isMermaid(): boolean {
    return this.language.toLowerCase() === 'mermaid';
  }

  /**
   * 判断是否为数学公式
   */
  isFormula(): boolean {
    return this.language.toLowerCase() === 'math' || 
           this.language.toLowerCase() === 'latex' ||
           this.language.toLowerCase() === 'katex';
  }

  toMarkdown(): string {
    if (this.language) {
      return `\`\`\`${this.language}\n${this.content}\n\`\`\``;
    }
    return `\`\`\`\n${this.content}\n\`\`\``;
  }

  toJSON(): any {
    return {
      type: this.type,
      content: this.content,
      language: this.language
    };
  }

  static fromJSON(data: any): CodeBlockNode {
    return new CodeBlockNode(data.content || '', data.language || '');
  }
}

/**
 * 容器节点（段落、列表等）
 */
export class ContainerNode implements ASTNode {
  readonly type: NodeType;
  readonly children: ASTNode[] = [];

  constructor(
    type: NodeType.CONTAINER | NodeType.PARAGRAPH | NodeType.LIST | NodeType.LIST_ITEM,
    children: ASTNode[] = []
  ) {
    this.type = type;
    this.children = children;
  }

  toMarkdown(): string {
    const childrenMarkdown = this.children.map(child => child.toMarkdown()).join('');
    
    if (this.type === NodeType.LIST) {
      return childrenMarkdown;
    }
    if (this.type === NodeType.LIST_ITEM) {
      return `- ${childrenMarkdown}\n`;
    }
    if (this.type === NodeType.PARAGRAPH) {
      return `${childrenMarkdown}\n\n`;
    }
    
    return childrenMarkdown;
  }

  toJSON(): any {
    return {
      type: this.type,
      children: this.children.map(child => child.toJSON())
    };
  }

  static fromJSON(data: any): ContainerNode {
    const children = (data.children || []).map((childData: any) => {
      return createNodeFromJSON(childData);
    });
    return new ContainerNode(data.type || NodeType.CONTAINER, children);
  }
}

/**
 * 从JSON创建节点（工厂函数）
 */
export function createNodeFromJSON(data: any): ASTNode {
  if (!data || !data.type) {
    throw new Error('Invalid node data: missing type');
  }

  switch (data.type) {
    case NodeType.TEXT:
      return TextNode.fromJSON(data);
    case NodeType.IMAGE:
      return ImageNode.fromJSON(data);
    case NodeType.HEADING:
      return HeadingNode.fromJSON(data);
    case NodeType.CODE_BLOCK:
      return CodeBlockNode.fromJSON(data);
    case NodeType.CONTAINER:
    case NodeType.PARAGRAPH:
    case NodeType.LIST:
    case NodeType.LIST_ITEM:
      return ContainerNode.fromJSON(data);
    default:
      throw new Error(`Unknown node type: ${data.type}`);
  }
}


