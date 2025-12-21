import { Document } from '../../domain/entities/document.entity';
import type { DocumentId, DocumentTitle, FolderId } from '../../domain/types/document.types';
import type { DocumentRepository } from '../../domain/repositories/document.repository.interface';

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 基于IndexedDB的文档仓储实现
 * 适用于浏览器环境，容量更大，支持存储二进制数据
 */
export class IndexedDBDocumentRepository implements DocumentRepository {
  private readonly DB_NAME = 'MDNoteDB';
  private readonly STORE_NAME = 'documents';
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('folderId', 'folderId', { unique: false });
          objectStore.createIndex('title', 'title', { unique: false });
        }
      };
    });
  }

  async save(document: Document): Promise<void> {
    const db = await this.initDB();
    const documentData: DocumentData = {
      id: document.getId().value,
      title: document.getTitle().value,
      content: document.getContent().value,
      folderId: document.getFolderId().value,
      createdAt: document.getCreatedAt().value.toISOString(),
      updatedAt: document.getUpdatedAt().value.toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(documentData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save document'));
    });
  }

  async findById(id: DocumentId): Promise<Document | null> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id.value);

      request.onsuccess = () => {
        const documentData = request.result;
        if (documentData) {
          resolve(this.mapToEntity(documentData));
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error('Failed to find document'));
    });
  }

  async findAll(): Promise<Document[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const documentsData = request.result as DocumentData[];
        resolve(documentsData.map(data => this.mapToEntity(data)));
      };

      request.onerror = () => reject(new Error('Failed to find all documents'));
    });
  }

  async findByFolderId(folderId: FolderId): Promise<Document[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('folderId');
      const request = index.getAll(folderId.value);

      request.onsuccess = () => {
        const documentsData = request.result as DocumentData[];
        resolve(documentsData.map(data => this.mapToEntity(data)));
      };

      request.onerror = () => reject(new Error('Failed to find documents by folder'));
    });
  }

  async findByTitle(title: DocumentTitle): Promise<Document[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('title');
      const request = index.getAll(title.value);

      request.onsuccess = () => {
        const documentsData = request.result as DocumentData[];
        resolve(documentsData.map(data => this.mapToEntity(data)));
      };

      request.onerror = () => reject(new Error('Failed to find documents by title'));
    });
  }

  async delete(id: DocumentId): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id.value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete document'));
    });
  }

  async search(query: string): Promise<Document[]> {
    const db = await this.initDB();
    const lowerQuery = query.toLowerCase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const documentsData = request.result as DocumentData[];
        const filtered = documentsData.filter(data =>
          data.title.toLowerCase().includes(lowerQuery) ||
          data.content.toLowerCase().includes(lowerQuery)
        );
        resolve(filtered.map(data => this.mapToEntity(data)));
      };

      request.onerror = () => reject(new Error('Failed to search documents'));
    });
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


