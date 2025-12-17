import type {
  DocumentId,
  DocumentTitle,
  DocumentContent,
  CreatedAt,
  UpdatedAt
} from '../types/document.types';

export class Document {
  private readonly id: DocumentId;
  private title: DocumentTitle;
  private content: DocumentContent;
  private readonly createdAt: CreatedAt;
  private updatedAt: UpdatedAt;

  constructor(
    id: DocumentId,
    title: DocumentTitle,
    content: DocumentContent,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt
  ) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(title: DocumentTitle, content: DocumentContent): Document {
    const now = new Date();
    const id = crypto.randomUUID();

    return new Document(
      { value: id },
      title,
      content,
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

  update(title: DocumentTitle, content: DocumentContent): void {
    this.title = title;
    this.content = content;
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