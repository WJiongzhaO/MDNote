import type { AiDocumentGraphContribution, AiGraphRepository } from '../../domain/repositories/ai-graph.repository.interface';
import type { AiGlobalGraphQuery, AiKnowledgeGraph, AiNodeEvidence } from '../../domain/types/ai-knowledge-graph.types';

export class InMemoryAiGraphRepository implements AiGraphRepository {
  private readonly graphs = new Map<string, AiKnowledgeGraph>();

  async replaceDocumentContribution(contribution: AiDocumentGraphContribution): Promise<void> {
    this.graphs.set(contribution.docId, { nodes: [], edges: [] });
  }

  async getDocumentGraph(docId: string): Promise<AiKnowledgeGraph | null> {
    return this.graphs.get(docId) ?? null;
  }

  async getGlobalGraph(_query: AiGlobalGraphQuery): Promise<AiKnowledgeGraph> {
    return { nodes: [], edges: [] };
  }

  async getNodeEvidence(_nodeId: string): Promise<AiNodeEvidence | null> {
    return null;
  }
}
