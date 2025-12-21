import type {
  KnowledgeFragmentId,
  KnowledgeFragmentTitle,
  KnowledgeFragmentTags,
  KnowledgeFragmentAssetDependencies,
  FragmentReference
} from '../types/knowledge-fragment.types';
import { NodeType } from '../types/knowledge-fragment.types';
import type { ASTNode } from './ast-node.interface';
import { createNodeFromJSON } from './ast-nodes';

/**
 * 知识片段实体（聚合根）
 * 
 * 知识片段是一个可复用的内容片段，可以包含：
 * - 文本内容
 * - 图片
 * - 图表（Mermaid）
 * - 公式
 * - 代码块
 * 
 * 知识片段可以在多个文档中引用，支持标签管理和搜索。
 */
export class KnowledgeFragment {
  private readonly id: KnowledgeFragmentId;
  private title: KnowledgeFragmentTitle;
  private tags: KnowledgeFragmentTags;
  private nodes: ASTNode[];
  private assetDependencies: KnowledgeFragmentAssetDependencies;
  private sourceDocumentId?: string;  // 源文档ID（创建片段时的文档）
  private referencedDocuments: FragmentReference[];  // 引用该片段的文档列表
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(
    id: KnowledgeFragmentId,
    title: KnowledgeFragmentTitle,
    tags: KnowledgeFragmentTags,
    nodes: ASTNode[],
    assetDependencies: KnowledgeFragmentAssetDependencies,
    createdAt: Date,
    updatedAt: Date,
    sourceDocumentId?: string,
    referencedDocuments: FragmentReference[] = []
  ) {
    this.id = id;
    this.title = title;
    this.tags = tags;
    this.nodes = nodes;
    this.assetDependencies = assetDependencies;
    this.sourceDocumentId = sourceDocumentId;
    this.referencedDocuments = referencedDocuments;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * 工厂方法：创建新的知识片段
   */
  static create(
    title: KnowledgeFragmentTitle,
    nodes: ASTNode[] = [],
    tags: string[] = []
  ): KnowledgeFragment {
    const now = new Date();
    const id = crypto.randomUUID();

    return new KnowledgeFragment(
      { value: id },
      title,
      { value: tags },
      nodes,
      { value: [] },
      now,
      now,
      undefined,
      []
    );
  }

  /**
   * 更新标题
   */
  updateTitle(title: KnowledgeFragmentTitle): void {
    this.title = title;
    this.updatedAt = new Date();
  }

  /**
   * 更新节点
   */
  updateNodes(nodes: ASTNode[]): void {
    this.nodes = nodes;
    this.updateAssetDependencies();
    this.updatedAt = new Date();
  }

  /**
   * 添加节点
   */
  addNode(node: ASTNode): void {
    this.nodes.push(node);
    this.updateAssetDependencies();
    this.updatedAt = new Date();
  }

  /**
   * 更新标签
   */
  updateTags(tags: string[]): void {
    this.tags = { value: tags };
    this.updatedAt = new Date();
  }

  /**
   * 添加标签
   */
  addTag(tag: string): void {
    if (!this.tags.value.includes(tag)) {
      this.tags.value.push(tag);
      this.updatedAt = new Date();
    }
  }

  /**
   * 移除标签
   */
  removeTag(tag: string): void {
    const index = this.tags.value.indexOf(tag);
    if (index !== -1) {
      this.tags.value.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * 更新资源依赖（自动从节点中提取）
   */
  private updateAssetDependencies(): void {
    const dependencies: string[] = [];
    
    const extractDependencies = (node: ASTNode): void => {
      // 检查图片节点
      if (node.type === NodeType.IMAGE) {
        const imageNode = node as any;
        if (imageNode.assetId) {
          dependencies.push(imageNode.assetId);
        }
      }
      // 检查代码块节点（Mermaid图表）
      if (node.type === NodeType.CODE_BLOCK) {
        const codeBlock = node as any;
        if (codeBlock.isMermaid && codeBlock.isMermaid() && codeBlock.assetId) {
          dependencies.push(codeBlock.assetId);
        }
      }
      // 安全地访问 children 属性
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(extractDependencies);
      }
    };

    this.nodes.forEach(extractDependencies);
    this.assetDependencies = { value: dependencies };
  }

  /**
   * 转换为Markdown格式
   */
  toMarkdown(): string {
    return this.nodes.map(node => node.toMarkdown()).join('\n\n');
  }

  /**
   * 转换为JSON格式（用于序列化）
   */
  toJSON(): string {
    return JSON.stringify({
      id: this.id.value,
      title: this.title.value,
      tags: this.tags.value,
      nodes: this.nodes.map(node => node.toJSON()),
      assetDependencies: this.assetDependencies.value,
      sourceDocumentId: this.sourceDocumentId,
      referencedDocuments: this.referencedDocuments.map(ref => ({
        documentId: ref.documentId,
        documentTitle: ref.documentTitle,
        referencedAt: ref.referencedAt.toISOString(),
        isConnected: ref.isConnected
      })),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    });
  }

  /**
   * 从JSON创建知识片段（反序列化）
   */
  static fromJSON(json: string): KnowledgeFragment {
    const data = JSON.parse(json);
    const nodes = (data.nodes || []).map((nodeData: any) => createNodeFromJSON(nodeData));
    const referencedDocuments = (data.referencedDocuments || []).map((ref: any) => ({
      documentId: ref.documentId,
      documentTitle: ref.documentTitle,
      referencedAt: new Date(ref.referencedAt),
      isConnected: ref.isConnected !== undefined ? ref.isConnected : true
    }));

    return new KnowledgeFragment(
      { value: data.id },
      { value: data.title },
      { value: data.tags || [] },
      nodes,
      { value: data.assetDependencies || [] },
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.sourceDocumentId,
      referencedDocuments
    );
  }

  // Getters
  getId(): KnowledgeFragmentId {
    return this.id;
  }

  getTitle(): KnowledgeFragmentTitle {
    return this.title;
  }

  getTags(): KnowledgeFragmentTags {
    return this.tags;
  }

  getNodes(): ASTNode[] {
    return this.nodes;
  }

  getAssetDependencies(): KnowledgeFragmentAssetDependencies {
    return this.assetDependencies;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  equals(other: KnowledgeFragment): boolean {
    return this.id.value === other.id.value;
  }

  /**
   * 设置源文档ID
   */
  setSourceDocument(documentId: string): void {
    this.sourceDocumentId = documentId;
    this.updatedAt = new Date();
  }

  /**
   * 添加引用文档
   */
  addReferencedDocument(documentId: string, documentTitle: string): void {
    const existingIndex = this.referencedDocuments.findIndex(
      ref => ref.documentId === documentId
    );
    if (existingIndex === -1) {
      this.referencedDocuments.push({
        documentId,
        documentTitle,
        referencedAt: new Date(),
        isConnected: true
      });
      this.updatedAt = new Date();
    }
  }

  /**
   * 移除引用文档
   */
  removeReferencedDocument(documentId: string): void {
    const index = this.referencedDocuments.findIndex(
      ref => ref.documentId === documentId
    );
    if (index !== -1) {
      this.referencedDocuments.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * 标记引用为断开连接
   */
  disconnectReference(documentId: string): void {
    const reference = this.referencedDocuments.find(
      ref => ref.documentId === documentId
    );
    if (reference) {
      reference.isConnected = false;
      this.updatedAt = new Date();
    }
  }

  /**
   * 标记引用为已连接
   */
  connectReference(documentId: string): void {
    const reference = this.referencedDocuments.find(
      ref => ref.documentId === documentId
    );
    if (reference) {
      reference.isConnected = true;
      this.updatedAt = new Date();
    }
  }

  /**
   * 获取所有引用文档
   */
  getReferencedDocuments(): FragmentReference[] {
    return [...this.referencedDocuments];
  }

  /**
   * 获取已连接的引用文档
   */
  getConnectedReferences(): FragmentReference[] {
    return this.referencedDocuments.filter(ref => ref.isConnected);
  }

  /**
   * 获取源文档ID
   */
  getSourceDocumentId(): string | undefined {
    return this.sourceDocumentId;
  }
}

