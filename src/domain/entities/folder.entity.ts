import type {
  FolderId,
  FolderName,
  ParentFolderId,
  CreatedAt,
  UpdatedAt
} from '../types/folder.types';

export class Folder {
  private readonly id: FolderId;
  private name: FolderName;
  private parentId: ParentFolderId;
  private readonly createdAt: CreatedAt;
  private updatedAt: UpdatedAt;

  constructor(
    id: FolderId,
    name: FolderName,
    parentId: ParentFolderId,
    createdAt: CreatedAt,
    updatedAt: UpdatedAt
  ) {
    this.id = id;
    this.name = name;
    this.parentId = parentId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(name: FolderName, parentId: ParentFolderId): Folder {
    const now = new Date();
    const id = crypto.randomUUID();

    return new Folder(
      { value: id },
      name,
      parentId,
      { value: now },
      { value: now }
    );
  }

  updateName(name: FolderName): void {
    this.name = name;
    this.updatedAt = { value: new Date() };
  }

  updateParentId(parentId: ParentFolderId): void {
    this.parentId = parentId;
    this.updatedAt = { value: new Date() };
  }

  getId(): FolderId {
    return this.id;
  }

  getName(): FolderName {
    return this.name;
  }

  getParentId(): ParentFolderId {
    return this.parentId;
  }

  getCreatedAt(): CreatedAt {
    return this.createdAt;
  }

  getUpdatedAt(): UpdatedAt {
    return this.updatedAt;
  }

  equals(other: Folder): boolean {
    return this.id.value === other.id.value;
  }
}
