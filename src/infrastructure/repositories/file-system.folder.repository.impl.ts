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

export class FileSystemFolderRepository implements FolderRepository {
  private readonly FILE_NAME = 'folders.json';

  async save(folder: Folder): Promise<void> {
    const folders = await this.getAllFoldersFromFile();
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

    await this.saveFoldersToFile(folders);
  }

  async findById(id: FolderId): Promise<Folder | null> {
    const folders = await this.getAllFoldersFromFile();
    const folderData = folders.find(f => f.id === id.value);

    if (!folderData) {
      return null;
    }

    return this.mapToEntity(folderData);
  }

  async findAll(): Promise<Folder[]> {
    const foldersData = await this.getAllFoldersFromFile();
    return foldersData.map(data => this.mapToEntity(data));
  }

  async findByParentId(parentId: ParentFolderId): Promise<Folder[]> {
    const foldersData = (await this.getAllFoldersFromFile())
      .filter(data => data.parentId === parentId.value);

    return foldersData.map(data => this.mapToEntity(data));
  }

  async delete(id: FolderId): Promise<void> {
    const folders = await this.getAllFoldersFromFile();
    const exists = folders.some(f => f.id === id.value);

    if (!exists) {
      throw new Error(`Folder with id ${id.value} not found`);
    }

    const filteredFolders = folders.filter(f => f.id !== id.value);
    await this.saveFoldersToFile(filteredFolders);
  }

  async search(query: string): Promise<Folder[]> {
    const lowerQuery = query.toLowerCase();
    const foldersData = (await this.getAllFoldersFromFile())
      .filter(data => data.name.toLowerCase().includes(lowerQuery));

    return foldersData.map(data => this.mapToEntity(data));
  }

  private async getAllFoldersFromFile(): Promise<FolderData[]> {
    try {
      // 类型断言，确保 TypeScript 知道 electronAPI 存在于 window 对象上
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        throw new Error('electronAPI is not available');
      }

      const data = await electronAPI.file.read(this.FILE_NAME);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading folders from file:', error);
      return [];
    }
  }

  private async saveFoldersToFile(folders: FolderData[]): Promise<void> {
    try {
      // 类型断言，确保 TypeScript 知道 electronAPI 存在于 window 对象上
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.file) {
        throw new Error('electronAPI is not available');
      }

      await electronAPI.file.write(this.FILE_NAME, folders);
    } catch (error) {
      console.error('Error saving folders to file:', error);
      throw new Error('Failed to save folders to file system');
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