<template>
  <div class="knowledge-graph-view-wrap">
    <div v-if="!graph || (graph.nodes && graph.nodes.length === 0)" class="kg-placeholder">
      请从左侧列表选择知识图谱，或先在编辑器中生成并保存图谱。
    </div>
    <div v-else class="kg-view-body">
      <div class="kg-canvas-col">
        <div class="kg-toolbar">
          <div class="kg-toolbar-tools" role="toolbar" aria-label="知识图谱编辑工具">
            <button
              type="button"
              class="kg-tool-icon-btn"
              :class="{ 'kg-tool-icon-btn-active': effectiveMode === 'pan' }"
              title="查看 / 选中（默认）：拖动画布、点选节点与边"
              :aria-pressed="effectiveMode === 'pan'"
              @click="setToolbarMode('pan')"
            >
              <svg class="kg-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M11.5 2.25a1.5 1.5 0 0 1 1.5 1.5v8.45l2.65-2.65a1.5 1.5 0 1 1 2.12 2.12L12.5 17.54V22h-2v-5.46L5.23 11.27a1.5 1.5 0 0 1 2.12-2.12L10 12.8V3.75a1.5 1.5 0 0 1 1.5-1.5z"
                />
              </svg>
            </button>
            <button
              type="button"
              class="kg-tool-icon-btn"
              :class="{ 'kg-tool-icon-btn-active': effectiveMode === 'add-node' }"
              title="添加节点：点击画布空白处放置；或按住 N 临时进入此模式"
              :aria-pressed="effectiveMode === 'add-node'"
              @click="setToolbarMode('add-node')"
            >
              <svg class="kg-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" />
              </svg>
            </button>
            <button
              type="button"
              class="kg-tool-icon-btn"
              :class="{ 'kg-tool-icon-btn-active': effectiveMode === 'add-edge' }"
              title="添加边：先点起点节点，再点终点；或按住 B 临时进入；点空白取消起点"
              :aria-pressed="effectiveMode === 'add-edge'"
              @click="setToolbarMode('add-edge')"
            >
              <svg class="kg-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 12h10M14 8l4 4-4 4"
                />
              </svg>
            </button>
            <button
              type="button"
              class="kg-tool-icon-btn kg-tool-icon-btn-danger"
              :disabled="!canDeleteSelection"
              title="删除当前选中的节点或边"
              @click="deleteSelection"
            >
              <svg class="kg-tool-svg" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                />
              </svg>
            </button>
          </div>
          <p class="kg-toolbar-mode-hint">{{ modeHintText }}</p>
          <p class="kg-toolbar-key-hint">快捷键：按住 <kbd>N</kbd> 添加节点 · 按住 <kbd>B</kbd> 添加边（松手回到工具栏当前模式）</p>
        </div>
        <div
          ref="containerRef"
          class="knowledge-graph-cy-container"
          :class="{
            'kg-cy-cursor-crosshair': effectiveMode === 'add-node',
            'kg-cy-cursor-edge': effectiveMode === 'add-edge'
          }"
        ></div>
        <div
          v-if="nodePopover.show"
          class="kg-node-popover"
          :style="{ left: nodePopover.x + 'px', top: nodePopover.y + 'px' }"
          @mouseenter="onPopoverMouseEnter"
          @mouseleave="onPopoverMouseLeave"
        >
          <div class="kg-node-popover-title">{{ nodePopover.label }}</div>
          <div class="kg-node-popover-meta">{{ nodePopover.meta }}</div>
          <div class="kg-node-popover-fragment">{{ nodePopover.fragmentLine }}</div>
          <div v-if="!nodePopover.occurrences || nodePopover.occurrences.length === 0" class="kg-node-popover-empty">
            无文档内出现位置（从文档保存的图谱或 occurrences 会有）
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
          <div class="kg-node-popover-hint">单击选中后在右侧编辑；双击已绑定片段的节点可跳转到文中引用</div>
        </div>
      </div>
      <aside class="kg-inspector">
        <div class="kg-inspector-head">属性</div>
        <div v-if="inspectorKind === 'none'" class="kg-inspector-empty">单击画布上的节点或连线，在此查看并编辑。</div>
        <template v-else-if="inspectorKind === 'node'">
          <label class="kg-edit-label">显示名称</label>
          <input v-model="inspectorNodeLabel" type="text" class="kg-edit-input" maxlength="200" />
          <label class="kg-edit-label">类型</label>
          <select v-model="inspectorNodeType" class="kg-edit-input">
            <option value="section">章节标题</option>
            <option value="link">双链</option>
            <option value="tag">标签</option>
          </select>
          <template v-if="inspectorNodeType === 'section'">
            <label class="kg-edit-label">标题级别 (1–6)</label>
            <input
              v-model.number="inspectorNodeLevel"
              type="number"
              min="1"
              max="6"
              class="kg-edit-input"
            />
          </template>
          <label class="kg-edit-label">绑定知识片段</label>
          <select v-model="inspectorNodeFragmentId" class="kg-edit-input">
            <option value="">不绑定</option>
            <option v-for="f in fragments" :key="f.id" :value="f.id">{{ f.title || f.id }}</option>
          </select>
          <p v-if="fragmentsLoadError" class="kg-inspector-warn">{{ fragmentsLoadError }}</p>

          <template v-if="inspectorNodeFragmentId.trim()">
            <label class="kg-edit-label">片段内容预览</label>
            <div
              class="kg-fragment-preview-box"
              :class="{ 'kg-fragment-preview-clickable': !!inspectorFragmentResolved }"
              role="button"
              tabindex="0"
              @click="onFragmentPreviewClick"
              @keydown.enter.prevent="onFragmentPreviewClick"
            >
              <div v-if="inspectorFragmentPreviewLoading" class="kg-fragment-preview-loading">加载中…</div>
              <template v-else-if="inspectorFragmentResolved">
                <div
                  v-if="inspectorFragmentResolved.previewType === 'image' && inspectorFragmentResolved.previewImage"
                  class="kg-fragment-preview-image-wrap"
                >
                  <img
                    v-if="inspectorFragmentImageUrl"
                    :src="inspectorFragmentImageUrl"
                    class="kg-fragment-preview-img"
                    alt=""
                    @error="onInspectorPreviewImageError"
                  />
                  <div v-else class="kg-fragment-preview-placeholder">预览图加载中…</div>
                </div>
                <div
                  v-else-if="inspectorFragmentResolved.previewType === 'mermaid'"
                  class="kg-fragment-mermaid-wrap"
                >
                  <div
                    v-if="inspectorFragmentMermaidSvg"
                    class="kg-fragment-mermaid-inner"
                    v-html="inspectorFragmentMermaidSvg"
                  ></div>
                  <div v-else class="kg-fragment-preview-placeholder">图表渲染中…</div>
                </div>
                <div
                  v-else-if="inspectorFragmentPreviewHtml"
                  class="kg-fragment-preview-md"
                  v-html="inspectorFragmentPreviewHtml"
                ></div>
                <div v-else class="kg-fragment-preview-placeholder">暂无预览</div>
                <div class="kg-fragment-preview-hint">点击查看完整内容</div>
              </template>
              <div v-else class="kg-fragment-preview-placeholder">无法加载该片段</div>
            </div>
          </template>

          <div class="kg-edit-actions">
            <button type="button" class="kg-edit-btn kg-edit-btn-primary" @click="saveInspector">保存</button>
          </div>
        </template>
        <template v-else>
          <p class="kg-edit-edge-endpoints">{{ inspectorEdgeSourceLabel }} → {{ inspectorEdgeTargetLabel }}</p>
          <label class="kg-edit-label">关系说明</label>
          <input v-model="inspectorEdgeRelation" type="text" class="kg-edit-input" maxlength="120" />
          <div class="kg-edit-actions">
            <button type="button" class="kg-edit-btn kg-edit-btn-primary" @click="saveInspector">保存</button>
          </div>
        </template>
      </aside>

      <div
        v-if="fragmentDetailOpen"
        class="kg-fragment-detail-overlay"
        @click.self="closeFragmentDetail"
      >
        <div class="kg-fragment-detail-modal" @click.stop>
          <div class="kg-fragment-detail-head">
            <h4 class="kg-fragment-detail-title">{{ fragmentDetailTitle }}</h4>
            <button type="button" class="kg-fragment-detail-close" @click="closeFragmentDetail">关闭</button>
          </div>
          <div class="kg-fragment-detail-body" v-html="fragmentDetailHtml"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, toRaw, computed } from 'vue';
