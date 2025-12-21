import { Folder } from '../../domain/entities/folder.entity';
import type { FolderId, ParentFolderId } from '../../domain/types/folder.types';
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface';

export interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 基于IndexedDB的文件夹仓储实现
 */
export class IndexedDBFolderRepository implements FolderRepository {
  private readonly DB_NAME = 'MDNoteDB';
  private readonly STORE_NAME = 'folders';
  private db: IDBDatabase | null = null;

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
          objectStore.createIndex('parentId', 'parentId', { unique: false });
        }
      };
    });
  }

  async save(folder: Folder): Promise<void> {
    const db = await this.initDB();
    const folderData: FolderData = {
      id: folder.getId().value,
      name: folder.getName().value,
      parentId: folder.getParentId().value,
      createdAt: folder.getCreatedAt().value.toISOString(),
      updatedAt: folder.getUpdatedAt().value.toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(folderData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save folder'));
    });
  }

  async findById(id: FolderId): Promise<Folder | null> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id.value);

      request.onsuccess = () => {
        const folderData = request.result;
        if (folderData) {
          resolve(this.mapToEntity(folderData));
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(new Error('Failed to find folder'));
    });
  }

  async findAll(): Promise<Folder[]> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const foldersData = request.result as FolderData[];
        resolve(foldersData.map(data => this.mapToEntity(data)));
      };

      request.onerror = () => reject(new Error('Failed to find all folders'));
    });
  }

  async findByParentId(parentId: ParentFolderId): Promise<Folder[]> {
    const db = await this.initDB();
    const searchId = parentId.value;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('parentId');
      const request = index.getAll(searchId);

      request.onsuccess = () => {
        const foldersData = request.result as FolderData[];
        resolve(foldersData.map(data => this.mapToEntity(data)));
      };

      request.onerror = () => reject(new Error('Failed to find folders by parent'));
    });
  }

  async delete(id: FolderId): Promise<void> {
    const db = await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id.value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete folder'));
    });
  }

  private mapToEntity(data: FolderData): Folder {
    return new Folder(
      { value: data.id },
      { value: data.name },
      { value: data.parentId },
      { value: new Date(data.createdAt) },
      { value: new Date(data.updatedAt) }
    );
  }
}

