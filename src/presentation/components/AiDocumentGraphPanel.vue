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
      :graph="state.graph ?? emptyGraph"
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
import { onMounted } from 'vue';
import KnowledgeGraphView from './KnowledgeGraphView.vue';
import { useAiDocumentGraph, type AiDocumentGraphService } from '../composables/useAiDocumentGraph';

const props = defineProps<{
  documentId: string;
  graphService: AiDocumentGraphService;
}>();

const emptyGraph = { nodes: [], edges: [] };
const { state, refresh, build } = useAiDocumentGraph(props.graphService);

onMounted(() => {
  void refresh(props.documentId);
});

function handleBuild() {
  void build(props.documentId);
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