import cytoscape from 'cytoscape';
import type {
  KnowledgeGraph,
  KgNode,
  KgNodeOccurrence,
  KgNodePositions,
  KgViewport
} from '../../domain/services/knowledge-graph-extractor';
import { fillMissingNodePositions, hasCompleteNodeLayout } from '../../domain/services/knowledge-graph-layout';
import { useKnowledgeFragments } from '../composables/useKnowledgeFragments';
import type { KnowledgeFragmentResponse } from '../../application/dto/knowledge-fragment.dto';
import { getAiAnchorOccurrence } from '../utils/knowledge-graph-jump.util';

type AiEvidencePreviewLike = {
  excerpt?: string;
};

type AiAnchorLike = {
  docId?: string;
  startOffset?: number;
  endOffset?: number;
  excerpt?: string;
};

type ExtendedKgNode = KgNode & {
  entityType?: string;
  evidenceCount?: number;
  evidencePreview?: AiEvidencePreviewLike[];
  primaryAnchor?: AiAnchorLike;
};

interface Props {
  graph: KnowledgeGraph | null;
  /** 父组件在「随机重新布局」时递增，用于在 nodePositions 均为空时仍能触发重新 cose */
  layoutRandomizeKey?: number;
  /**
   * 与父级会话一致（如 path#id#epoch）。仅依赖节点 id/边时无法区分「结构相同的不同文件」，
   * 该键变化时强制重建 Cytoscape，避免主区仍显示上一文件内容。
   */
  graphLoadKey?: string;
  /** 渲染 Markdown 预览（与知识片段库一致，传入 fragment:id 以解析图片等资源） */
  renderMarkdown?: (
    content: string,
    documentId?: string,
    variables?: Record<string, unknown>,
    fileCache?: unknown
  ) => Promise<string>;
}

const props = withDefaults(defineProps<Props>(), {
  layoutRandomizeKey: 0,
  graphLoadKey: ''
});

const emit = defineEmits<{
  (e: 'jump-to', payload: { documentId: string; documentTitle?: string; start: number; end: number }): void;
  (e: 'jump-to-fragment', payload: { fragmentId: string }): void;
  (e: 'graph-update', graph: KnowledgeGraph): void;
}>();

const {
  fragments,
  loadFragments,
  getFragment,
  error: fragmentsComposableError
} = useKnowledgeFragments();

const fragmentsLoadError = computed(() => fragmentsComposableError.value || '');

const kgPreviewImagePathCache: Record<string, string> = {};

/** 右侧：当前绑定片段的解析结果与预览 */
const inspectorFragmentResolved = ref<KnowledgeFragmentResponse | null>(null);
const inspectorFragmentPreviewLoading = ref(false);
const inspectorFragmentPreviewHtml = ref('');
const inspectorFragmentImageUrl = ref('');
const inspectorFragmentMermaidSvg = ref('');

