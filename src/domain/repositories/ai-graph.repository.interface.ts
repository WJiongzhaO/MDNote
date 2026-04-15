import type {
  AiGlobalGraphQuery,
  AiGraphEntity,
  AiGraphRelation,
  AiKnowledgeGraph,
  AiNodeEvidence
} from '../types/ai-knowledge-graph.types';

export interface AiDocumentGraphContribution {
  docId: string;
  title: string;
  contentHash: string;
  entities: AiGraphEntity[];
  relations: AiGraphRelation[];
}

export interface AiGraphRepository {
  replaceDocumentContribution(contribution: AiDocumentGraphContribution): Promise<void>;
  getDocumentGraph(docId: string): Promise<AiKnowledgeGraph | null>;
  getGlobalGraph(query: AiGlobalGraphQuery): Promise<AiKnowledgeGraph>;
  getNodeEvidence(nodeId: string): Promise<AiNodeEvidence | null>;
}
