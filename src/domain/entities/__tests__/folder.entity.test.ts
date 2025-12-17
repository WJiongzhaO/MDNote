import { describe, it, expect } from 'vitest';
import { Folder } from '../folder.entity';
import type {
  FolderId,
  FolderName,
  ParentFolderId,
  CreatedAt,
  UpdatedAt
} from '../../types/folder.types';

describe('Folder Entity', () => {
  it('should create a folder with correct values', () => {
    const now = new Date();
    const folder = new Folder(
      { value: 'test-id' } as FolderId,
      { value: 'Test Folder' } as FolderName,
      { value: null } as ParentFolderId,
      { value: now } as CreatedAt,
      { value: now } as UpdatedAt
    );

    expect(folder.getId().value).toBe('test-id');
    expect(folder.getName().value).toBe('Test Folder');
    expect(folder.getParentId().value).toBeNull();
    expect(folder.getCreatedAt().value).toBe(now);
    expect(folder.getUpdatedAt().value).toBe(now);
  });

  it('should create a folder using static create method', () => {
    const folder = Folder.create(
      { value: 'New Folder' } as FolderName,
      { value: null } as ParentFolderId
    );

    expect(folder.getName().value).toBe('New Folder');
    expect(folder.getParentId().value).toBeNull();
    expect(folder.getId().value).toBeDefined();
    expect(folder.getCreatedAt().value).toBeInstanceOf(Date);
    expect(folder.getUpdatedAt().value).toBeInstanceOf(Date);
  });

  it('should update folder name correctly', () => {
    const folder = Folder.create(
      { value: 'Original Name' } as FolderName,
      { value: null } as ParentFolderId
    );

    const originalUpdatedAt = folder.getUpdatedAt().value;

    // Wait a moment to ensure timestamp difference
    setTimeout(() => {
      folder.updateName({ value: 'Updated Name' } as FolderName);

      expect(folder.getName().value).toBe('Updated Name');
      expect(folder.getUpdatedAt().value).not.toEqual(originalUpdatedAt);
    }, 1);
  });

  it('should update parent folder ID correctly', () => {
    const folder = Folder.create(
      { value: 'Folder Name' } as FolderName,
      { value: null } as ParentFolderId
    );

    const originalUpdatedAt = folder.getUpdatedAt().value;

    // Wait a moment to ensure timestamp difference
    setTimeout(() => {
      folder.updateParentId({ value: 'parent-id' } as ParentFolderId);

      expect(folder.getParentId().value).toBe('parent-id');
      expect(folder.getUpdatedAt().value).not.toEqual(originalUpdatedAt);
    }, 1);
  });

  it('should compare folders correctly', () => {
    const folder1 = Folder.create(
      { value: 'Folder 1' } as FolderName,
      { value: null } as ParentFolderId
    );

    const folder2 = Folder.create(
      { value: 'Folder 2' } as FolderName,
      { value: null } as ParentFolderId
    );

    expect(folder1.equals(folder1)).toBe(true);
    expect(folder1.equals(folder2)).toBe(false);
  });
});