const fragmentDetailOpen = ref(false);
const fragmentDetailTitle = ref('');
const fragmentDetailHtml = ref('');

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function resolveKgPreviewImageUrl(imagePath: string): Promise<string> {
  if (kgPreviewImagePathCache[imagePath]) return kgPreviewImagePathCache[imagePath];
  const electronAPI = (window as any).electronAPI;
  try {
    if (imagePath.startsWith('fragments/') && electronAPI?.fragment?.getFullPath) {
      const fullPath = await electronAPI.fragment.getFullPath(imagePath);
      kgPreviewImagePathCache[imagePath] = fullPath;
      return fullPath;
    }
    if (electronAPI?.file?.getFullPath) {
      const fullPath = await electronAPI.file.getFullPath(imagePath);
      kgPreviewImagePathCache[imagePath] = fullPath;
      return fullPath;
    }
  } catch {
    /* 使用原路径 */
  }
  kgPreviewImagePathCache[imagePath] = imagePath;
  return imagePath;
}

function resetFragmentPreviewContent() {
  inspectorFragmentResolved.value = null;
  inspectorFragmentPreviewHtml.value = '';
  inspectorFragmentPreviewLoading.value = false;
  inspectorFragmentImageUrl.value = '';
  inspectorFragmentMermaidSvg.value = '';
}

function clearFragmentPreviewState() {
  resetFragmentPreviewContent();
  fragmentDetailOpen.value = false;
  fragmentDetailTitle.value = '';
  fragmentDetailHtml.value = '';
}

async function renderInspectorFragmentMermaid(frag: KnowledgeFragmentResponse) {
  inspectorFragmentMermaidSvg.value = '';
  if (!frag.previewMermaidCode) return;
  try {
    const { InversifyContainer } = await import('../../core/container/inversify.container');
    const { TYPES } = await import('../../core/container/container.types');
    const container = InversifyContainer.getInstance();
    const renderer = container.get<{
      renderDiagram: (code: string, opts?: Record<string, unknown>) => Promise<string>;
    }>(TYPES.MermaidRenderer);
    const svg = await renderer.renderDiagram(frag.previewMermaidCode, {
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit'
    });
    if (typeof svg === 'string' && svg.includes('<svg')) {
      inspectorFragmentMermaidSvg.value = `<div class="kg-mermaid-svg-host">${svg}</div>`;
    }
  } catch (e) {
    console.warn('[知识图谱] Mermaid 预览失败', e);
  }
}

async function refreshInspectorFragmentPreview() {
  resetFragmentPreviewContent();
  if (inspectorKind.value !== 'node') return;
  const fid = inspectorNodeFragmentId.value.trim();
  if (!fid) return;

  inspectorFragmentPreviewLoading.value = true;
  try {
    let frag = fragments.value.find((f) => f.id === fid) ?? null;
    if (!frag) {
      try {
        frag = await getFragment(fid);
      } catch {
        frag = null;
      }
    }
    if (!frag) {
      inspectorFragmentResolved.value = null;
      return;
    }
    inspectorFragmentResolved.value = frag;

    if (frag.previewType === 'image' && frag.previewImage) {
      inspectorFragmentImageUrl.value = await resolveKgPreviewImageUrl(frag.previewImage);
    } else if (frag.previewType === 'mermaid' && frag.previewMermaidCode) {
      await renderInspectorFragmentMermaid(frag);
    } else {
      const previewMd = frag.markdown.substring(0, 500);
      if (props.renderMarkdown) {
        inspectorFragmentPreviewHtml.value = await props.renderMarkdown(
          previewMd,
          `fragment:${frag.id}`
        );
      } else {
        inspectorFragmentPreviewHtml.value = `<pre class="kg-fragment-plain">${escapeHtml(previewMd)}</pre>`;
      }
    }
  } finally {
    inspectorFragmentPreviewLoading.value = false;
  }
}

function onInspectorPreviewImageError(ev: Event) {
  const el = ev.target as HTMLImageElement;
  el.style.display = 'none';
}

function onFragmentPreviewClick() {
  if (!inspectorFragmentResolved.value || inspectorFragmentPreviewLoading.value) return;
  void openFragmentDetail();
}

async function openFragmentDetail() {
  const frag = inspectorFragmentResolved.value;
  if (!frag) return;
  fragmentDetailTitle.value = frag.title || '知识片段';
  fragmentDetailOpen.value = true;
  fragmentDetailHtml.value = '<p class="kg-fragment-detail-loading">加载中…</p>';
  try {
    if (props.renderMarkdown) {
      fragmentDetailHtml.value = await props.renderMarkdown(frag.markdown, `fragment:${frag.id}`);
    } else {
      fragmentDetailHtml.value = `<pre class="kg-fragment-plain">${escapeHtml(frag.markdown)}</pre>`;
    }
  } catch (e) {
    console.error('[知识图谱] 片段全文渲染失败', e);
    fragmentDetailHtml.value = '<p>内容加载失败</p>';
  }
}

function closeFragmentDetail() {
  fragmentDetailOpen.value = false;
}

const containerRef = ref<HTMLDivElement | null>(null);
let cy: cytoscape.Core | null = null;
/** 每次 initGraph 递增；丢弃已过期的 layoutstop 与拖拽 emit，避免污染父级当前图谱 */
let kgViewLayoutSession = 0;
let viewportEmitTimer: ReturnType<typeof setTimeout> | null = null;
const KG_VIEWPORT_EMIT_MS = 450;

function clearViewportEmitTimer() {
  if (viewportEmitTimer != null) {
    clearTimeout(viewportEmitTimer);
    viewportEmitTimer = null;
  }
}

function scheduleEmitViewport() {
  if (!props.graph?.nodes?.length || !cy) return;
  clearViewportEmitTimer();
  viewportEmitTimer = window.setTimeout(() => {
    viewportEmitTimer = null;
    emitGraphUpdateIfCyStateChanged();
  }, KG_VIEWPORT_EMIT_MS);
}
/** 布局稳定后选中新建节点/边（由 runPostLayoutHookIfAny 消费） */
let pendingPostLayoutAction: { type: 'node'; id: string } | { type: 'edge'; index: number } | null = null;

