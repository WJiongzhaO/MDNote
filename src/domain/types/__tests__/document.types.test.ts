import { describe, it, expect } from 'vitest';
import type {
  DocumentId,
  DocumentTitle,
  DocumentContent,
  CreatedAt,
  UpdatedAt
} from '../document.types';

describe('Document Types', () => {
  it('should have correct DocumentId type structure', () => {
    const documentId: DocumentId = { value: 'test-id' };
    expect(documentId.value).toBe('test-id');
  });

  it('should have correct DocumentTitle type structure', () => {
    const documentTitle: DocumentTitle = { value: 'Test Title' };
    expect(documentTitle.value).toBe('Test Title');
  });

  it('should have correct DocumentContent type structure', () => {
    const documentContent: DocumentContent = { value: 'Test content' };
    expect(documentContent.value).toBe('Test content');
  });

  it('should have correct CreatedAt type structure', () => {
    const now = new Date();
    const createdAt: CreatedAt = { value: now };
    expect(createdAt.value).toBe(now);
  });

  it('should have correct UpdatedAt type structure', () => {
    const now = new Date();
    const updatedAt: UpdatedAt = { value: now };
    expect(updatedAt.value).toBe(now);
  });
});