import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Document } from '../../../domain/entities/document.entity';
import { normalizeAiGraphExtraction } from '../../../domain/services/ai-graph-normalizer.service';
import { AiDocumentGraphService } from '../ai-document-graph.service';

const providerConfig = {
  providerName: 'dashscope',
  apiKey: 'key',
  model: 'qwen-max',
  baseUrl: 'https://example.com/v1'
};

function createService(deps: Record<string, unknown>) {
  return new AiDocumentGraphService(
    deps as unknown as ConstructorParameters<typeof AiDocumentGraphService>[0]
  );
}

describe('AiDocumentGraphService document content flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('real document content flow: load markdown -> split chunks -> extract graph data -> persist normalized contribution', async () => {
    const docId = 'doc-1';
    const markdown = '# Heading\n\nAlpha relates to Beta.';
    const storedGraph = {
      nodes: [
        {
          id: 'concept:alpha',
          label: 'Alpha',
          entityType: 'Concept',
          evidenceCount: 1,
          evidencePreview: []
        },
        {
          id: 'concept:beta',
          label: 'Beta',
          entityType: 'Concept',
          evidenceCount: 1,
          evidencePreview: []
        }
      ],
      edges: [
        {
          id: 'rel:alpha-beta',
          source: 'concept:alpha',
          target: 'concept:beta',
          relationType: 'RELATES_TO'
        }
      ]
    };
    const document = new Document(
      { value: docId },
      { value: 'Demo Doc' },
      { value: markdown },
      { value: null },
      { value: new Date('2026-01-02T03:04:05.000Z') },
      { value: new Date('2026-01-02T03:04:05.000Z') }
    );
    const chunk = {
      chunkId: 'doc-1:chunk:0',
      docId,
      markdown,
      headingPath: ['Heading'],
      startOffset: 0,
      endOffset: 33
    };
    const extracted = {
      entities: [
        {
          name: 'Alpha',
          type: 'Concept',
          metadata: {}
        },
        {
          name: 'Beta',
          type: 'Concept',
          metadata: {}
        }
      ],
      relations: [
        {
          source: 'Alpha',
          target: 'Beta',
          type: 'RELATES_TO',
          metadata: {}
        }
      ]
    };
    const normalized = normalizeAiGraphExtraction({
      docId,
      chunkId: chunk.chunkId,
      entities: extracted.entities,
      relations: extracted.relations
    });

    const documentRepo = {
      findById: vi.fn().mockResolvedValue(document)
    };
    const chunker = {
      splitMarkdown: vi.fn().mockReturnValue([chunk])
    };
    const extractor = {
      extractChunk: vi.fn().mockResolvedValue(extracted),
      buildForDocument: vi.fn().mockResolvedValue({
        title: 'Legacy Doc',
        entities: [],
        relations: [],
        graph: { nodes: [], edges: [] },
        contentHash: 'legacy-hash',
        provider: 'dashscope',
        model: 'qwen-max'
      })
    };
    const graphRepo = {
      replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue(storedGraph)
    };
    const metadataRepo = {
      saveRecord: vi.fn().mockResolvedValue(undefined),
      getRecord: vi.fn().mockResolvedValue(null)
    };

    const service = createService({
      documentRepo,
      chunker,
      extractor,
      graphRepo,
      metadataRepo,
      settingsGateway: {
        load: vi.fn().mockResolvedValue(providerConfig)
      }
    });

    const graph = await service.buildDocumentKnowledgeGraph(docId);

    expect(documentRepo.findById).toHaveBeenCalledWith({ value: docId });
    expect(chunker.splitMarkdown).toHaveBeenCalledWith(markdown, docId);
    expect(extractor.buildForDocument).not.toHaveBeenCalled();
    expect(extractor.extractChunk).toHaveBeenCalledTimes(1);
    expect(extractor.extractChunk).toHaveBeenCalledWith(chunk, providerConfig);
    expect(graphRepo.replaceDocumentContribution).toHaveBeenCalledWith(
      expect.objectContaining({
        docId,
        title: 'Demo Doc',
        contentHash: expect.any(String),
        entities: normalized.entities,
        relations: normalized.relations
      })
    );
    expect(graphRepo.getDocumentGraph).toHaveBeenCalledWith(docId);
    expect(graphRepo.replaceDocumentContribution.mock.invocationCallOrder[0]).toBeLessThan(
      graphRepo.getDocumentGraph.mock.invocationCallOrder[0]
    );
    expect(graph).toEqual(storedGraph);
  });

  it('missing document content case', async () => {
    const docId = 'missing-doc';
    const documentRepo = {
      findById: vi.fn().mockResolvedValue(null)
    };
    const chunker = {
      splitMarkdown: vi.fn()
    };
    const extractor = {
      extractChunk: vi.fn(),
      buildForDocument: vi.fn().mockRejectedValue(
        new Error('legacy extractor should not run when document content is missing')
      )
    };
    const graphRepo = {
      replaceDocumentContribution: vi.fn().mockResolvedValue(undefined),
      getDocumentGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] })
    };
    const metadataRepo = {
      saveRecord: vi.fn().mockResolvedValue(undefined),
      getRecord: vi.fn().mockResolvedValue(null)
    };

    const service = createService({
      documentRepo,
      chunker,
      extractor,
      graphRepo,
      metadataRepo,
      settingsGateway: {
        load: vi.fn().mockResolvedValue(providerConfig)
      }
    });

    await expect(service.buildDocumentKnowledgeGraph(docId)).rejects.toThrow(
      'Document content is required to build AI graph.'
    );

    expect(documentRepo.findById).toHaveBeenCalledWith({ value: docId });
    expect(chunker.splitMarkdown).not.toHaveBeenCalled();
    expect(extractor.extractChunk).not.toHaveBeenCalled();
    expect(extractor.buildForDocument).not.toHaveBeenCalled();
    expect(graphRepo.replaceDocumentContribution).not.toHaveBeenCalled();
    expect(metadataRepo.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        docId,
        status: 'failed',
        errorMessage: 'Document content is required to build AI graph.'
      })
    );
  });
});
