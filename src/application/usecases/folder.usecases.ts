import { injectable, inject } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import { Folder } from '../../domain/entities/folder.entity';
import type { FolderRepository } from '../../domain/repositories/folder.repository.interface';
import type {
  CreateFolderRequest,
  UpdateFolderRequest,
  FolderResponse,
  FolderListItem,
  FolderTreeItem
} from '../dto/folder.dto';

@injectable()
export class FolderUseCases {
  constructor(@inject(TYPES.FolderRepository) private readonly folderRepository: FolderRepository) {}

  async createFolder(request: CreateFolderRequest): Promise<FolderResponse> {
    const folder = Folder.create(
      { value: request.name },
      { value: request.parentId || null }
    );

    await this.folderRepository.save(folder);

    return this.mapToResponse(folder);
  }

  async updateFolder(request: UpdateFolderRequest): Promise<FolderResponse | null> {
    const folder = await this.folderRepository.findById({ value: request.id });

    if (!folder) {
      return null;
    }

    folder.updateName({ value: request.name });
    if (request.parentId !== undefined) {
      folder.updateParentId({ value: request.parentId });
    }

    await this.folderRepository.save(folder);

    return this.mapToResponse(folder);
  }

  async deleteFolder(id: string): Promise<boolean> {
    try {
      await this.folderRepository.delete({ value: id });
      return true;
    } catch {
      return false;
    }
  }

  async getFolder(id: string): Promise<FolderResponse | null> {
    const folder = await this.folderRepository.findById({ value: id });

    if (!folder) {
      return null;
    }

    return this.mapToResponse(folder);
  }

  async getAllFolders(): Promise<FolderListItem[]> {
    const folders = await this.folderRepository.findAll();

    return folders.map(folder => ({
      id: folder.getId().value,
      name: folder.getName().value,
      parentId: folder.getParentId().value,
      updatedAt: folder.getUpdatedAt().value
    }));
  }

  async getFoldersByParentId(parentId: string | null): Promise<FolderListItem[]> {
    const folders = await this.folderRepository.findByParentId({ value: parentId });

    return folders.map(folder => ({
      id: folder.getId().value,
      name: folder.getName().value,
      parentId: folder.getParentId().value,
      updatedAt: folder.getUpdatedAt().value
    }));
  }

  async searchFolders(query: string): Promise<FolderListItem[]> {
    const folders = await this.folderRepository.search(query);

    return folders.map(folder => ({
      id: folder.getId().value,
      name: folder.getName().value,
      parentId: folder.getParentId().value,
      updatedAt: folder.getUpdatedAt().value
    }));
  }

  async getFolderTree(): Promise<FolderTreeItem[]> {
    const allFolders = await this.getAllFolders();

    return this.buildFolderTree(allFolders, null);
  }

  private buildFolderTree(folders: FolderListItem[], parentId: string | null): FolderTreeItem[] {
    const children = folders.filter(folder => folder.parentId === parentId);

    return children.map(folder => ({
      ...folder,
      isExpanded: false,
      children: this.buildFolderTree(folders, folder.id)
    }));
  }

  private mapToResponse(folder: Folder): FolderResponse {
    return {
      id: folder.getId().value,
      name: folder.getName().value,
      parentId: folder.getParentId().value,
      createdAt: folder.getCreatedAt().value,
      updatedAt: folder.getUpdatedAt().value
    };
  }
}
