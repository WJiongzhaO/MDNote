import type { AiDocumentGraphContribution, AiGraphRepository } from '../../domain/repositories/ai-graph.repository.interface';
import type { AiGlobalGraphQuery, AiKnowledgeGraph, AiNodeEvidence } from '../../domain/types/ai-knowledge-graph.types';

type ElectronAiGraphBridge = {
  replaceDocumentContribution: (contribution: AiDocumentGraphContribution) => Promise<void>;
  getDocumentGraph: (docId: string) => Promise<AiKnowledgeGraph | null>;
  getGlobalGraph: (query: AiGlobalGraphQuery) => Promise<AiKnowledgeGraph>;
  getNodeEvidence: (nodeId: string) => Promise<AiNodeEvidence | null>;
};

type WindowWithElectronApi = Window & {
  electronAPI?: {
    aiGraph?: Partial<ElectronAiGraphBridge>;
  };
};

const AI_GRAPH_BRIDGE_UNAVAILABLE_ERROR = 'AI graph IPC bridge is not available.';

function getAiGraphBridge(): ElectronAiGraphBridge {
  if (typeof window === 'undefined') {
    throw new Error(AI_GRAPH_BRIDGE_UNAVAILABLE_ERROR);
  }

  const aiGraph = (window as WindowWithElectronApi).electronAPI?.aiGraph;

  if (
    !aiGraph ||
    typeof aiGraph.replaceDocumentContribution !== 'function' ||
    typeof aiGraph.getDocumentGraph !== 'function' ||
    typeof aiGraph.getGlobalGraph !== 'function' ||
    typeof aiGraph.getNodeEvidence !== 'function'
  ) {
    throw new Error(AI_GRAPH_BRIDGE_UNAVAILABLE_ERROR);
  }

  return aiGraph as ElectronAiGraphBridge;
}

export class IpcAiGraphRepository implements AiGraphRepository {
  async replaceDocumentContribution(contribution: AiDocumentGraphContribution): Promise<void> {
    await getAiGraphBridge().replaceDocumentContribution(contribution);
  }

  async getDocumentGraph(docId: string): Promise<AiKnowledgeGraph | null> {
    return getAiGraphBridge().getDocumentGraph(docId);
  }

  async getGlobalGraph(query: AiGlobalGraphQuery): Promise<AiKnowledgeGraph> {
    return getAiGraphBridge().getGlobalGraph(query);
  }

  async getNodeEvidence(nodeId: string): Promise<AiNodeEvidence | null> {
    return getAiGraphBridge().getNodeEvidence(nodeId);
  }
}
