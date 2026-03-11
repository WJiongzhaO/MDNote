<template>
  <div class="knowledge-graph-view-wrap">
    <div v-if="!graph || (graph.nodes && graph.nodes.length === 0)" class="kg-placeholder">
      请从左侧列表选择知识图谱，或先在编辑器中生成并保存图谱。
    </div>
    <template v-else>
      <div ref="containerRef" class="knowledge-graph-cy-container"></div>
      <!-- 节点点击：跳转位置列表（fixed 定位到视口） -->
      <div
        v-if="nodePopover.show"
        class="kg-node-popover"
        :style="{ left: nodePopover.x + 'px', top: nodePopover.y + 'px' }"
      >
        <div class="kg-node-popover-title">{{ nodePopover.label }}</div>
        <div v-if="!nodePopover.occurrences || nodePopover.occurrences.length === 0" class="kg-node-popover-empty">
          无跳转位置（请从文档保存的知识图谱中打开）
        </div>
        <ul v-else class="kg-node-popover-list">
          <li
            v-for="(occ, idx) in nodePopover.occurrences"
            :key="idx"
            class="kg-node-popover-item"
            @click="handleJumpTo(occ)"
          >
            {{ occ.documentTitle || occ.documentId || '文档' }} · 位置 {{ occ.start }}–{{ occ.end }}
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import cytoscape from 'cytoscape';
import type { KnowledgeGraph, KgNodeOccurrence } from '../../domain/services/knowledge-graph-extractor';

interface Props {
  graph: KnowledgeGraph | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'jump-to', payload: { documentId: string; documentTitle?: string; start: number; end: number }): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
let cy: cytoscape.Core | null = null;

const nodePopover = ref<{
  show: boolean;
  x: number;
  y: number;
  label: string;
  occurrences: KgNodeOccurrence[];
}>({
  show: false,
  x: 0,
  y: 0,
  label: '',
  occurrences: []
});

function hidePopover() {
  nodePopover.value.show = false;
}

function handleJumpTo(occ: KgNodeOccurrence) {
  if (occ.documentId != null) {
    emit('jump-to', {
      documentId: occ.documentId,
      documentTitle: occ.documentTitle,
      start: occ.start,
      end: occ.end
    });
  }
  hidePopover();
}

function initGraph() {
  if (!containerRef.value || !props.graph) return;
  const { nodes, edges } = props.graph;
  if (!nodes || nodes.length === 0) return;
  const elements: Array<{ group: string; data: Record<string, unknown> }> = [];

  nodes.forEach((n) => {
    elements.push({
      group: 'nodes',
      data: {
        id: n.id,
        label: n.label,
        type: n.type
      }
    });
  });

  edges.forEach((e, i) => {
    elements.push({
      group: 'edges',
      data: {
        id: `e_${e.source}_${e.target}_${i}`,
        source: e.source,
        target: e.target,
        relation: e.relation || ''
      }
    });
  });

  if (cy) {
    cy.destroy();
    cy = null;
  }

  cy = cytoscape({
    container: containerRef.value,
    elements,
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '11px',
          'text-wrap': 'wrap',
          'text-max-width': '100px',
          width: 40,
          height: 40,
          'background-color': '#edf2ff',
          color: '#1a202c',
          'border-width': 2,
          'border-color': '#4c6fff'
        }
      },
      {
        selector: 'node[type="section"]',
        style: {
          'background-color': '#e3f2fd',
          'border-color': '#1d4ed8'
        }
      },
      {
        selector: 'node[type="link"]',
        style: {
          'background-color': '#dcfce7',
          'border-color': '#16a34a'
        }
      },
      {
        selector: 'node[type="tag"]',
        style: {
          'background-color': '#fff7ed',
          'border-color': '#ea580c'
        }
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#94a3b8',
          'target-arrow-color': '#94a3b8',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          label: 'data(relation)',
          'font-size': 9,
          'text-rotation': 'autorotate',
          'text-margin-y': -8,
          color: '#475569'
        }
      }
    ],
    layout: {
      name: 'cose',
      animate: true,
      nodeDimensionsIncludeLabels: true,
      idealEdgeLength: 80,
      nodeRepulsion: 4000
    }
  });

  cy.on('tap', 'node', (evt) => {
    const node = evt.target;
    const id = node.id();
    const kgNode = props.graph!.nodes!.find((n) => n.id === id);
    if (!kgNode) return;
    const pos = (evt as any).renderedPosition || (evt as any).position || { x: 0, y: 0 };
    const container = containerRef.value;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = rect.left + pos.x + 20;
    const y = rect.top + pos.y + 10;
    nodePopover.value = {
      show: true,
      x: Math.min(x, window.innerWidth - 240),
      y: Math.min(y, window.innerHeight - 200),
      label: kgNode.label,
      occurrences: kgNode.occurrences || []
    };
  });

  cy.on('tap', (evt) => {
    if (evt.target === cy) hidePopover();
  });
}

watch(
  () => props.graph,
  (g) => {
    if (g && g.nodes && g.nodes.length > 0 && containerRef.value) {
      nextTick(() => initGraph());
    }
  },
  { deep: true }
);

onMounted(() => {
  if (props.graph && props.graph.nodes && props.graph.nodes.length > 0 && containerRef.value) {
    nextTick(() => initGraph());
  }
});

onUnmounted(() => {
  if (cy) {
    cy.destroy();
    cy = null;
  }
});
</script>

<style scoped>
.knowledge-graph-view-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kg-placeholder {
  flex: 1;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.95rem;
  padding: 24px;
  text-align: center;
}

.knowledge-graph-cy-container {
  width: 100%;
  flex: 1;
  min-height: 320px;
  height: 100%;
  background: var(--bg-secondary, #f1f5f9);
  border-radius: 6px;
  box-shadow: var(--shadow-md);
}

.kg-node-popover {
  position: fixed;
  z-index: 1000;
  min-width: 200px;
  max-width: 280px;
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
}

.kg-node-popover-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.kg-node-popover-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.kg-node-popover-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.kg-node-popover-item {
  padding: 6px 8px;
  font-size: 0.9rem;
  cursor: pointer;
  border-radius: 4px;
  color: var(--text-primary);
}

.kg-node-popover-item:hover {
  background: var(--bg-hover);
}
</style>