const nodePopover = ref<{
  show: boolean;
  x: number;
  y: number;
  label: string;
  meta: string;
  fragmentLine: string;
  occurrences: KgNodeOccurrence[];
}>({
  show: false,
  x: 0,
  y: 0,
  label: '',
  meta: '',
  fragmentLine: '',
  occurrences: []
});

function fragmentTitleForId(id: string | undefined): string {
  if (!id) return '';
  const f = fragments.value.find((x) => x.id === id);
  return f?.title || id;
}

function buildFragmentLine(n: ExtendedKgNode): string {
  if (!n.fragmentId) return '知识片段：未绑定';
  return `知识片段：${fragmentTitleForId(n.fragmentId)}`;
}

let popoverHideTimer: ReturnType<typeof setTimeout> | null = null;

function hidePopover() {
  nodePopover.value.show = false;
}

function cancelHidePopover() {
  if (popoverHideTimer != null) {
    clearTimeout(popoverHideTimer);
    popoverHideTimer = null;
  }
}

function scheduleHidePopover() {
  cancelHidePopover();
  popoverHideTimer = window.setTimeout(() => {
    popoverHideTimer = null;
    hidePopover();
  }, 220);
}

function onPopoverMouseEnter() {
  cancelHidePopover();
}

function onPopoverMouseLeave() {
  scheduleHidePopover();
}

function nodeTypeLabel(t: KgNode['type']): string {
  if (t === 'section') return '章节标题';
  if (t === 'link') return '双链';
  return '标签';
}

function getNodeOccurrences(node: ExtendedKgNode): KgNodeOccurrence[] {
  if (Array.isArray(node.occurrences) && node.occurrences.length > 0) {
    return node.occurrences;
  }
  const aiOccurrence = getAiAnchorOccurrence(node.primaryAnchor);
  return aiOccurrence ? [aiOccurrence] : [];
}

function getNodeEvidenceSummary(node: ExtendedKgNode): string {
  const preview = node.evidencePreview?.find((item) => typeof item?.excerpt === 'string' && item.excerpt.trim());
  if (preview?.excerpt?.trim()) {
    return `证据：${preview.excerpt.trim()}`;
  }
  return '证据：暂无摘要';
}

function buildNodeMeta(n: ExtendedKgNode): string {
  const parts = [`类型：${nodeTypeLabel(n.type)}`];
  if (n.type === 'section' && n.level != null) {
    parts.push(`H${n.level}`);
  }
  if (n.entityType) {
    parts.push(`实体：${n.entityType}`);
  }
  if (typeof n.evidenceCount === 'number') {
    parts.push(`证据 ${n.evidenceCount}`);
  }
  return parts.join(' · ');
}

/** 右侧属性栏：选中的节点或边 */
const inspectorKind = ref<'none' | 'node' | 'edge'>('none');
const inspectorNodeId = ref('');
const inspectorNodeLabel = ref('');
const inspectorNodeType = ref<KgNode['type']>('link');
const inspectorNodeLevel = ref(2);
const inspectorNodeFragmentId = ref('');
const inspectorEdgeIndex = ref(-1);
const inspectorEdgeRelation = ref('');
const inspectorEdgeSourceLabel = ref('');
const inspectorEdgeTargetLabel = ref('');

const toolbarMode = ref<'pan' | 'add-node' | 'add-edge'>('pan');
const keyNHeld = ref(false);
const keyBHeld = ref(false);
/** 连边：已选起点 id，等待点终点 */
const edgeDraftSourceId = ref<string | null>(null);

const effectiveMode = computed<'pan' | 'add-node' | 'add-edge'>(() => {
  if (keyNHeld.value) return 'add-node';
  if (keyBHeld.value) return 'add-edge';
  return toolbarMode.value;
});

const canDeleteSelection = computed(() => inspectorKind.value !== 'none');

const modeHintText = computed(() => {
  if (keyNHeld.value) return '按住 N：在空白处点击放置新节点（松手恢复）';
  if (keyBHeld.value) return '按住 B：先点起点再点终点连边，点空白取消起点（松手恢复）';
  switch (toolbarMode.value) {
    case 'add-node':
      return '添加节点：在画布空白处点击放置';
    case 'add-edge':
      return edgeDraftSourceId.value
        ? '已选起点，请点击另一节点作为终点（点空白取消起点）'
        : '添加边：依次点击两个节点（先起点，后终点）';
    default:
      return '查看 / 选中：拖移画布，点击节点或边在右侧编辑';
  }
});

function setToolbarMode(m: 'pan' | 'add-node' | 'add-edge') {
  toolbarMode.value = m;
  if (m !== 'add-edge') {
    edgeDraftSourceId.value = null;
    nextTick(() => syncEdgeDraftVisual());
  }
}

function syncEdgeDraftVisual() {
  if (!cy) return;
  try {
    const destroyed = (cy as { destroyed?: () => boolean }).destroyed?.();
    if (destroyed) return;
  } catch {
    return;
  }
  const id = edgeDraftSourceId.value;
  cy.batch(() => {
    cy!.nodes().removeClass('kg-edge-draft-source');
    if (id) {
      const n = cy!.getElementById(id);
      if (!n.empty()) n.addClass('kg-edge-draft-source');
    }
  });
}

function isKbTargetTyping(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return target.closest('input, textarea, select, [contenteditable="true"]') != null;
}

function onWindowKeyDown(e: KeyboardEvent) {
  if (!props.graph?.nodes?.length) return;
  if (isKbTargetTyping(e.target)) return;
  if (e.code === 'KeyN' && !e.repeat) {
    keyNHeld.value = true;
    e.preventDefault();
  }
  if (e.code === 'KeyB' && !e.repeat) {
    keyBHeld.value = true;
    e.preventDefault();
  }
}

