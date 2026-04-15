import type {
  KnowledgeFragmentId,
  KnowledgeFragmentTitle,
  KnowledgeFragmentTags,
  KnowledgeFragmentAssetDependencies,
  FragmentReference,
  FragmentStatus,
  FragmentVersionRecord,
} from '../types/knowledge-fragment.types'
import { NodeType, DEFAULT_TRUST_SCORE } from '../types/knowledge-fragment.types'
import type { ASTNode } from './ast-node.interface'
import { createNodeFromJSON } from './ast-nodes'

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
  private readonly id: KnowledgeFragmentId
  private title: KnowledgeFragmentTitle
  private tags: KnowledgeFragmentTags
  private nodes: ASTNode[]
  private assetDependencies: KnowledgeFragmentAssetDependencies
  private sourceDocumentId?: string // 源文档ID（创建片段时的文档）
  private referencedDocuments: FragmentReference[] // 引用该片段的文档列表
  private readonly createdAt: Date
  private updatedAt: Date
  // 工作2 资产化元数据
  private source: string
  private trustScore: number
  private lastVerifiedAt: Date | null
  private verifiedBy: string
  private categoryPathIds: string[]
  private status: FragmentStatus
  private derivedFromId: string | undefined
  private versionHistory: FragmentVersionRecord[]

  constructor(
    id: KnowledgeFragmentId,
    title: KnowledgeFragmentTitle,
    tags: KnowledgeFragmentTags,
    nodes: ASTNode[],
    assetDependencies: KnowledgeFragmentAssetDependencies,
    createdAt: Date,
    updatedAt: Date,
    sourceDocumentId?: string,
    referencedDocuments: FragmentReference[] = [],
    metadata?: {
      source?: string
      trustScore?: number
      lastVerifiedAt?: Date | null
      verifiedBy?: string
      categoryPathIds?: string[]
      status?: FragmentStatus
      derivedFromId?: string
    },
  ) {
    this.id = id
    this.title = title
    this.tags = tags
    this.nodes = nodes
    this.assetDependencies = assetDependencies
    this.sourceDocumentId = sourceDocumentId
    this.referencedDocuments = referencedDocuments
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    this.source = metadata?.source ?? ''
    this.trustScore = metadata?.trustScore ?? DEFAULT_TRUST_SCORE
    this.lastVerifiedAt = metadata?.lastVerifiedAt ?? null
    this.verifiedBy = metadata?.verifiedBy ?? ''
    this.categoryPathIds = metadata?.categoryPathIds ?? []
    this.status = metadata?.status ?? 'active'
    this.derivedFromId = metadata?.derivedFromId
    this.versionHistory = []
  }

  /**
   * 工厂方法：创建新的知识片段
   */
  static create(
    title: KnowledgeFragmentTitle,
    nodes: ASTNode[] = [],
    tags: string[] = [],
  ): KnowledgeFragment {
    const now = new Date()
    const id = crypto.randomUUID()

    return new KnowledgeFragment(
      { value: id },
      title,
      { value: tags },
      nodes,
      { value: [] },
      now,
      now,
      undefined,
      [],
      { status: 'active', trustScore: DEFAULT_TRUST_SCORE, categoryPathIds: [] },
    )
  }

  /**
   * 更新标题
   */
  updateTitle(title: KnowledgeFragmentTitle): void {
    this.title = title
    this.updatedAt = new Date()
  }

  /**
   * 更新节点
   */
  updateNodes(nodes: ASTNode[]): void {
    this.nodes = nodes
    this.updateAssetDependencies()
    this.updatedAt = new Date()
  }

  /**
   * 添加节点
   */
  addNode(node: ASTNode): void {
    this.nodes.push(node)
    this.updateAssetDependencies()
    this.updatedAt = new Date()
  }

  /**
   * 更新标签
   */
  updateTags(tags: string[]): void {
    this.tags = { value: tags }
    this.updatedAt = new Date()
  }

  /**
   * 添加标签
   */
  addTag(tag: string): void {
    if (!this.tags.value.includes(tag)) {
      this.tags.value.push(tag)
      this.updatedAt = new Date()
    }
  }

  /**
   * 移除标签
   */
  removeTag(tag: string): void {
    const index = this.tags.value.indexOf(tag)
    if (index !== -1) {
      this.tags.value.splice(index, 1)
      this.updatedAt = new Date()
    }
  }

  /** 工作2：一次性更新元数据（来源/可信度/验证信息） */
  updateMetadata(patch: {
    source?: string
    trustScore?: number
    lastVerifiedAt?: Date | null
    verifiedBy?: string
  }): void {
    if (patch.source !== undefined) this.source = patch.source
    if (patch.trustScore !== undefined) this.trustScore = patch.trustScore
    if (patch.lastVerifiedAt !== undefined) this.lastVerifiedAt = patch.lastVerifiedAt
    if (patch.verifiedBy !== undefined) this.verifiedBy = patch.verifiedBy
    this.updatedAt = new Date()
  }

  /** 工作2：更新生命周期状态 */
  updateStatus(status: FragmentStatus): void {
    this.status = status
    this.updatedAt = new Date()
  }

  /** 工作2：更新分类归属（多归属） */
  updateCategories(categoryPathIds: string[]): void {
    this.categoryPathIds = [...categoryPathIds]
    this.updatedAt = new Date()
  }

  /**
   * 更新资源依赖（自动从节点中提取）
   */
  private updateAssetDependencies(): void {
    const dependencies: string[] = []

    const extractDependencies = (node: ASTNode): void => {
      // 检查图片节点
      if (node.type === NodeType.IMAGE) {
        const imageNode = node as any
        if (imageNode.assetId) {
          dependencies.push(imageNode.assetId)
        }
      }
      // 检查代码块节点（Mermaid图表）
      if (node.type === NodeType.CODE_BLOCK) {
        const codeBlock = node as any
        if (codeBlock.isMermaid && codeBlock.isMermaid() && codeBlock.assetId) {
          dependencies.push(codeBlock.assetId)
        }
      }
      // 安全地访问 children 属性
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(extractDependencies)
      }
    }

    this.nodes.forEach(extractDependencies)
    this.assetDependencies = { value: dependencies }
  }

  /**
   * 转换为Markdown格式
   */
  toMarkdown(): string {
    return this.nodes.map((node) => node.toMarkdown()).join('\n\n')
  }

  /**
   * 转换为JSON格式（用于序列化）
   */
  toJSON(): string {
    return JSON.stringify({
      id: this.id.value,
      title: this.title.value,
      tags: this.tags.value,
      nodes: this.nodes.map((node) => node.toJSON()),
      assetDependencies: this.assetDependencies.value,
      sourceDocumentId: this.sourceDocumentId,
      referencedDocuments: this.referencedDocuments.map((ref) => ({
        documentId: ref.documentId,
        documentTitle: ref.documentTitle,
        referencedAt: ref.referencedAt.toISOString(),
        isConnected: ref.isConnected,
        referenceCount: (ref as any).referenceCount || 1,
      })),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      source: this.source,
      trustScore: this.trustScore,
      lastVerifiedAt: this.lastVerifiedAt?.toISOString() ?? null,
      verifiedBy: this.verifiedBy,
      categoryPathIds: this.categoryPathIds,
      status: this.status,
      derivedFromId: this.derivedFromId ?? undefined,
      versionHistory: this.versionHistory,
    })
  }

  /**
   * 从JSON创建知识片段（反序列化）
   */
  static fromJSON(json: string): KnowledgeFragment {
    const data = JSON.parse(json)
    const nodes = (data.nodes || []).map((nodeData: any) => createNodeFromJSON(nodeData))
    const referencedDocuments = (data.referencedDocuments || []).map((ref: any) => ({
      documentId: ref.documentId,
      documentTitle: ref.documentTitle,
      referencedAt: new Date(ref.referencedAt),
      isConnected: ref.isConnected !== undefined ? ref.isConnected : true,
      referenceCount: ref.referenceCount || 1,
    }))

    const fragment = new KnowledgeFragment(
      { value: data.id },
      { value: data.title },
      { value: data.tags || [] },
      nodes,
      { value: data.assetDependencies || [] },
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.sourceDocumentId,
      referencedDocuments,
      {
        source: data.source ?? '',
        trustScore: data.trustScore ?? DEFAULT_TRUST_SCORE,
        lastVerifiedAt: data.lastVerifiedAt ? new Date(data.lastVerifiedAt) : null,
        verifiedBy: data.verifiedBy ?? '',
        categoryPathIds: Array.isArray(data.categoryPathIds) ? data.categoryPathIds : [],
        status: data.status === 'archived' || data.status === 'deprecated' ? data.status : 'active',
        derivedFromId: data.derivedFromId || undefined,
      },
    )
    if (Array.isArray(data.versionHistory)) {
      fragment.versionHistory = data.versionHistory
    }
    return fragment
  }

  // Getters
  getId(): KnowledgeFragmentId {
    return this.id
  }

  getTitle(): KnowledgeFragmentTitle {
    return this.title
  }

  getTags(): KnowledgeFragmentTags {
    return this.tags
  }

  getNodes(): ASTNode[] {
    return this.nodes
  }

  getAssetDependencies(): KnowledgeFragmentAssetDependencies {
    return this.assetDependencies
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  getUpdatedAt(): Date {
    return this.updatedAt
  }

  equals(other: KnowledgeFragment): boolean {
    return this.id.value === other.id.value
  }

  /**
   * 设置源文档ID
   */
  setSourceDocument(documentId: string): void {
    this.sourceDocumentId = documentId
    this.updatedAt = new Date()
  }

  /**
   * 添加引用文档
   * 如果文档已存在，增加引用次数；否则添加新引用（从1开始）
   */
  addReferencedDocument(documentId: string, documentTitle: string): void {
    const existingRef = this.referencedDocuments.find((ref) => ref.documentId === documentId)
    if (existingRef) {
      // 文档已存在，增加引用次数
      const currentCount = (existingRef as any).referenceCount || 1
      ;(existingRef as any).referenceCount = currentCount + 1
      existingRef.referencedAt = new Date()
      existingRef.isConnected = true
    } else {
      // 第一次引用，从1开始
      this.referencedDocuments.push({
        documentId,
        documentTitle,
        referencedAt: new Date(),
        isConnected: true,
        referenceCount: 1,
      } as any)
    }
    this.updatedAt = new Date()
  }

  /**
   * 移除引用文档
   * 如果引用次数大于1，减少引用次数；否则完全移除引用
   */
  removeReferencedDocument(documentId: string): void {
    const ref = this.referencedDocuments.find((ref) => ref.documentId === documentId)
    if (ref) {
      const count = (ref as any).referenceCount || 1
      if (count > 1) {
        // 引用次数大于1，只减少次数
        ;(ref as any).referenceCount = count - 1
        ref.referencedAt = new Date()
      } else {
        // 引用次数为1，完全移除引用
        const index = this.referencedDocuments.findIndex((r) => r.documentId === documentId)
        if (index !== -1) {
          this.referencedDocuments.splice(index, 1)
        }
      }
      this.updatedAt = new Date()
    }
  }

  /**
   * 标记引用为断开连接
   */
  disconnectReference(documentId: string): void {
    const reference = this.referencedDocuments.find((ref) => ref.documentId === documentId)
    if (reference) {
      reference.isConnected = false
      this.updatedAt = new Date()
    }
  }

  /**
   * 标记引用为已连接
   */
  connectReference(documentId: string): void {
    const reference = this.referencedDocuments.find((ref) => ref.documentId === documentId)
    if (reference) {
      reference.isConnected = true
      this.updatedAt = new Date()
    }
  }

  /**
   * 获取所有引用文档
   */
  getReferencedDocuments(): FragmentReference[] {
    return [...this.referencedDocuments]
  }

  /**
   * 获取已连接的引用文档
   */
  getConnectedReferences(): FragmentReference[] {
    return this.referencedDocuments.filter((ref) => ref.isConnected)
  }

  /**
   * 获取源文档ID
   */
  getSourceDocumentId(): string | undefined {
    return this.sourceDocumentId
  }

  getSource(): string {
    return this.source
  }
  getTrustScore(): number {
    return this.trustScore
  }
  getLastVerifiedAt(): Date | null {
    return this.lastVerifiedAt
  }
  getVerifiedBy(): string {
    return this.verifiedBy
  }
  getCategoryPathIds(): string[] {
    return [...this.categoryPathIds]
  }
  getStatus(): FragmentStatus {
    return this.status
  }
  getDerivedFromId(): string | undefined {
    return this.derivedFromId
  }
  getVersionHistory(): FragmentVersionRecord[] {
    return [...this.versionHistory]
  }
}
