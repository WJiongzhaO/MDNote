import { Document } from '../../domain/entities/document.entity';
import type { DocumentId, DocumentTitle, DocumentContent, FolderId } from '../../domain/types/document.types';
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class LocalStorageDocumentRepository implements DocumentRepository {
  private readonly STORAGE_KEY = 'mdnote-documents';

  async save(document: Document): Promise<void> {
    const documents = this.getAllDocumentsFromStorage();
    const documentData: DocumentData = {
      id: document.getId().value,
      title: document.getTitle().value,
      content: document.getContent().value,
      folderId: document.getFolderId().value,
      createdAt: document.getCreatedAt().value.toISOString(),
      updatedAt: document.getUpdatedAt().value.toISOString()
    };

    const existingIndex = documents.findIndex(doc => doc.id === documentData.id);
    if (existingIndex !== -1) {
      documents[existingIndex] = documentData;
    } else {
      documents.push(documentData);
    }

    this.saveDocumentsToStorage(documents);
  }

  async findById(id: DocumentId): Promise<Document | null> {
    const documents = this.getAllDocumentsFromStorage();
    const documentData = documents.find(doc => doc.id === id.value);

    if (!documentData) {
      return null;
    }

    return this.mapToEntity(documentData);
  }

  async findAll(): Promise<Document[]> {
    const documentsData = this.getAllDocumentsFromStorage();
    return documentsData.map(data => this.mapToEntity(data));
  }

  async findByFolderId(folderId: FolderId): Promise<Document[]> {
    const documentsData = this.getAllDocumentsFromStorage()
      .filter(data => data.folderId === folderId.value);

    return documentsData.map(data => this.mapToEntity(data));
  }

  async delete(id: DocumentId): Promise<void> {
    const documents = this.getAllDocumentsFromStorage();
    const exists = documents.some(doc => doc.id === id.value);

    if (!exists) {
      throw new Error(`Document with id ${id.value} not found`);
    }

    const filteredDocuments = documents.filter(doc => doc.id !== id.value);
    this.saveDocumentsToStorage(filteredDocuments);
  }

  async search(query: string): Promise<Document[]> {
    const lowerQuery = query.toLowerCase();
    const documentsData = this.getAllDocumentsFromStorage()
      .filter(data =>
        data.title.toLowerCase().includes(lowerQuery) ||
        data.content.toLowerCase().includes(lowerQuery)
      );

    return documentsData.map(data => this.mapToEntity(data));
  }

  private getAllDocumentsFromStorage(): DocumentData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading documents from localStorage:', error);
      return [];
    }
  }

  private saveDocumentsToStorage(documents: DocumentData[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents));
    } catch (error) {
      console.error('Error saving documents to localStorage:', error);
      throw new Error('Failed to save documents to local storage');
    }
  }

  private mapToEntity(data: DocumentData): Document {
    return new Document(
      { value: data.id },
      { value: data.title },
      { value: data.content },
      { value: data.folderId },
      { value: new Date(data.createdAt) },
      { value: new Date(data.updatedAt) }
    );
  }
}