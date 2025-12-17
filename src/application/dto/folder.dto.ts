export interface CreateFolderRequest {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderRequest {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface FolderResponse {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderListItem {
  id: string;
  name: string;
  parentId: string | null;
  updatedAt: Date;
}

export interface FolderTreeItem extends FolderListItem {
  children: FolderTreeItem[];
  isExpanded?: boolean;
}
