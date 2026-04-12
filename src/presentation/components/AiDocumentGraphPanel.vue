<template>
  <section class="ai-document-graph-panel">
    <div v-if="state.status === 'not_built'" class="ai-document-graph-panel__state">
      <p>Knowledge graph has not been built for this document yet.</p>
      <button type="button" @click="handleBuild">Build Knowledge Graph</button>
    </div>

    <div v-else-if="state.status === 'building'" class="ai-document-graph-panel__state">
      <p>Building knowledge graph...</p>
    </div>

    <KnowledgeGraphView
      v-else-if="state.status === 'ready'"
      :graph="normalizedGraph"
      @jump-to="handleJumpTo"
      @jump-to-fragment="handleJumpToFragment"
    />

    <div v-else-if="state.status === 'ready_empty'" class="ai-document-graph-panel__state">
      <p>No meaningful graph was extracted</p>
      <button type="button" @click="handleBuild">Build Knowledge Graph</button>
    </div>

    <div v-else class="ai-document-graph-panel__state ai-document-graph-panel__state--error">
      <p>{{ state.errorMessage || 'Failed to build knowledge graph.' }}</p>
      <button type="button" @click="handleBuild">Retry Build</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import KnowledgeGraphView from './KnowledgeGraphView.vue';
import { useAiDocumentGraph, type AiDocumentGraphService } from '../composables/useAiDocumentGraph';
import { getAiAnchorOccurrence } from '../utils/knowledge-graph-jump.util';

const props = defineProps<{
  documentId: string;
  graphService: AiDocumentGraphService;
}>();

const emit = defineEmits<{
  (e: 'jump-to', payload: { documentId: string; documentTitle?: string; start: number; end: number }): void;
  (e: 'jump-to-fragment', payload: { fragmentId: string }): void;
}>();

const emptyGraph = { nodes: [], edges: [] };
const { state, refresh, build } = useAiDocumentGraph(props.graphService);

const normalizedGraph = computed(() => {
  const graph = state.value.graph;
  if (!graph) return emptyGraph;

  return {
    ...graph,
    nodes: (graph.nodes || []).map((node) => {
      const existingOccurrences = (node as { occurrences?: unknown[] }).occurrences;
      if (Array.isArray(existingOccurrences) && existingOccurrences.length > 0) {
        return node;
      }

      const aiOccurrence = getAiAnchorOccurrence(
        (node as { primaryAnchor?: Parameters<typeof getAiAnchorOccurrence>[0] }).primaryAnchor
      );

      return {
        ...node,
        ...(aiOccurrence ? { occurrences: [aiOccurrence] } : {})
      };
    })
  };
});

onMounted(() => {
  void refresh(props.documentId);
});

function handleBuild() {
  void build(props.documentId);
}

function handleJumpTo(payload: { documentId: string; documentTitle?: string; start: number; end: number }) {
  emit('jump-to', payload);
}

function handleJumpToFragment(payload: { fragmentId: string }) {
  emit('jump-to-fragment', payload);
}
</script>

<style scoped>
.ai-document-graph-panel {
  width: 100%;
  height: 100%;
}

.ai-document-graph-panel__state {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  justify-content: center;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
}

.ai-document-graph-panel__state--error {
  color: var(--error-color, #c53030);
}
</style>
