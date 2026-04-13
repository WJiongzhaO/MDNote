import type {
  DocumentId,
  DocumentTitle,
  DocumentContent,
  FolderId,
  CreatedAt,
  UpdatedAt,
  DocumentFragmentReference,
} from '../types/document.types'

export class Document {
  private readonly id: DocumentId
  private title: DocumentTitle
  private content: DocumentContent
  private folderId: FolderId
  private fragmentReferences: DocumentFragmentReference[]
  private readonly createdAt: CreatedAt
  private updatedAt: UpdatedAt

  constructor(
    id: DocumentId,
    title: DocumentTitle,
    content: DocumentContent,
    folderId: FolderId,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
    fragmentReferences: DocumentFragmentReference[] = [],
  ) {
    this.id = id
    this.title = title
    this.content = content
    this.folderId = folderId
    this.fragmentReferences = fragmentReferences
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  static create(
    title: DocumentTitle,
    content: DocumentContent,
    folderId: FolderId = { value: null },
  ): Document {
    const now = new Date()
    const id = crypto.randomUUID()
    return new Document({ value: id }, title, content, folderId, { value: now }, { value: now }, [])
  }

  updateTitle(title: DocumentTitle): void {
    this.title = title
    this.updatedAt = { value: new Date() }
  }

  updateContent(content: DocumentContent): void {
    this.content = content
    this.updatedAt = { value: new Date() }
  }

  updateFolderId(folderId: FolderId): void {
    this.folderId = folderId
    this.updatedAt = { value: new Date() }
  }

  update(title: DocumentTitle, content: DocumentContent, folderId?: FolderId): void {
    this.title = title
    this.content = content
    if (folderId) {
      this.folderId = folderId
    }
    this.updatedAt = { value: new Date() }
  }

  getId(): DocumentId {
    return this.id
  }

  getTitle(): DocumentTitle {
    return this.title
  }

  getContent(): DocumentContent {
    return this.content
  }

  getFolderId(): FolderId {
    return this.folderId
  }

  getCreatedAt(): CreatedAt {
    return this.createdAt
  }

  getUpdatedAt(): UpdatedAt {
    return this.updatedAt
  }

  /**
   * 添加片段引用（支持同一片段多次引用）
   */
  addFragmentReference(
    fragmentId: string,
    fragmentTitle: string,
    position: number,
    length: number,
  ): void {
    this.fragmentReferences.push({
      fragmentId,
      fragmentTitle,
      position,
      length,
      isConnected: true,
    })
    this.updatedAt = { value: new Date() }
  }

  /**
   * 移除该片段的所有引用
   */
  removeFragmentReference(fragmentId: string): void {
    this.fragmentReferences = this.fragmentReferences.filter((ref) => ref.fragmentId !== fragmentId)
    this.updatedAt = { value: new Date() }
  }

  /**
   * 断开引用
   */
  disconnectFragmentReference(fragmentId: string, originalContent: string): void {
    const references = this.fragmentReferences.filter((ref) => ref.fragmentId === fragmentId)
    for (const reference of references) {
      reference.isConnected = false
      reference.originalContent = originalContent
    }
    this.updatedAt = { value: new Date() }
  }

  /**
   * 重新连接引用
   */
  reconnectFragmentReference(fragmentId: string): void {
    const references = this.fragmentReferences.filter((ref) => ref.fragmentId === fragmentId)
    for (const reference of references) {
      reference.isConnected = true
    }
    this.updatedAt = { value: new Date() }
  }

  /**
   * 获取所有片段引用
   */
  getFragmentReferences(): DocumentFragmentReference[] {
    return [...this.fragmentReferences]
  }

  /**
   * 检查位置是否在引用区域内
   */
  isPositionInReference(position: number): DocumentFragmentReference | null {
    return (
      this.fragmentReferences.find(
        (ref) => position >= ref.position && position <= ref.position + ref.length,
      ) || null
    )
  }
}
