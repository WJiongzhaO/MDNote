import { describe, expect, it } from 'vitest';
import { resolvePreferredAnchor } from '../ai-graph-anchor-resolver.service';

describe('resolvePreferredAnchor', () => {
  it('prefers range anchors when offsets are available', () => {
    const anchor = resolvePreferredAnchor([
      { anchorId: 'a', docId: 'doc-1', chunkId: 'c1', anchorType: 'block', blockId: 'b-1' },
      { anchorId: 'b', docId: 'doc-1', chunkId: 'c1', anchorType: 'range', startOffset: 12, endOffset: 24 }
    ]);

    expect(anchor?.anchorType).toBe('range');
  });

  it('falls back to block anchors when range offsets are missing', () => {
    const anchor = resolvePreferredAnchor([
      { anchorId: 'a', docId: 'doc-1', chunkId: 'c1', anchorType: 'block', blockId: 'b-1' }
    ]);

    expect(anchor?.blockId).toBe('b-1');
  });
});
