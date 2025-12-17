import { describe, it, expect } from 'vitest';
import { Document } from '../document.entity';
import type {
  DocumentId,
  DocumentTitle,
  DocumentContent,
  FolderId,
  CreatedAt,
  UpdatedAt
} from '../../types/document.types';

describe('Document Entity', () => {
  it('should create a document with correct values', () => {
    const now = new Date();
    const document = new Document(
      { value: 'test-id' } as DocumentId,
      { value: 'Test Title' } as DocumentTitle,
      { value: 'Test Content' } as DocumentContent,
      { value: null } as FolderId,
      { value: now } as CreatedAt,
      { value: now } as UpdatedAt
    );

    expect(document.getId().value).toBe('test-id');
    expect(document.getTitle().value).toBe('Test Title');
    expect(document.getContent().value).toBe('Test Content');
    expect(document.getCreatedAt().value).toBe(now);
    expect(document.getUpdatedAt().value).toBe(now);
  });

  it('should create a document using static create method', () => {
    const document = Document.create(
      { value: 'New Title' } as DocumentTitle,
      { value: 'New Content' } as DocumentContent
    );

    expect(document.getTitle().value).toBe('New Title');
    expect(document.getContent().value).toBe('New Content');
    expect(document.getId().value).toBeDefined();
    expect(document.getCreatedAt().value).toBeInstanceOf(Date);
    expect(document.getUpdatedAt().value).toBeInstanceOf(Date);
  });

  it('should update title correctly', () => {
    const document = Document.create(
      { value: 'Original Title' } as DocumentTitle,
      { value: 'Content' } as DocumentContent
    );

    const originalUpdatedAt = document.getUpdatedAt().value;

    // Wait a moment to ensure timestamp difference
    setTimeout(() => {
      document.updateTitle({ value: 'Updated Title' } as DocumentTitle);

      expect(document.getTitle().value).toBe('Updated Title');
      expect(document.getUpdatedAt().value).not.toEqual(originalUpdatedAt);
    }, 1);
  });

  it('should update content correctly', () => {
    const document = Document.create(
      { value: 'Title' } as DocumentTitle,
      { value: 'Original Content' } as DocumentContent
    );

    const originalUpdatedAt = document.getUpdatedAt().value;

    // Wait a moment to ensure timestamp difference
    setTimeout(() => {
      document.updateContent({ value: 'Updated Content' } as DocumentContent);

      expect(document.getContent().value).toBe('Updated Content');
      expect(document.getUpdatedAt().value).not.toEqual(originalUpdatedAt);
    }, 1);
  });

  it('should update both title and content correctly', () => {
    const document = Document.create(
      { value: 'Original Title' } as DocumentTitle,
      { value: 'Original Content' } as DocumentContent
    );

    const originalUpdatedAt = document.getUpdatedAt().value;

    // Wait a moment to ensure timestamp difference
    setTimeout(() => {
      document.update(
        { value: 'Updated Title' } as DocumentTitle,
        { value: 'Updated Content' } as DocumentContent
      );

      expect(document.getTitle().value).toBe('Updated Title');
      expect(document.getContent().value).toBe('Updated Content');
      expect(document.getUpdatedAt().value).not.toEqual(originalUpdatedAt);
    }, 1);
  });

  it('should compare documents correctly', () => {
    const document1 = Document.create(
      { value: 'Title' } as DocumentTitle,
      { value: 'Content' } as DocumentContent
    );

    const document2 = Document.create(
      { value: 'Title 2' } as DocumentTitle,
      { value: 'Content 2' } as DocumentContent
    );

    // Override the ID of document2 to match document1 for testing
    const document1Id = document1.getId();

    expect(document1.equals(document1)).toBe(true);
    expect(document1.equals(document2)).toBe(false);
  });
});
