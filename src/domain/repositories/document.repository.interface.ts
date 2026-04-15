import type { Document } from '../entities/document.entity';
import { DocumentId, DocumentTitle, FolderId } from '../types/document.types';

export interface DocumentReader {
  findById(id: DocumentId): Promise<Document | null>;
}

export interface DocumentRepository extends DocumentReader {
  save(document: Document): Promise<void>;
  findAll(): Promise<Document[]>;
  findByTitle(title: DocumentTitle): Promise<Document[]>;
  findByFolderId(folderId: FolderId): Promise<Document[]>;
  delete(id: DocumentId): Promise<void>;
  search(query: string): Promise<Document[]>;
}