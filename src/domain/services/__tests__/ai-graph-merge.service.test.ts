import { describe, expect, it } from 'vitest';
import { mergeDocumentGraphContribution } from '../ai-graph-merge.service';

describe('mergeDocumentGraphContribution', () => {
  it('deduplicates entities within one document by normalizedName and type', () => {
    const merged = mergeDocumentGraphContribution({
      entities: [
        {
          entityId: '1',
          name: 'Ada',
          normalizedName: 'ada',
          type: 'Person',
          sourceDocId: 'doc-1',
          sourceChunkId: 'c1',
          metadata: {},
          anchors: []
        },
        {
          entityId: '2',
          name: 'ADA',
          normalizedName: 'ada',
          type: 'Person',
          sourceDocId: 'doc-1',
          sourceChunkId: 'c2',
          metadata: {},
          anchors: []
        }
      ],
      relations: []
    });

    expect(merged.entities).toHaveLength(1);
  });
});
