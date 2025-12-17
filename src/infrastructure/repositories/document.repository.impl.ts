import { Document } from '../../domain/entities/document.entity';
import type { DocumentId, DocumentTitle, FolderId } from '../../domain/types/document.types';
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryDocumentRepository implements DocumentRepository {
  private documents: Map<string, DocumentData> = new Map();

  async save(document: Document): Promise<void> {
    const documentData: DocumentData = {
      id: document.getId().value,
      title: document.getTitle().value,
      content: document.getContent().value,
      folderId: document.getFolderId().value,
      createdAt: document.getCreatedAt().value,
      updatedAt: document.getUpdatedAt().value
    };

    this.documents.set(document.getId().value, documentData);
  }

  async findById(id: DocumentId): Promise<Document | null> {
    const documentData = this.documents.get(id.value);

    if (!documentData) {
      return null;
    }

    return this.mapToEntity(documentData);
  }

  async findAll(): Promise<Document[]> {
    const documentsData = Array.from(this.documents.values());
    return documentsData.map(data => this.mapToEntity(data));
  }

  async findByTitle(title: DocumentTitle): Promise<Document[]> {
    const documentsData = Array.from(this.documents.values())
      .filter(data => data.title.toLowerCase().includes(title.value.toLowerCase()));

    return documentsData.map(data => this.mapToEntity(data));
  }

  async delete(id: DocumentId): Promise<void> {
    const exists = this.documents.has(id.value);
    if (!exists) {
      throw new Error(`Document with id ${id.value} not found`);
    }

    this.documents.delete(id.value);
  }

  async search(query: string): Promise<Document[]> {
    const lowerQuery = query.toLowerCase();
    const documentsData = Array.from(this.documents.values())
      .filter(data =>
        data.title.toLowerCase().includes(lowerQuery) ||
        data.content.toLowerCase().includes(lowerQuery)
      );

    return documentsData.map(data => this.mapToEntity(data));
  }

  async findByFolderId(folderId: FolderId): Promise<Document[]> {
    const documentsData = Array.from(this.documents.values())
      .filter(data => data.folderId === folderId.value);

    return documentsData.map(data => this.mapToEntity(data));
  }

  private mapToEntity(data: DocumentData): Document {
    return new Document(
      { value: data.id },
      { value: data.title },
      { value: data.content },
      { value: data.folderId },
      { value: data.createdAt },
      { value: data.updatedAt }
    );
  }
}
