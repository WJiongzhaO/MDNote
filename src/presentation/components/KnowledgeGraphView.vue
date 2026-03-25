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
import { ref, watch, onMounted, onUnmounted, nextTick, toRaw } from 'vue';
import cytoscape from 'cytoscape';
import type { KnowledgeGraph, KgNodeOccurrence, KgNodePositions } from '../../domain/services/knowledge-graph-extractor';
import { fillMissingNodePositions, hasCompleteNodeLayout } from '../../domain/services/knowledge-graph-layout';

interface Props {
  graph: KnowledgeGraph | null;
  /** 父组件在「随机重新布局」时递增，用于在 nodePositions 均为空时仍能触发重新 cose */
  layoutRandomizeKey?: number;
  /**
   * 与父级会话一致（如 path#id#epoch）。仅依赖节点 id/边时无法区分「结构相同的不同文件」，
   * 该键变化时强制重建 Cytoscape，避免主区仍显示上一文件内容。
   */
  graphLoadKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  layoutRandomizeKey: 0,
  graphLoadKey: ''
});

const emit = defineEmits<{
  (e: 'jump-to', payload: { documentId: string; documentTitle?: string; start: number; end: number }): void;
  (e: 'graph-update', graph: KnowledgeGraph): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
let cy: cytoscape.Core | null = null;
/** 每次 initGraph 递增；丢弃已过期的 layoutstop 与拖拽 emit，避免污染父级当前图谱 */
let kgViewLayoutSession = 0;

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

function graphStructureKey(g: KnowledgeGraph | null): string {
  if (!g?.nodes?.length) return '';
  const ids = g.nodes
    .map((n) => n.id)
    .sort()
    .join(',');
  const es = g.edges
    .map((e) => `${e.source}|${e.target}|${e.relation || ''}`)
    .sort()
    .join(';');
  const labels = g.nodes
    .map((n) => `${n.id}:${n.label ?? ''}`)
    .sort()
    .join('|');
  return `${ids}#${es}#${labels}`;
}

function nodePositionsSig(pos: KnowledgeGraph['nodePositions']): string {
  if (!pos || Object.keys(pos).length === 0) return '';
  const keys = Object.keys(pos).sort();
  return keys.map((k) => `${k}:${pos[k].x.toFixed(2)},${pos[k].y.toFixed(2)}`).join('|');
}

function hashGraphSignature(graph: KnowledgeGraph): number {
  const ids = graph.nodes
    .map((n) => n.id)
    .sort()
    .join(',');
  const es = graph.edges
    .map((e) => `${e.source}|${e.target}|${e.relation || ''}`)
    .sort()
    .join(';');
  const s = `${ids}#${es}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 1000000007;
}

function collectPositions(): KgNodePositions {
  const out: KgNodePositions = {};
  if (!cy) return out;
  cy.nodes().forEach((n) => {
    const p = n.position();
    out[n.id()] = { x: p.x, y: p.y };
  });
  return out;
}

function positionsEqual(a: KgNodePositions | undefined, b: KgNodePositions): boolean {
  if (!a) return false;
  const keys = Object.keys(b);
  if (Object.keys(a).length !== keys.length) return false;
  for (const k of keys) {
    const pa = a[k];
    const pb = b[k];
    if (!pa || !pb) return false;
    if (Math.abs(pa.x - pb.x) > 0.5 || Math.abs(pa.y - pb.y) > 0.5) return false;
  }
  return true;
}

/** 画布上的节点是否与 props 中的 nodePositions 一致（用于区分「自己刚 emit」与「外部随机/换数据」） */
function cyMatchesPropsPositions(): boolean {
  if (!cy || !props.graph) return false;
  return positionsEqual(props.graph.nodePositions, collectPositions());
}

function graphPayloadWithPositions(next: KgNodePositions): KnowledgeGraph {
  const base = toRaw(props.graph) as KnowledgeGraph;
  return { ...base, nodePositions: next };
}

function emitGraphUpdateIfChanged(expectedSession?: number) {
  if (expectedSession != null && expectedSession !== kgViewLayoutSession) return;
  if (!props.graph) return;
  const next = collectPositions();
  if (Object.keys(next).length === 0) return;
  if (positionsEqual(props.graph.nodePositions, next)) return;
  emit('graph-update', graphPayloadWithPositions(next));
}

/**
 * 从磁盘加载后曾关闭 persistAfterLayout，父组件 ref 里可能仍是代理/旧引用，与画布模型脱节；
 * 在 resize/fit 稳定后把 Cytoscape 当前坐标推回父组件，保证「手动保存」与画布一致。
 */
function pushCyPositionsToParent(expectedSession: number): void {
  if (expectedSession !== kgViewLayoutSession) return;
  if (!props.graph || !cy) return;
  const next = collectPositions();
  if (Object.keys(next).length === 0) return;
  if (positionsEqual(props.graph.nodePositions, next)) return;
  emit('graph-update', graphPayloadWithPositions(next));
}

function schedulePushCyPositionsToParent(layoutSession: number): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      pushCyPositionsToParent(layoutSession);
    });
  });
}

function ensureInteractive(cyInstance: cytoscape.Core) {
  cyInstance.userPanningEnabled(true);
  cyInstance.userZoomingEnabled(true);
  cyInstance.boxSelectionEnabled(false);
  cyInstance.autoungrabify(false);
  cyInstance.autounselectify(false);
  cyInstance.nodes().forEach((n) => {
    n.unlock();
    n.grabify();
  });
}

/** 与 cose 一样写入模型坐标；unlock 避免被内部 lock 挡住；toRaw 由调用方保证 */
function applyNodePositionsToCy(cyInstance: cytoscape.Core, posMap: KgNodePositions): void {
  cyInstance.batch(() => {
    cyInstance.nodes().forEach((node) => {
      const p = posMap[node.id()];
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
        node.unlock();
        node.position({ x: p.x, y: p.y });
      }
    });
  });
}

/** 固定布局后多帧补写：Electron/flex 首帧容器尺寸或 renderer 未就绪时单次 apply 可能无效 */
function applyFixedLayoutWithRetries(
  cyInstance: cytoscape.Core,
  posPlain: KgNodePositions,
  layoutSession: number,
  persistSyntheticFill: boolean
): void {
  const run = () => {
    if (layoutSession !== kgViewLayoutSession) return;
    if ((cyInstance as { destroyed?: () => boolean }).destroyed?.()) return;
    cyInstance.resize();
    ensureInteractive(cyInstance);
    applyNodePositionsToCy(cyInstance, posPlain);
    ensureInteractive(cyInstance);
    resizeAndFit(cyInstance);
  };
  cyInstance.ready(run);
  run();
  requestAnimationFrame(run);
  setTimeout(() => {
    run();
    if (persistSyntheticFill) {
      schedulePushCyPositionsToParent(layoutSession);
    }
  }, 48);
}

const KG_FIT_PADDING = 40;

/**
 * 侧栏 flex 首帧容器宽高常为 0，直接 fit 会得到错误缩放；先 resize 再 fit，并在下一帧再跑一次。
 */
function resizeAndFit(cyInstance: cytoscape.Core, padding = KG_FIT_PADDING): void {
  cyInstance.resize();
  cyInstance.fit(undefined, padding);
  requestAnimationFrame(() => {
    const destroyed = (cyInstance as { destroyed?: () => boolean }).destroyed?.();
    if (destroyed) return;
    cyInstance.resize();
    cyInstance.fit(undefined, padding);
  });
}

/**
 * @param persistAfterLayout 用户「随机重新布局」等为 true，layout 结束后写盘。
 * @param persistSyntheticFill 仅补了缺省坐标后需把合并后的 nodePositions 写回父级/JSON（在最后一帧重试后推送一次）。
 */
function runLayoutAndBind(
  cyInstance: cytoscape.Core,
  graph: KnowledgeGraph,
  layoutSession: number,
  persistAfterLayout: boolean,
  persistSyntheticFill = false
) {
  const complete = hasCompleteNodeLayout(graph);
  const hasPartialPositions =
    !!graph.nodePositions && Object.keys(graph.nodePositions).length > 0 && !complete;

  if (complete) {
    const posPlain = toRaw(graph.nodePositions) as KgNodePositions;
    applyFixedLayoutWithRetries(cyInstance, posPlain, layoutSession, persistSyntheticFill);
    return;
  }

  const layoutOpts: cytoscape.LayoutOptions = {
    name: 'cose',
    animate: true,
    nodeDimensionsIncludeLabels: true,
    idealEdgeLength: 80,
    nodeRepulsion: 4000,
    randomSeed: hasPartialPositions ? hashGraphSignature(graph) : undefined
  };

  const layout = cyInstance.layout(layoutOpts);
  layout.one('layoutstop', () => {
    if (layoutSession !== kgViewLayoutSession) return;
    ensureInteractive(cyInstance);
    resizeAndFit(cyInstance);
    if (persistAfterLayout || persistSyntheticFill) {
      emitGraphUpdateIfChanged(layoutSession);
    }
  });
  layout.run();
}

function bindGraphEvents(cyInstance: cytoscape.Core, layoutSession: number) {
  cyInstance.on('tap', 'node', (evt) => {
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

  cyInstance.on('tap', (evt) => {
    if (evt.target === cyInstance) hidePopover();
  });

  cyInstance.on('dragfree', 'node', () => {
    emitGraphUpdateIfChanged(layoutSession);
  });
}

function buildElements(graph: KnowledgeGraph) {
  const { nodes, edges } = graph;
  const posMap = graph.nodePositions;
  const elements: Array<{ group: string; data: Record<string, unknown>; position?: { x: number; y: number } }> = [];

  nodes.forEach((n) => {
    const p = posMap?.[n.id];
    const el: (typeof elements)[0] = {
      group: 'nodes',
      data: {
        id: n.id,
        label: n.label,
        type: n.type
      }
    };
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      el.position = { x: p.x, y: p.y };
    }
    elements.push(el);
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

  return elements;
}

function initGraph() {
  if (!containerRef.value || !props.graph) return;
  const { nodes } = props.graph;
  if (!nodes || nodes.length === 0) return;

  const raw = toRaw(props.graph) as KnowledgeGraph;
  const graphForLayout = fillMissingNodePositions(raw);
  const persistSyntheticFill =
    !hasCompleteNodeLayout(raw) && hasCompleteNodeLayout(graphForLayout);
  const elements = buildElements(graphForLayout);

  if (cy) {
    cy.destroy();
    cy = null;
  }

  kgViewLayoutSession++;
  const layoutSession = kgViewLayoutSession;

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
    ]
  });

  ensureInteractive(cy);
  bindGraphEvents(cy, layoutSession);
  const persistAfterLayout =
    !hasCompleteNodeLayout(graphForLayout) || persistSyntheticFill;
  runLayoutAndBind(cy, graphForLayout, layoutSession, persistAfterLayout, persistSyntheticFill);
}

/**
 * 仅 nodePositions 变化（结构不变）：不销毁实例，避免拖拽被反复打断。
 */
function applyPositionsFromPropsOnly() {
  if (!cy || !props.graph?.nodePositions) return;
  const pos = toRaw(props.graph.nodePositions) as KgNodePositions;
  ensureInteractive(cy);
  applyNodePositionsToCy(cy, pos);
  resizeAndFit(cy);
}

function onNodePositionsOnlyChanged() {
  if (!cy || !props.graph) return;
  if (cyMatchesPropsPositions()) return;

  const g = props.graph;
  const session = kgViewLayoutSession;
  if (!g.nodePositions || Object.keys(g.nodePositions).length === 0) {
    runLayoutAndBind(cy, g, session, false);
    return;
  }
  if (hasCompleteNodeLayout(g)) {
    applyPositionsFromPropsOnly();
    return;
  }
  const filled = fillMissingNodePositions(g);
  if (hasCompleteNodeLayout(filled)) {
    runLayoutAndBind(cy, filled, session, false, !hasCompleteNodeLayout(g));
    return;
  }
  runLayoutAndBind(cy, g, session, false);
}

watch(
  () => ({
    loadKey: props.graphLoadKey ?? '',
    structure: graphStructureKey(props.graph),
    posSig: nodePositionsSig(props.graph?.nodePositions),
    rk: props.layoutRandomizeKey ?? 0
  }),
  (curr, prev) => {
    if (!props.graph?.nodes?.length) return;
    nextTick(() => {
      if (!containerRef.value) return;
      if (!prev) {
        initGraph();
        return;
      }
      if (curr.loadKey !== prev.loadKey) {
        initGraph();
        return;
      }
      if (curr.structure !== prev.structure) {
        initGraph();
        return;
      }
      if (curr.rk !== prev.rk) {
        if (!cy) {
          initGraph();
          return;
        }
        runLayoutAndBind(cy, props.graph!, kgViewLayoutSession, true, false);
        return;
      }
      if (curr.posSig === prev.posSig) return;
      onNodePositionsOnlyChanged();
    });
  },
  { immediate: true }
);

onMounted(() => {
  // 图谱在首帧之后才出现（v-if）时，immediate 可能拿不到 containerRef，再补一次
  nextTick(() => {
    if (props.graph?.nodes?.length && containerRef.value && !cy) {
      initGraph();
    }
  });
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
