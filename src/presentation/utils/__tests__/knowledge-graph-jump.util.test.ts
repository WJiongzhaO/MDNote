import { describe, expect, it } from 'vitest';
import { resolveAiGraphJumpTarget } from '../knowledge-graph-jump.util';

describe('resolveAiGraphJumpTarget', () => {
  it('prefers exact range anchors over block anchors', () => {
    const target = resolveAiGraphJumpTarget([
      { anchorId: 'block-1', docId: 'doc-1', chunkId: 'c1', blockId: 'intro', anchorType: 'block' },
      { anchorId: 'range-1', docId: 'doc-1', chunkId: 'c1', startOffset: 10, endOffset: 20, anchorType: 'range' }
    ]);

    expect(target).toEqual(expect.objectContaining({ anchorId: 'range-1' }));
  });
});
