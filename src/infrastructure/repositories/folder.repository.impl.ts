import { Folder } from '../../domain/entities/folder.entity';
import type { FolderId, FolderName, ParentFolderId } from '../../domain/types/folder.types';
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface';

export interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class InMemoryFolderRepository implements FolderRepository {
  private folders: Map<string, FolderData> = new Map();

  async save(folder: Folder): Promise<void> {
    const folderData: FolderData = {
      id: folder.getId().value,
      name: folder.getName().value,
      parentId: folder.getParentId().value,
      createdAt: folder.getCreatedAt().value,
      updatedAt: folder.getUpdatedAt().value
    };

    this.folders.set(folder.getId().value, folderData);
  }

  async findById(id: FolderId): Promise<Folder | null> {
    const folderData = this.folders.get(id.value);

    if (!folderData) {
      return null;
    }

    return this.mapToEntity(folderData);
  }

  async findAll(): Promise<Folder[]> {
    const foldersData = Array.from(this.folders.values());
    return foldersData.map(data => this.mapToEntity(data));
  }

  async findByParentId(parentId: ParentFolderId): Promise<Folder[]> {
    const foldersData = Array.from(this.folders.values())
      .filter(data => data.parentId === parentId.value);

    return foldersData.map(data => this.mapToEntity(data));
  }

  async delete(id: FolderId): Promise<void> {
    const exists = this.folders.has(id.value);
    if (!exists) {
      throw new Error(`Folder with id ${id.value} not found`);
    }

    this.folders.delete(id.value);
  }

  async search(query: string): Promise<Folder[]> {
    const lowerQuery = query.toLowerCase();
    const foldersData = Array.from(this.folders.values())
      .filter(data => data.name.toLowerCase().includes(lowerQuery));

    return foldersData.map(data => this.mapToEntity(data));
  }

  private mapToEntity(data: FolderData): Folder {
    return new Folder(
      { value: data.id },
      { value: data.name },
      { value: data.parentId },
      { value: data.createdAt },
      { value: data.updatedAt }
    );
  }
}
