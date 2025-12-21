import type {
  DocumentId,
  DocumentTitle,
  DocumentContent,
  FolderId,
  CreatedAt,
  UpdatedAt,
  DocumentFragmentReference
} from '../types/document.types';

export class Document {
  private readonly id: DocumentId;
  private title: DocumentTitle;
  private content: DocumentContent;
  private folderId: FolderId;
  private fragmentReferences: DocumentFragmentReference[];  // 文档中的片段引用
  private readonly createdAt: CreatedAt;
  private updatedAt: UpdatedAt;

  constructor(
    id: DocumentId,
    title: DocumentTitle,
    content: DocumentContent,
    folderId: FolderId,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt,
    fragmentReferences: DocumentFragmentReference[] = []
  ) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.folderId = folderId;
    this.fragmentReferences = fragmentReferences;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(title: DocumentTitle, content: DocumentContent, folderId: FolderId = { value: null }): Document {
    const now = new Date();
    const id = crypto.randomUUID();

    return new Document(
      { value: id },
      title,
      content,
      folderId,
      { value: now },
      { value: now },
      []
    );
  }

  updateTitle(title: DocumentTitle): void {
    this.title = title;
    this.updatedAt = { value: new Date() };
  }

  updateContent(content: DocumentContent): void {
    this.content = content;
    this.updatedAt = { value: new Date() };
  }

  updateFolderId(folderId: FolderId): void {
    this.folderId = folderId;
    this.updatedAt = { value: new Date() };
  }

  update(title: DocumentTitle, content: DocumentContent, folderId?: FolderId): void {
    this.title = title;
    this.content = content;
    if (folderId !== undefined) {
      this.folderId = folderId;
    }
    this.updatedAt = { value: new Date() };
  }

  getId(): DocumentId {
    return this.id;
  }

  getTitle(): DocumentTitle {
    return this.title;
  }

  getContent(): DocumentContent {
    return this.content;
  }

  getFolderId(): FolderId {
    return this.folderId;
  }

  getCreatedAt(): CreatedAt {
    return this.createdAt;
  }

  getUpdatedAt(): UpdatedAt {
    return this.updatedAt;
  }

  equals(other: Document): boolean {
    return this.id.value === other.id.value;
  }

  /**
   * 添加片段引用
   */
  addFragmentReference(
    fragmentId: string,
    fragmentTitle: string,
    position: number,
    length: number
  ): void {
    const existingIndex = this.fragmentReferences.findIndex(
      ref => ref.fragmentId === fragmentId && ref.position === position
    );
    if (existingIndex === -1) {
      this.fragmentReferences.push({
        fragmentId,
        fragmentTitle,
        position,
        length,
        isConnected: true
      });
      this.updatedAt = { value: new Date() };
    }
  }

  /**
   * 移除片段引用
   */
  removeFragmentReference(fragmentId: string): void {
    const index = this.fragmentReferences.findIndex(
      ref => ref.fragmentId === fragmentId
    );
    if (index !== -1) {
      this.fragmentReferences.splice(index, 1);
      this.updatedAt = { value: new Date() };
    }
  }

  /**
   * 断开引用连接
   */
  disconnectFragmentReference(fragmentId: string, originalContent: string): void {
    const reference = this.fragmentReferences.find(
      ref => ref.fragmentId === fragmentId
    );
    if (reference) {
      reference.isConnected = false;
      reference.originalContent = originalContent;
      this.updatedAt = { value: new Date() };
    }
  }

  /**
   * 重新连接引用
   */
  reconnectFragmentReference(fragmentId: string): void {
    const reference = this.fragmentReferences.find(
      ref => ref.fragmentId === fragmentId
    );
    if (reference) {
      reference.isConnected = true;
      reference.originalContent = undefined;
      this.updatedAt = { value: new Date() };
    }
  }

  /**
   * 获取所有引用
   */
  getFragmentReferences(): DocumentFragmentReference[] {
    return [...this.fragmentReferences];
  }

  /**
   * 检查位置是否在引用区域内
   */
  isPositionInReference(position: number): DocumentFragmentReference | null {
    return this.fragmentReferences.find(
      ref => position >= ref.position && position <= ref.position + ref.length
    ) || null;
  }
}
