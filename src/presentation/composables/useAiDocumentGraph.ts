import { ref } from 'vue';
import type { BuildDocumentKnowledgeGraphOptions } from '../../application/services/ai-document-graph.service';
import type { AiGraphBuildStatus, AiKnowledgeGraph } from '../../domain/types/ai-knowledge-graph.types';

export interface AiDocumentGraphState {
  status: AiGraphBuildStatus;
  graph?: AiKnowledgeGraph | null;
  errorMessage?: string;
}

export interface AiDocumentGraphService {
  getDocumentGraphState(docId: string): Promise<AiDocumentGraphState>;
  buildDocumentKnowledgeGraph(
    docId: string,
    options?: BuildDocumentKnowledgeGraphOptions
  ): Promise<AiKnowledgeGraph>;
}

const emptyGraph = { nodes: [], edges: [] } as AiKnowledgeGraph;

export function useAiDocumentGraph(graphService: AiDocumentGraphService) {
  const state = ref<AiDocumentGraphState>({
    status: 'not_built',
    graph: null
  });

  async function refresh(docId: string) {
    state.value = await graphService.getDocumentGraphState(docId);
    return state.value;
  }

  async function build(docId: string) {
    state.value = {
      status: 'building',
      graph: state.value.graph ?? null
    };

    try {
      const graph = await graphService.buildDocumentKnowledgeGraph(docId);
      state.value = {
        status: graph.nodes.length > 0 ? 'ready' : 'ready_empty',
        graph: graph.nodes.length > 0 ? graph : emptyGraph
      };
      return graph;
    } catch (error) {
      state.value = {
        status: 'failed',
        graph: null,
        errorMessage: error instanceof Error ? error.message : 'Failed to build knowledge graph.'
      };
      throw error;
    }
  }

  return {
    state,
    refresh,
    build
  };
}
