import { Folder } from '../entities/folder.entity';
import { FolderId, ParentFolderId } from '../types/folder.types';

export interface FolderRepository {
  save(folder: Folder): Promise<void>;
  findById(id: FolderId): Promise<Folder | null>;
  findAll(): Promise<Folder[]>;
  findByParentId(parentId: ParentFolderId): Promise<Folder[]>;
  delete(id: FolderId): Promise<void>;
  search(query: string): Promise<Folder[]>;
}