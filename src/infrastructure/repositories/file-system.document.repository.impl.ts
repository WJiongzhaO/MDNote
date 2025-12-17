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

export class FileSystemDocumentRepository implements DocumentRepository {
  private readonly FILE_NAME = 'documents.json';

  async save(document: Document): Promise<void> {
    const documents = await this.getAllDocumentsFromFile();
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

    await this.saveDocumentsToFile(documents);
  }

  async findById(id: DocumentId): Promise<Document | null> {
    const documents = await this.getAllDocumentsFromFile();
    const documentData = documents.find(doc => doc.id === id.value);

    if (!documentData) {
      return null;
    }

    return this.mapToEntity(documentData);
  }

  async findAll(): Promise<Document[]> {
    const documentsData = await this.getAllDocumentsFromFile();
    return documentsData.map(data => this.mapToEntity(data));
  }

  async findByFolderId(folderId: FolderId): Promise<Document[]> {
    const documentsData = (await this.getAllDocumentsFromFile())
      .filter(data => data.folderId === folderId.value);

    return documentsData.map(data => this.mapToEntity(data));
  }

  async delete(id: DocumentId): Promise<void> {
    const documents = await this.getAllDocumentsFromFile();
    const exists = documents.some(doc => doc.id === id.value);

    if (!exists) {
      throw new Error(`Document with id ${id.value} not found`);
    }

    const filteredDocuments = documents.filter(doc => doc.id !== id.value);
    await this.saveDocumentsToFile(filteredDocuments);
  }

  async search(query: string): Promise<Document[]> {
    const lowerQuery = query.toLowerCase();
    const documentsData = (await this.getAllDocumentsFromFile())
      .filter(data =>
        data.title.toLowerCase().includes(lowerQuery) ||
        data.content.toLowerCase().includes(lowerQuery)
      );

    return documentsData.map(data => this.mapToEntity(data));
  }

  private async getAllDocumentsFromFile(): Promise<DocumentData[]> {
    try {
      // 类型断言，确保 TypeScript 知道 electronAPI 存在于 window 对象上
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        throw new Error('electronAPI is not available');
      }

      const data = await electronAPI.file.read(this.FILE_NAME);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading documents from file:', error);
      return [];
    }
  }

  private async saveDocumentsToFile(documents: DocumentData[]): Promise<void> {
    try {
      // 类型断言，确保 TypeScript 知道 electronAPI 存在于 window 对象上
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        throw new Error('electronAPI is not available');
      }

      await electronAPI.file.write(this.FILE_NAME, documents);
    } catch (error) {
      console.error('Error saving documents to file:', error);
      throw new Error('Failed to save documents to file system');
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