import { describe, it, expect } from 'vitest';
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentResponse,
  DocumentListItem
} from '../document.dto';

describe('Document DTOs', () => {
  it('should have correct CreateDocumentRequest type structure', () => {
    const request: CreateDocumentRequest = {
      title: 'Test Document',
      content: '# Test Content'
    };
    expect(request.title).toBe('Test Document');
    expect(request.content).toBe('# Test Content');
  });

  it('should have correct UpdateDocumentRequest type structure', () => {
    const request: UpdateDocumentRequest = {
      id: 'test-id',
      title: 'Updated Document',
      content: '# Updated Content'
    };
    expect(request.id).toBe('test-id');
    expect(request.title).toBe('Updated Document');
    expect(request.content).toBe('# Updated Content');
  });

  it('should have correct DocumentResponse type structure', () => {
    const now = new Date();
    const response: DocumentResponse = {
      id: 'test-id',
      title: 'Test Document',
      content: '# Test Content',
      createdAt: now,
      updatedAt: now
    };
    expect(response.id).toBe('test-id');
    expect(response.title).toBe('Test Document');
    expect(response.content).toBe('# Test Content');
    expect(response.createdAt).toBe(now);
    expect(response.updatedAt).toBe(now);
  });

  it('should have correct DocumentListItem type structure', () => {
    const now = new Date();
    const item: DocumentListItem = {
      id: 'test-id',
      title: 'Test Document',
      updatedAt: now
    };
    expect(item.id).toBe('test-id');
    expect(item.title).toBe('Test Document');
    expect(item.updatedAt).toBe(now);
  });
});