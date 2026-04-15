import { describe, expect, it, vi } from 'vitest';
import { LangChainLlmGraphTransformerExtractor } from '../langchain-llm-graph-transformer-extractor';

describe('LangChainLlmGraphTransformerExtractor', () => {
  it('maps graph document nodes and relationships into extracted entities and relations', async () => {
    const transformer = {
      convertToGraphDocuments: vi.fn().mockResolvedValue([
        {
          nodes: [{ id: 'Ada', type: 'Person', properties: { description: 'mathematician' } }],
          relationships: [{ source: { id: 'Ada' }, target: { id: 'Engine' }, type: 'USES', properties: {} }]
        }
      ])
    };

    const extractor = new LangChainLlmGraphTransformerExtractor(transformer as never);
    const result = await extractor.extractChunk({
      chunkId: 'doc-1:chunk:0',
      docId: 'doc-1',
      markdown: '# Intro\nAda uses the engine.',
      headingPath: ['Intro'],
      startOffset: 0,
      endOffset: 28
    });

    expect(result.entities).toEqual([
      expect.objectContaining({ name: 'Ada', type: 'Person' })
    ]);
    expect(result.relations).toEqual([
      expect.objectContaining({ source: 'Ada', target: 'Engine', type: 'USES' })
    ]);
  });
});