function onWindowKeyUp(e: KeyboardEvent) {
  if (e.code === 'KeyN') keyNHeld.value = false;
  if (e.code === 'KeyB') {
    keyBHeld.value = false;
    edgeDraftSourceId.value = null;
    nextTick(() => syncEdgeDraftVisual());
  }
}

watch(
  () => effectiveMode.value,
  (mode, prev) => {
    if (prev === 'add-edge' && mode !== 'add-edge') {
      edgeDraftSourceId.value = null;
      nextTick(() => syncEdgeDraftVisual());
    }
  }
);

function runPostLayoutHookIfAny(layoutSession: number) {
  if (layoutSession !== kgViewLayoutSession || !cy) return;
  const act = pendingPostLayoutAction;
  pendingPostLayoutAction = null;
  if (!act) return;
  nextTick(() => {
    if (!cy || layoutSession !== kgViewLayoutSession) return;
    if (act.type === 'node') {
      const n = cy.getElementById(act.id);
      if (n.empty()) return;
      cy.batch(() => {
        cy!.$(':selected').unselect();
        n.select();
      });
      loadInspectorForNode(act.id);
    } else {
      const eles = cy.edges().filter((e) => Number(e.data('kgEdgeIndex')) === act.index);
      if (eles.empty()) return;
      cy.batch(() => {
        cy!.$(':selected').unselect();
        eles.select();
      });
      loadInspectorForEdge(act.index);
    }
  });
}

function clearCySelection() {
  if (cy) {
    cy.batch(() => {
      cy!.$(':selected').unselect();
    });
  }
}

function clearInspectorSelection() {
  inspectorKind.value = 'none';
  inspectorNodeId.value = '';
  clearFragmentPreviewState();
  clearCySelection();
}

function loadInspectorForNode(nodeId: string) {
  const g = props.graph;
  if (!g?.nodes) return;
  const n = g.nodes.find((x) => x.id === nodeId);
  if (!n) return;
  inspectorKind.value = 'node';
  inspectorNodeId.value = nodeId;
  inspectorNodeLabel.value = n.label;
  inspectorNodeType.value = n.type;
  inspectorNodeLevel.value = Math.min(6, Math.max(1, n.level ?? 2));
  inspectorNodeFragmentId.value = n.fragmentId ?? '';
}

function loadInspectorForEdge(edgeIndex: number) {
  clearFragmentPreviewState();
  const g = props.graph;
  if (!g?.edges?.[edgeIndex]) return;
  const e = g.edges[edgeIndex];
  const src = g.nodes.find((n) => n.id === e.source);
  const tgt = g.nodes.find((n) => n.id === e.target);
  inspectorKind.value = 'edge';
  inspectorEdgeIndex.value = edgeIndex;
  inspectorEdgeRelation.value = e.relation ?? '';
  inspectorEdgeSourceLabel.value = src?.label ?? e.source;
  inspectorEdgeTargetLabel.value = tgt?.label ?? e.target;
}

function saveInspector() {
  const base = toRaw(props.graph) as KnowledgeGraph;
  if (inspectorKind.value === 'node') {
    const id = inspectorNodeId.value;
    const label = inspectorNodeLabel.value.trim();
    if (!label) {
      window.alert('节点名称不能为空');
      return;
    }
    const type = inspectorNodeType.value;
    const level =
      type === 'section'
        ? Math.min(6, Math.max(1, Number(inspectorNodeLevel.value) || 2))
        : undefined;
    const frag = inspectorNodeFragmentId.value.trim();
    const nodes = base.nodes.map((n) => {
      if (n.id !== id) return n;
      const withFrag = { ...n, label, type, ...(frag ? { fragmentId: frag } : {}) };
      if (!frag) {
        delete (withFrag as { fragmentId?: string }).fragmentId;
      }
      if (type === 'section') {
        return { ...withFrag, level };
      }
      const rest = { ...withFrag };
      delete rest.level;
      return rest as KgNode;
    });
    emit('graph-update', { ...base, nodes });
  } else if (inspectorKind.value === 'edge') {
    const idx = inspectorEdgeIndex.value;
    if (idx < 0 || idx >= base.edges.length) return;
    const relation = inspectorEdgeRelation.value.trim();
    const edges = base.edges.map((e, i) => (i === idx ? { ...e, relation: relation || undefined } : e));
    emit('graph-update', { ...base, edges });
  }
}

function newManualNodeId(): string {
  const u =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `t${Date.now()}`;
  return `kg_${u}`;
}

/** 空白处点击 → 模型坐标（用于放置新节点） */
function modelPosFromCoreTap(evt: cytoscape.EventObject): { x: number; y: number } | null {
  const p = evt.position;
  if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
    return { x: p.x, y: p.y };
  }
  const cyInst = cy;
  if (!cyInst) return null;
  const rp = (evt as any).renderedPosition as { x: number; y: number } | undefined;
  if (!rp || !Number.isFinite(rp.x)) return null;
  try {
    const pan = cyInst.pan();
    const zoom = cyInst.zoom();
    return { x: (rp.x - pan.x) / zoom, y: (rp.y - pan.y) / zoom };
  } catch {
    return null;
  }
}

function createManualNodeAt(modelX: number, modelY: number) {
  if (!props.graph) return;
  const base = toRaw(props.graph) as KnowledgeGraph;
  const id = newManualNodeId();
  const newNode: KgNode = { id, label: '新节点', type: 'link' };
  const nodes = [...base.nodes, newNode];
  const nodePositions = { ...(base.nodePositions || {}), [id]: { x: modelX, y: modelY } };
  pendingPostLayoutAction = { type: 'node', id };
  emit('graph-update', { ...base, nodes, nodePositions });
}

