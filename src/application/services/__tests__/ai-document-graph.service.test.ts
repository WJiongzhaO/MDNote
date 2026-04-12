import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiDocumentGraphService } from '../ai-document-graph.service';
import type { AiKnowledgeGraph } from '../../../domain/types/ai-knowledge-graph.types';

describe('AiDocumentGraphService', () => {
  const docId = 'doc-1';
  const graph: AiKnowledgeGraph = {
    nodes: [
      {
        id: 'node-1',
        label: 'Node 1',
        entityType: 'concept',
        evidenceCount: 1,
        evidencePreview: []
      }
    ],
    edges: []
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
  });

  it('writes building metadata before extractor and saves ready after success', async () => {
    const metadataRepo = {
      saveRecord: vi.fn().mockResolvedValue(undefined),
      getRecord: vi.fn().mockResolvedValue(null)
    };
    const graphRepo = {
      replaceDocumentGraph: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(null)
    };
    const settingsGateway = {
      load: vi.fn().mockResolvedValue({
        providerName: 'dashscope',
        apiKey: 'sk-test',
        baseUrl: 'https://example.com/v1',
        model: 'test-model'
      })
    };
    const extractor = {
      buildForDocument: vi.fn().mockImplementation(async () => {
        expect(metadataRepo.saveRecord).toHaveBeenCalledTimes(1);
        expect(metadataRepo.saveRecord).toHaveBeenNthCalledWith(1, {
          docId,
          contentHash: 'hash-unknown',
          status: 'building',
          provider: 'dashscope',
          model: 'test-model',
          startedAt: '2026-01-02T03:04:05.000Z',
          graphVersion: 'p0'
        });

        return {
          graph,
          contentHash: 'hash-1',
          provider: 'dashscope',
          model: 'test-model'
        };
      })
    };

    const service = new AiDocumentGraphService({
      metadataRepo,
      graphRepo,
      settingsGateway,
      extractor
    });

    await service.buildDocumentKnowledgeGraph(docId);

    expect(graphRepo.replaceDocumentGraph).toHaveBeenCalledWith(docId, graph);
    expect(metadataRepo.saveRecord).toHaveBeenNthCalledWith(2, {
      docId,
      contentHash: 'hash-1',
      status: 'ready',
      provider: 'dashscope',
      model: 'test-model',
      startedAt: '2026-01-02T03:04:05.000Z',
      finishedAt: '2026-01-02T03:04:05.000Z',
      graphVersion: 'p0'
    });
  });

  it('writes ready_empty when the built graph has no nodes', async () => {
    const metadataRepo = {
      saveRecord: vi.fn().mockResolvedValue(undefined),
      getRecord: vi.fn().mockResolvedValue(null)
    };
    const graphRepo = {
      replaceDocumentGraph: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(null)
    };
    const settingsGateway = {
      load: vi.fn().mockResolvedValue({
        providerName: 'dashscope',
        apiKey: 'sk-test',
        baseUrl: 'https://example.com/v1',
        model: 'test-model'
      })
    };
    const extractor = {
      buildForDocument: vi.fn().mockResolvedValue({
        graph: { nodes: [], edges: [] },
        contentHash: 'hash-empty',
        provider: 'dashscope',
        model: 'test-model'
      })
    };

    const service = new AiDocumentGraphService({
      metadataRepo,
      graphRepo,
      settingsGateway,
      extractor
    });

    await service.buildDocumentKnowledgeGraph(docId);

    expect(metadataRepo.saveRecord).toHaveBeenLastCalledWith({
      docId,
      contentHash: 'hash-empty',
      status: 'ready_empty',
      provider: 'dashscope',
      model: 'test-model',
      startedAt: '2026-01-02T03:04:05.000Z',
      finishedAt: '2026-01-02T03:04:05.000Z',
      graphVersion: 'p0'
    });
  });

  it('throws when provider settings are missing', async () => {
    const service = new AiDocumentGraphService({
      metadataRepo: {
        saveRecord: vi.fn().mockResolvedValue(undefined),
        getRecord: vi.fn().mockResolvedValue(null)
      },
      graphRepo: {
        replaceDocumentGraph: vi.fn().mockResolvedValue(undefined),
        getDocumentGraph: vi.fn().mockResolvedValue(null)
      },
      settingsGateway: {
        load: vi.fn().mockResolvedValue(null)
      },
      extractor: {
        buildForDocument: vi.fn()
      }
    });

    await expect(service.buildDocumentKnowledgeGraph(docId)).rejects.toThrow(/provider config/i);
  });
});
