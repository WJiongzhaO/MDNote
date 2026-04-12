import { describe, expect, it } from 'vitest';
import { normalizeAiGraphExtraction } from '../ai-graph-normalizer.service';

describe('normalizeAiGraphExtraction', () => {
  it('removes empty entities and derives normalized names', () => {
    const result = normalizeAiGraphExtraction({
      docId: 'doc-1',
      chunkId: 'doc-1:chunk:0',
      entities: [
        { name: ' Graph DB ', type: 'Concept' },
        { name: '   ', type: 'Concept' }
      ],
      relations: []
    });

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].normalizedName).toBe('graph db');
  });

  it('deduplicates same-document repeated relations by normalized endpoints and relation type', () => {
    const result = normalizeAiGraphExtraction({
      docId: 'doc-1',
      chunkId: 'doc-1:chunk:0',
      entities: [
        { name: 'Graph DB', type: 'Concept' },
        { name: 'Kuzu', type: 'Database' }
      ],
      relations: [
        { source: 'Graph DB', target: 'Kuzu', type: 'uses' },
        { source: 'Graph DB', target: 'Kuzu', type: 'uses' }
      ]
    });

    expect(result.relations).toHaveLength(1);
  });
});
