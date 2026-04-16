import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiDocumentGraphService } from '../ai-document-graph.service';
import type { AiGraphEntity, AiGraphRelation, AiKnowledgeGraph } from '../../../domain/types/ai-knowledge-graph.types';

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
  const entities: AiGraphEntity[] = [
    {
      entityId: 'entity-1',
      name: 'Node 1',
      normalizedName: 'node 1',
      type: 'concept',
      sourceDocId: docId,
      sourceChunkId: 'chunk-1',
      metadata: {},
      anchors: []
    }
  ];
  const relations: AiGraphRelation[] = [];

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
      replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(null),
      getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getNodeEvidence: vi.fn().mockResolvedValue(null)
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
          title: 'Doc 1',
          entities,
          relations,
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

    expect(graphRepo.replaceDocumentContribution).toHaveBeenCalledWith({
      docId,
      title: 'Doc 1',
      contentHash: 'hash-1',
      entities,
      relations
    });
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
      replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(null),
      getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getNodeEvidence: vi.fn().mockResolvedValue(null)
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
        title: 'Doc 1',
        entities: [],
        relations: [],
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

  it('passes the configured provider settings into chunk extraction', async () => {
    const chunk = {
      chunkId: 'doc-1:chunk:0',
      docId,
      markdown: '# Title\nBody',
      headingPath: ['Title'],
      startOffset: 0,
      endOffset: 12
    };

    class RecordingExtractor {
      readonly calls: Array<{
        chunkId: string;
        providerName: string;
        model: string;
        contextIsPreserved: boolean;
      }> = [];

      async extractChunk(
        currentChunk: typeof chunk,
        config: { providerName: string; model: string }
      ) {
        this.calls.push({
          chunkId: currentChunk.chunkId,
          providerName: config.providerName,
          model: config.model,
          contextIsPreserved: this instanceof RecordingExtractor
        });

        return { entities: [], relations: [] };
      }
    }

    const extractor = new RecordingExtractor();
    const service = new AiDocumentGraphService({
      metadataRepo: {
        saveRecord: vi.fn().mockResolvedValue(undefined),
        getRecord: vi.fn().mockResolvedValue(null)
      },
      graphRepo: {
        replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
        getDocumentGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
        getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
        getNodeEvidence: vi.fn().mockResolvedValue(null)
      },
      settingsGateway: {
        load: vi.fn().mockResolvedValue({
          providerName: 'dashscope',
          apiKey: 'secret',
          model: 'qwen-max',
          baseUrl: 'https://example.com/v1'
        })
      },
      extractor,
      documentRepo: {
        findById: vi.fn().mockResolvedValue({
          title: 'Doc',
          content: '# Title\nBody'
        })
      },
      chunker: {
        splitMarkdown: vi.fn().mockReturnValue([chunk])
      }
    });

    await service.buildDocumentKnowledgeGraph(docId);

    expect(extractor.calls).toEqual([
      {
        chunkId: 'doc-1:chunk:0',
        providerName: 'dashscope',
        model: 'qwen-max',
        contextIsPreserved: true
      }
    ]);
  });

  it('throws when provider settings are missing', async () => {
    const service = new AiDocumentGraphService({
      metadataRepo: {
        saveRecord: vi.fn().mockResolvedValue(undefined),
        getRecord: vi.fn().mockResolvedValue(null)
      },
      graphRepo: {
        replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
        getDocumentGraph: vi.fn().mockResolvedValue(null),
        getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
        getNodeEvidence: vi.fn().mockResolvedValue(null)
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

  it('exposes document graph state from build record and stored graph', async () => {
    const service = new AiDocumentGraphService({
      metadataRepo: {
        saveRecord: vi.fn().mockResolvedValue(undefined),
        getRecord: vi.fn().mockResolvedValue({
          docId,
          contentHash: 'hash-1',
          status: 'ready',
          provider: 'dashscope',
          model: 'test-model',
          graphVersion: 'p0'
        })
      },
      graphRepo: {
        replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
        getDocumentGraph: vi.fn().mockResolvedValue(graph),
        getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
        getNodeEvidence: vi.fn().mockResolvedValue(null)
      },
      settingsGateway: {
        load: vi.fn().mockResolvedValue(null)
      },
      extractor: {
        buildForDocument: vi.fn()
      }
    });

    await expect(service.getDocumentGraphState(docId)).resolves.toEqual({
      docId,
      contentHash: 'hash-1',
      status: 'ready',
      provider: 'dashscope',
      model: 'test-model',
      graphVersion: 'p0',
      graph,
      errorMessage: undefined
    });
  });

  it('forwards global graph queries to repository', async () => {
    const globalGraph = {
      nodes: [
        {
          id: 'global-node-1',
          label: 'Global Node 1',
          entityType: 'concept',
          evidenceCount: 2,
          evidencePreview: []
        }
      ],
      edges: []
    } satisfies AiKnowledgeGraph;
    const graphRepo = {
      replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(null),
      getGlobalGraph: vi.fn().mockResolvedValue(globalGraph),
      getNodeEvidence: vi.fn().mockResolvedValue(null)
    };
    const service = new AiDocumentGraphService({
      metadataRepo: {
        saveRecord: vi.fn().mockResolvedValue(undefined),
        getRecord: vi.fn().mockResolvedValue(null)
      },
      graphRepo,
      settingsGateway: {
        load: vi.fn().mockResolvedValue(null)
      },
      extractor: {
        buildForDocument: vi.fn()
      }
    });

    await expect(
      service.getGlobalGraph({
        seedDocId: 'doc-seed',
        seedNodeId: 'node-seed',
        keyword: 'global',
        maxHops: 2,
        limit: 20
      })
    ).resolves.toEqual(globalGraph);

    expect(graphRepo.getGlobalGraph).toHaveBeenCalledWith({
      seedDocId: 'doc-seed',
      seedNodeId: 'node-seed',
      keyword: 'global',
      maxHops: 2,
      limit: 20
    });
  });

  it('forwards node evidence lookups to repository', async () => {
    const nodeEvidence = {
      nodeId: 'node-1',
      label: 'Node 1',
      anchors: [
        {
          anchorId: 'anchor-1',
          docId,
          chunkId: 'chunk-1',
          excerpt: 'Node 1 evidence',
          anchorType: 'range'
        }
      ]
    };
    const graphRepo = {
      replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(null),
      getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getNodeEvidence: vi.fn().mockResolvedValue(nodeEvidence)
    };
    const service = new AiDocumentGraphService({
      metadataRepo: {
        saveRecord: vi.fn().mockResolvedValue(undefined),
        getRecord: vi.fn().mockResolvedValue(null)
      },
      graphRepo,
      settingsGateway: {
        load: vi.fn().mockResolvedValue(null)
      },
      extractor: {
        buildForDocument: vi.fn()
      }
    });

    await expect(service.getNodeEvidence('node-1')).resolves.toEqual(nodeEvidence);
    expect(graphRepo.getNodeEvidence).toHaveBeenCalledWith('node-1');
  });

  it('saves failed metadata with 已中止生成 when requestCancelDocumentGraphBuild is used between chunks', async () => {
    const chunk1 = {
      chunkId: 'doc-1:chunk:0',
      docId,
      markdown: '# A',
      headingPath: ['A'],
      startOffset: 0,
      endOffset: 3
    };
    const chunk2 = {
      chunkId: 'doc-1:chunk:1',
      docId,
      markdown: '# B',
      headingPath: ['B'],
      startOffset: 3,
      endOffset: 6
    };

    const metadataRepo = {
      saveRecord: vi.fn().mockResolvedValue(undefined),
      getRecord: vi.fn().mockResolvedValue(null)
    };
    const graphRepo = {
      replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(null),
      getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getNodeEvidence: vi.fn().mockResolvedValue(null)
    };
    const settingsGateway = {
      load: vi.fn().mockResolvedValue({
        providerName: 'dashscope',
        apiKey: 'sk-test',
        baseUrl: 'https://example.com/v1',
        model: 'test-model'
      })
    };

    let callCount = 0;
    let service!: AiDocumentGraphService;
    const extractor = {
      extractChunk: vi.fn().mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          service.requestCancelDocumentGraphBuild(docId);
        }
        return { entities: [], relations: [] };
      })
    };

    service = new AiDocumentGraphService({
      metadataRepo,
      graphRepo,
      settingsGateway,
      extractor,
      documentRepo: {
        findById: vi.fn().mockResolvedValue({
          title: 'Doc',
          content: '# A\n\n# B\n'
        })
      },
      chunker: {
        splitMarkdown: vi.fn().mockReturnValue([chunk1, chunk2])
      }
    });

    await expect(service.buildDocumentKnowledgeGraph(docId)).rejects.toMatchObject({ name: 'AbortError' });

    expect(graphRepo.replaceDocumentContribution).not.toHaveBeenCalled();
    expect(metadataRepo.saveRecord).toHaveBeenLastCalledWith(
      expect.objectContaining({
        docId,
        status: 'failed',
        errorMessage: '已中止生成'
      })
    );
  });
});
