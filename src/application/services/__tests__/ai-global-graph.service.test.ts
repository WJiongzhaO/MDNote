import { describe, expect, it, vi } from 'vitest';
import { AiGlobalGraphService } from '../ai-global-graph.service';

describe('AiGlobalGraphService', () => {
  it('returns a bounded global graph projection', async () => {
    const graphRepo = {
      getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getNodeEvidence: vi.fn().mockResolvedValue(null)
    };
    const service = new AiGlobalGraphService({ graphRepo } as never);

    await service.getGlobalKnowledgeGraph({ seedDocId: 'doc-1', maxHops: 1, limit: 50 });
    expect(graphRepo.getGlobalGraph).toHaveBeenCalledWith({
      seedDocId: 'doc-1',
      seedNodeId: undefined,
      keyword: undefined,
      maxHops: 1,
      limit: 50
    });
  });

  it('returns unavailable when node evidence is missing', async () => {
    const service = new AiGlobalGraphService({
      graphRepo: {
        getGlobalGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
        getNodeEvidence: vi.fn().mockResolvedValue(null)
      }
    } as never);

    await expect(service.jumpToNodeAnchor('node-1')).resolves.toEqual({
      mode: 'unavailable',
      reason: 'No evidence anchor is available for this node.'
    });
  });
});