function createEdgeFromTo(sourceId: string, targetId: string) {
  if (!props.graph || sourceId === targetId) return;
  const base = toRaw(props.graph) as KnowledgeGraph;
  const nextIndex = base.edges.length;
  const edges = [...base.edges, { source: sourceId, target: targetId, relation: '关联' }];
  pendingPostLayoutAction = { type: 'edge', index: nextIndex };
  edgeDraftSourceId.value = null;
  nextTick(() => syncEdgeDraftVisual());
  emit('graph-update', { ...base, edges });
}

function deleteSelection() {
  if (!props.graph || inspectorKind.value === 'none') return;
  pendingPostLayoutAction = null;
  const base = toRaw(props.graph) as KnowledgeGraph;
  if (inspectorKind.value === 'node') {
    const id = inspectorNodeId.value;
    if (!id) return;
    if (!window.confirm('确定删除该节点？与其相连的边也会一并删除。')) return;
    const nodes = base.nodes.filter((n) => n.id !== id);
    const edges = base.edges.filter((e) => e.source !== id && e.target !== id);
    const nodePositions = { ...(base.nodePositions || {}) };
    delete nodePositions[id];
    clearInspectorSelection();
    emit('graph-update', { ...base, nodes, edges, nodePositions });
  } else {
    const idx = inspectorEdgeIndex.value;
    if (idx < 0 || idx >= base.edges.length) return;
    if (!window.confirm('确定删除该边？')) return;
    const edges = base.edges.filter((_, i) => i !== idx);
    clearInspectorSelection();
    emit('graph-update', { ...base, edges });
  }
}

watch(
  () => props.graph?.nodes?.length ?? 0,
  (len) => {
    if (len > 0) void loadFragments();
  },
  { immediate: true }
);

watch(
  () => props.graphLoadKey ?? '',
  () => {
    pendingPostLayoutAction = null;
    toolbarMode.value = 'pan';
    keyNHeld.value = false;
    keyBHeld.value = false;
    edgeDraftSourceId.value = null;
    inspectorKind.value = 'none';
    inspectorNodeId.value = '';
    clearFragmentPreviewState();
    hidePopover();
  }
);

watch(
  () =>
    [
      inspectorKind.value,
      inspectorNodeFragmentId.value,
      fragments.value.map((f) => f.id).join(',')
    ] as const,
  () => {
    void refreshInspectorFragmentPreview();
  }
);

watch(
  () => graphStructureKey(props.graph),
  () => {
    if (inspectorKind.value === 'node' && inspectorNodeId.value) {
      const n = props.graph?.nodes?.find((x) => x.id === inspectorNodeId.value);
      if (n) loadInspectorForNode(n.id);
    } else if (inspectorKind.value === 'edge' && inspectorEdgeIndex.value >= 0) {
      const g = props.graph;
      if (g?.edges?.[inspectorEdgeIndex.value]) loadInspectorForEdge(inspectorEdgeIndex.value);
    }
  }
);

function showNodePopoverAtEvent(evt: cytoscape.EventObject, kgNode: ExtendedKgNode) {
  const pos = (evt as any).renderedPosition || (evt as any).position || { x: 0, y: 0 };
  const container = containerRef.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const x = rect.left + pos.x + 20;
  const y = rect.top + pos.y + 10;
  nodePopover.value = {
    show: true,
    x: Math.min(x, window.innerWidth - 280),
    y: Math.min(y, window.innerHeight - 240),
    label: kgNode.label,
    meta: buildNodeMeta(kgNode),
    fragmentLine: `${buildFragmentLine(kgNode)} · ${getNodeEvidenceSummary(kgNode)}`,
    occurrences: getNodeOccurrences(kgNode)
  };
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
    .map((n) => `${n.id}:${n.label ?? ''}:${n.fragmentId ?? ''}`)
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

function collectViewState(): KgViewport | undefined {
  if (!cy) return undefined;
  try {
    const destroyed = (cy as { destroyed?: () => boolean }).destroyed?.();
    if (destroyed) return undefined;
    const zoom = cy.zoom();
    const pan = cy.pan();
    if (!Number.isFinite(zoom) || zoom <= 0) return undefined;
    if (!Number.isFinite(pan.x) || !Number.isFinite(pan.y)) return undefined;
    return { zoom, pan: { x: pan.x, y: pan.y } };
  } catch {
    return undefined;
  }
}

function viewportEqual(a: KgViewport | undefined, b: KgViewport | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (Math.abs(a.zoom - b.zoom) > 1e-4) return false;
  if (Math.abs(a.pan.x - b.pan.x) > 0.5 || Math.abs(a.pan.y - b.pan.y) > 0.5) return false;
  return true;
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

function graphPayloadFromCy(next: KgNodePositions): KnowledgeGraph {
  const base = toRaw(props.graph) as KnowledgeGraph;
  const merged: KnowledgeGraph = { ...base, nodePositions: next };
  const vs = collectViewState();
  if (vs) merged.viewState = vs;
  return merged;
}

/** 节点坐标或画布视角（缩放/平移）变化时同步父组件 */
function emitGraphUpdateIfCyStateChanged(expectedSession?: number) {
  if (expectedSession != null && expectedSession !== kgViewLayoutSession) return;
  if (!props.graph || !cy) return;
  const next = collectPositions();
  if (Object.keys(next).length === 0) return;
  const vs = collectViewState();
  const posEq = positionsEqual(props.graph.nodePositions, next);
  const vsEq = viewportEqual(props.graph.viewState, vs);
  if (posEq && vsEq) return;
  emit('graph-update', graphPayloadFromCy(next));
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
  const vs = collectViewState();
  const posEq = positionsEqual(props.graph.nodePositions, next);
  const vsEq = viewportEqual(props.graph.viewState, vs);
  if (posEq && vsEq) return;
  emit('graph-update', graphPayloadFromCy(next));
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
  persistSyntheticFill: boolean,
  viewportSource: KnowledgeGraph
): void {
  const run = () => {
    if (layoutSession !== kgViewLayoutSession) return;
    if ((cyInstance as { destroyed?: () => boolean }).destroyed?.()) return;
    cyInstance.resize();
    ensureInteractive(cyInstance);
    applyNodePositionsToCy(cyInstance, posPlain);
    ensureInteractive(cyInstance);
    resizeAndFitOrViewport(cyInstance, viewportSource);
  };
  cyInstance.ready(run);
  run();
  requestAnimationFrame(run);
  setTimeout(() => {
    run();
    if (persistSyntheticFill) {
      schedulePushCyPositionsToParent(layoutSession);
    }
    runPostLayoutHookIfAny(layoutSession);
  }, 48);
}

const KG_FIT_PADDING = 40;

function applySavedViewport(cyInstance: cytoscape.Core, vs: KgViewport): boolean {
  if (!vs || !Number.isFinite(vs.zoom) || vs.zoom <= 0) return false;
  const x = vs.pan?.x;
  const y = vs.pan?.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  try {
    cyInstance.zoom(vs.zoom);
    cyInstance.pan({ x, y });
    return true;
  } catch {
    return false;
  }
}

/**
 * 有已存 viewState 时恢复缩放/平移，否则 fit 全图。
 * 侧栏 flex 首帧容器宽高常为 0，先 resize 再操作，并在下一帧再跑一次。
 */
function resizeAndFitOrViewport(cyInstance: cytoscape.Core, graph: KnowledgeGraph, padding = KG_FIT_PADDING): void {
  cyInstance.resize();
  const vs = graph.viewState;
  if (vs && applySavedViewport(cyInstance, vs)) {
    requestAnimationFrame(() => {
      if ((cyInstance as { destroyed?: () => boolean }).destroyed?.()) return;
      cyInstance.resize();
      applySavedViewport(cyInstance, vs);
    });
    return;
  }
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
    applyFixedLayoutWithRetries(cyInstance, posPlain, layoutSession, persistSyntheticFill, graph);
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
    resizeAndFitOrViewport(cyInstance, graph);
    if (persistAfterLayout || persistSyntheticFill) {
      emitGraphUpdateIfCyStateChanged(layoutSession);
    }
    runPostLayoutHookIfAny(layoutSession);
  });
  layout.run();
}

