import type { AiGraphRepository } from '../../domain/repositories/ai-graph.repository.interface';
import type { AiGlobalGraphQuery, AiNodeJumpResolution } from '../../domain/types/ai-knowledge-graph.types';

export class AiGlobalGraphService {
  constructor(private readonly deps: { graphRepo: AiGraphRepository }) {}

  async getGlobalKnowledgeGraph(query: AiGlobalGraphQuery) {
    return this.deps.graphRepo.getGlobalGraph({
      maxHops: query.maxHops,
      limit: query.limit,
      seedDocId: query.seedDocId,
      seedNodeId: query.seedNodeId,
      keyword: query.keyword
    });
  }

  async getNodeEvidence(nodeId: string) {
    return this.deps.graphRepo.getNodeEvidence(nodeId);
  }

  async jumpToNodeAnchor(nodeId: string, preferredDocId?: string): Promise<AiNodeJumpResolution> {
    const evidence = await this.deps.graphRepo.getNodeEvidence(nodeId);

    if (!evidence || evidence.anchors.length === 0) {
      return { mode: 'unavailable', reason: 'No evidence anchor is available for this node.' };
    }

    const anchors = preferredDocId
      ? evidence.anchors.filter(anchor => anchor.docId === preferredDocId)
      : evidence.anchors;

    if (anchors.length === 0) {
      return { mode: 'unavailable', reason: 'No evidence anchor matches the preferred document.' };
    }

    if (anchors.length === 1) {
      return { mode: 'direct', anchor: anchors[0] };
    }

    return { mode: 'select', anchors };
  }
}
