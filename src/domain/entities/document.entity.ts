import type {
  DocumentId,
  DocumentTitle,
  DocumentContent,
  FolderId,
  CreatedAt,
  UpdatedAt
} from '../types/document.types';

export class Document {
  private readonly id: DocumentId;
  private title: DocumentTitle;
  private content: DocumentContent;
  private folderId: FolderId;
  private readonly createdAt: CreatedAt;
  private updatedAt: UpdatedAt;

  constructor(
    id: DocumentId,
    title: DocumentTitle,
    content: DocumentContent,
    folderId: FolderId,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt
  ) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.folderId = folderId;
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
      { value: now }
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
}