function bindGraphEvents(cyInstance: cytoscape.Core, layoutSession: number) {
  cyInstance.on('mouseover', 'node', (evt) => {
    const node = evt.target;
    const id = node.id();
    const kgNode = props.graph!.nodes!.find((n) => n.id === id) as ExtendedKgNode | undefined;
    if (!kgNode) return;
    cancelHidePopover();
    showNodePopoverAtEvent(evt, kgNode);
  });

  cyInstance.on('mouseout', 'node', () => {
    scheduleHidePopover();
  });

  cyInstance.on('tap', 'node', (evt) => {
    cancelHidePopover();
    hidePopover();
    const mode = effectiveMode.value;
    const nid = evt.target.id();

    if (mode === 'add-node') {
      return;
    }

    if (mode === 'add-edge') {
      const src = edgeDraftSourceId.value;
      if (!src) {
        edgeDraftSourceId.value = nid;
        nextTick(() => syncEdgeDraftVisual());
        return;
      }
      if (src === nid) {
        return;
      }
      createEdgeFromTo(src, nid);
      return;
    }

    cyInstance.batch(() => {
      cyInstance.edges().unselect();
      cyInstance.nodes().unselect();
      evt.target.select();
    });
    loadInspectorForNode(nid);
  });

  cyInstance.on('tap', 'edge', (evt) => {
    if (effectiveMode.value !== 'pan') return;
    cancelHidePopover();
    hidePopover();
    const rawIdx = evt.target.data('kgEdgeIndex');
    const idx = typeof rawIdx === 'number' ? rawIdx : parseInt(String(rawIdx), 10);
    if (!Number.isFinite(idx) || idx < 0) return;
    cyInstance.batch(() => {
      cyInstance.edges().unselect();
      cyInstance.nodes().unselect();
      evt.target.select();
    });
    loadInspectorForEdge(idx);
  });

  cyInstance.on('tap', (evt) => {
    if (evt.target !== cyInstance) return;
    cancelHidePopover();
    hidePopover();
    const mode = effectiveMode.value;
    if (mode === 'add-node') {
      const pos = modelPosFromCoreTap(evt);
      if (pos) createManualNodeAt(pos.x, pos.y);
      return;
    }
    if (mode === 'add-edge') {
      edgeDraftSourceId.value = null;
      nextTick(() => syncEdgeDraftVisual());
      clearInspectorSelection();
      return;
    }
    clearInspectorSelection();
  });

  cyInstance.on('dbltap', 'node', (evt) => {
    if (effectiveMode.value !== 'pan') return;
    const id = evt.target.id();
    const kgNode = props.graph!.nodes!.find((n) => n.id === id);
    if (!kgNode?.fragmentId) return;
    emit('jump-to-fragment', { fragmentId: kgNode.fragmentId });
  });

  cyInstance.on('dragfree', 'node', () => {
    emitGraphUpdateIfCyStateChanged(layoutSession);
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
        relation: e.relation || '',
        kgEdgeIndex: i
      }
    });
  });

  return elements;
}

defineExpose({
  getNodeOccurrences
});

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
        selector: 'node:selected',
        style: {
          'border-width': 3,
          'border-color': '#1d4ed8',
          'background-color': '#bfdbfe'
        }
      },
      {
        selector: 'node.kg-edge-draft-source',
        style: {
          'border-width': 4,
          'border-color': '#ea580c',
          'background-color': '#ffedd5'
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
      },
      {
        selector: 'edge:selected',
        style: {
          width: 3,
          'line-color': '#1d4ed8',
          'target-arrow-color': '#1d4ed8'
        }
      }
    ]
  });

  ensureInteractive(cy);
  bindGraphEvents(cy, layoutSession);
  cy.on('viewport', () => scheduleEmitViewport());
  nextTick(() => syncEdgeDraftVisual());
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
  resizeAndFitOrViewport(cy, props.graph!);
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
  window.addEventListener('keydown', onWindowKeyDown, true);
  window.addEventListener('keyup', onWindowKeyUp, true);
  // 图谱在首帧之后才出现（v-if）时，immediate 可能拿不到 containerRef，再补一次
  nextTick(() => {
    if (props.graph?.nodes?.length && containerRef.value && !cy) {
      initGraph();
    }
  });
});

