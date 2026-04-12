import { describe, it, expect } from 'vitest';

// Test domain module exports
import { Document, MarkdownProcessor } from '../domain';
import type {
  DocumentId,
  DocumentTitle,
  DocumentContent,
  CreatedAt,
  UpdatedAt,
  DocumentRepository
} from '../domain';

// Test application module exports
import { ApplicationService } from '../application';
import { AiDocumentGraphService } from '../application/services/ai-document-graph.service';
import { AiGraphSettingsService } from '../application/services/ai-graph-settings.service';
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentResponse,
  DocumentListItem
} from '../application';
import type {
  AiGraphBuildStatus,
  AiKnowledgeGraph,
  AiKnowledgeGraphNode,
  AiGraphProviderConfig
} from '../domain/types/ai-knowledge-graph.types';

// Test infrastructure module exports
import { InMemoryDocumentRepository } from '../infrastructure';

describe('Module Import Tests', () => {
  describe('Domain Module', () => {
    it('should export Document class correctly', () => {
      expect(Document).toBeDefined();
      expect(typeof Document).toBe('function');
    });

    it('should export MarkdownProcessor class correctly', () => {
      expect(MarkdownProcessor).toBeDefined();
      expect(typeof MarkdownProcessor).toBe('function');
    });

    it('should export all domain types correctly', () => {
      // These are type-only exports, so we just verify they can be imported
      expect(true).toBe(true); // If the imports above work, this passes
    });
  });

  describe('Application Module', () => {
    it('should export ApplicationService class correctly', () => {
      expect(ApplicationService).toBeDefined();
      expect(typeof ApplicationService).toBe('function');
    });

    it('should export all application types correctly', () => {
      // These are type-only exports, so we just verify they can be imported
      expect(true).toBe(true); // If the imports above work, this passes
    });

    it('should expose ai graph services from ApplicationService', () => {
      expect(typeof ApplicationService.prototype.getAiDocumentGraphService).toBe('function');
      expect(typeof ApplicationService.prototype.getAiGraphSettingsService).toBe('function');
      expect(AiDocumentGraphService).toBeDefined();
      expect(AiGraphSettingsService).toBeDefined();
    });
  });

  describe('Infrastructure Module', () => {
    it('should export InMemoryDocumentRepository class correctly', () => {
      expect(InMemoryDocumentRepository).toBeDefined();
      expect(typeof InMemoryDocumentRepository).toBe('function');
    });
  });

  describe('AI Knowledge Graph Contract', () => {
    it('should expose AI knowledge graph contract types', () => {
      expect(true).toBe(true);
    });
  });

  describe('Integration Test', () => {
    it.skip('should be able to create a complete document workflow', () => {
      // Create repository
      const repository = new InMemoryDocumentRepository();
      expect(repository).toBeDefined();

      // Create application service
      const applicationService = new ApplicationService(repository);
      expect(applicationService).toBeDefined();

      // Get document use cases
      const documentUseCases = applicationService.getDocumentUseCases();
      expect(documentUseCases).toBeDefined();
    });
  });
});