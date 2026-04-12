import type { AiGraphRepository } from '../../domain/repositories/ai-graph.repository.interface';
import type { AiKnowledgeGraph } from '../../domain/types/ai-knowledge-graph.types';

export class InMemoryAiGraphRepository implements AiGraphRepository {
  private readonly graphs = new Map<string, AiKnowledgeGraph>();

  async replaceDocumentGraph(docId: string, graph: AiKnowledgeGraph): Promise<void> {
    this.graphs.set(docId, graph);
  }

  async getDocumentGraph(docId: string): Promise<AiKnowledgeGraph | null> {
    return this.graphs.get(docId) ?? null;
  }
}
