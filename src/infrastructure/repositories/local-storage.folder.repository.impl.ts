import { Folder } from '../../domain/entities/folder.entity';
import type { FolderId, FolderName, ParentFolderId } from '../../domain/types/folder.types';
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface';

export interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class LocalStorageFolderRepository implements FolderRepository {
  private readonly STORAGE_KEY = 'mdnote-folders';

  async save(folder: Folder): Promise<void> {
    const folders = this.getAllFoldersFromStorage();
    const folderData: FolderData = {
      id: folder.getId().value,
      name: folder.getName().value,
      parentId: folder.getParentId().value,
      createdAt: folder.getCreatedAt().value.toISOString(),
      updatedAt: folder.getUpdatedAt().value.toISOString()
    };

    const existingIndex = folders.findIndex(f => f.id === folderData.id);
    if (existingIndex !== -1) {
      folders[existingIndex] = folderData;
    } else {
      folders.push(folderData);
    }

    this.saveFoldersToStorage(folders);
  }

  async findById(id: FolderId): Promise<Folder | null> {
    const folders = this.getAllFoldersFromStorage();
    const folderData = folders.find(f => f.id === id.value);

    if (!folderData) {
      return null;
    }

    return this.mapToEntity(folderData);
  }

  async findAll(): Promise<Folder[]> {
    const foldersData = this.getAllFoldersFromStorage();
    return foldersData.map(data => this.mapToEntity(data));
  }

  async findByParentId(parentId: ParentFolderId): Promise<Folder[]> {
    const foldersData = this.getAllFoldersFromStorage()
      .filter(data => data.parentId === parentId.value);

    return foldersData.map(data => this.mapToEntity(data));
  }

  async delete(id: FolderId): Promise<void> {
    const folders = this.getAllFoldersFromStorage();
    const exists = folders.some(f => f.id === id.value);

    if (!exists) {
      throw new Error(`Folder with id ${id.value} not found`);
    }

    const filteredFolders = folders.filter(f => f.id !== id.value);
    this.saveFoldersToStorage(filteredFolders);
  }

  async search(query: string): Promise<Folder[]> {
    const lowerQuery = query.toLowerCase();
    const foldersData = this.getAllFoldersFromStorage()
      .filter(data => data.name.toLowerCase().includes(lowerQuery));

    return foldersData.map(data => this.mapToEntity(data));
  }

  private getAllFoldersFromStorage(): FolderData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading folders from localStorage:', error);
      return [];
    }
  }

  private saveFoldersToStorage(folders: FolderData[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(folders));
    } catch (error) {
      console.error('Error saving folders to localStorage:', error);
      throw new Error('Failed to save folders to local storage');
    }
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