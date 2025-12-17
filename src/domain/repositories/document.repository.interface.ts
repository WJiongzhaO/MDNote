import { Document } from '../entities/document.entity';
import { DocumentId, DocumentTitle, FolderId } from '../types/document.types';

export interface DocumentRepository {
  save(document: Document): Promise<void>;
  findById(id: DocumentId): Promise<Document | null>;
  findAll(): Promise<Document[]>;
  findByTitle(title: DocumentTitle): Promise<Document[]>;
  findByFolderId(folderId: FolderId): Promise<Document[]>;
  delete(id: DocumentId): Promise<void>;
  search(query: string): Promise<Document[]>;
}