import type { AiKnowledgeGraph } from '../types/ai-knowledge-graph.types';

export interface AiGraphRepository {
  replaceDocumentGraph(docId: string, graph: AiKnowledgeGraph): Promise<void>;
  getDocumentGraph(docId: string): Promise<AiKnowledgeGraph | null>;
}