onUnmounted(() => {
  clearViewportEmitTimer();
  window.removeEventListener('keydown', onWindowKeyDown, true);
  window.removeEventListener('keyup', onWindowKeyUp, true);
  cancelHidePopover();
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

.kg-view-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 12px;
  overflow: hidden;
}

.kg-canvas-col {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.kg-toolbar {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.kg-toolbar-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.kg-tool-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
}

.kg-tool-icon-btn:hover:not(:disabled) {
  background: var(--bg-hover);
}

.kg-tool-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.kg-tool-icon-btn-active {
  border-color: var(--accent-primary, #4c6fff);
  background: var(--bg-active, #eff6ff);
  color: var(--accent-primary, #4c6fff);
}

.kg-tool-icon-btn-danger {
  color: var(--error-color, #b91c1c);
}

.kg-tool-icon-btn-danger:hover:not(:disabled) {
  background: rgba(185, 28, 28, 0.08);
}

.kg-tool-svg {
  width: 20px;
  height: 20px;
  display: block;
}

.kg-toolbar-mode-hint {
  margin: 0;
  flex: 1 1 160px;
  min-width: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

.kg-toolbar-key-hint {
  margin: 0;
  width: 100%;
  flex-basis: 100%;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.kg-toolbar-key-hint kbd {
  display: inline-block;
  padding: 1px 5px;
  font-size: 0.7rem;
  font-family: inherit;
  border-radius: 4px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.kg-cy-cursor-crosshair :deep(canvas) {
  cursor: crosshair !important;
}

.kg-cy-cursor-edge :deep(canvas) {
  cursor: cell !important;
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
  min-height: 200px;
  height: 100%;
  background: var(--bg-secondary, #f1f5f9);
  border-radius: 6px;
  box-shadow: var(--shadow-md);
}

.kg-inspector {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  overflow: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.kg-inspector-head {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.kg-inspector-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.kg-inspector-warn {
  margin-top: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
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
  margin-bottom: 4px;
  color: var(--text-primary);
}

.kg-node-popover-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.kg-node-popover-fragment {
  font-size: 0.8rem;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.kg-node-popover-hint {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border-primary);
  font-size: 0.75rem;
  color: var(--text-secondary);
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

.kg-edit-label {
  display: block;
  margin-top: 10px;
  margin-bottom: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.kg-edit-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  font-size: 0.9rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-secondary, #fff);
  color: var(--text-primary);
}

.kg-edit-edge-endpoints {
  margin: 0 0 8px;
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.kg-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.kg-edit-btn {
  padding: 8px 16px;
  font-size: 0.9rem;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--border-primary);
}

.kg-edit-btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.kg-edit-btn-primary {
  background: var(--accent-primary, #4c6fff);
  border-color: transparent;
  color: #fff;
}

.kg-edit-btn-primary:hover {
  filter: brightness(1.05);
}

/* 知识片段预览（与片段库列表类似的缩略区域） */
.kg-fragment-preview-box {
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--bg-secondary, #f8fafc);
  padding: 8px;
  min-height: 72px;
  max-height: 200px;
  overflow: hidden;
  position: relative;
}

.kg-fragment-preview-clickable {
  cursor: pointer;
}

.kg-fragment-preview-clickable:hover {
  border-color: var(--accent-primary, #4c6fff);
  box-shadow: var(--shadow-sm);
}

.kg-fragment-preview-clickable:focus {
  outline: 2px solid var(--accent-primary, #4c6fff);
  outline-offset: 2px;
}

.kg-fragment-preview-loading,
.kg-fragment-preview-placeholder {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 8px 4px;
}

.kg-fragment-preview-image-wrap {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-hover);
  border-radius: 6px;
  overflow: hidden;
}

.kg-fragment-preview-img {
  max-width: 100%;
  max-height: 140px;
  object-fit: contain;
  display: block;
}

.kg-fragment-mermaid-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  max-height: 150px;
  overflow: hidden;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-primary);
}

.kg-fragment-mermaid-inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kg-mermaid-svg-host :deep(svg) {
  max-width: 100% !important;
  max-height: 130px !important;
  height: auto !important;
  width: auto !important;
  display: block;
}

.kg-fragment-preview-md {
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--text-primary);
  max-height: 140px;
  overflow: hidden;
  word-break: break-word;
}

.kg-fragment-preview-md :deep(p) {
  margin: 0 0 0.35em;
}

.kg-fragment-preview-md :deep(pre) {
  font-size: 0.72rem;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}

.kg-fragment-plain {
  margin: 0;
  font-size: 0.78rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.kg-fragment-preview-hint {
  margin-top: 6px;
  font-size: 0.72rem;
  color: var(--text-secondary);
  text-align: center;
}

.kg-fragment-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  padding: 24px;
}

.kg-fragment-detail-modal {
  width: min(720px, 100%);
  max-height: min(85vh, 900px);
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.kg-fragment-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.kg-fragment-detail-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.kg-fragment-detail-close {
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 0.875rem;
  border-radius: 6px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  cursor: pointer;
  color: var(--text-primary);
}

.kg-fragment-detail-body {
  padding: 16px;
  overflow: auto;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--text-primary);
}

.kg-fragment-detail-loading {
  margin: 0;
  color: var(--text-secondary);
}
</style>
