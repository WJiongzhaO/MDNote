import type { KnowledgeGraph, KgNodePositions } from './knowledge-graph-extractor';

export function hasCompleteNodeLayout(graph: KnowledgeGraph): boolean {
  const pos = graph.nodePositions;
  if (!pos || graph.nodes.length === 0) return false;
  return graph.nodes.every((n) => {
    const p = pos[n.id];
    return p != null && Number.isFinite(p.x) && Number.isFinite(p.y);
  });
}

const KG_FILL_GAP = 72;

/**
 * 保留已有合法坐标，仅对缺失坐标的节点在「已有包围盒右侧」用网格补位，
 * 使全图具备合法坐标后走固定布局而非整图 cose，避免打乱已保存位置。
 * 若没有任何节点带坐标，返回原 graph（由调用方整图 cose）。
 */
export function fillMissingNodePositions(graph: KnowledgeGraph): KnowledgeGraph {
  const nodes = graph.nodes;
  if (!nodes.length) return graph;

  const existing = graph.nodePositions || {};
  const next: KgNodePositions = {};
  for (const n of nodes) {
    const p = existing[n.id];
    if (p != null && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      next[n.id] = { x: p.x, y: p.y };
    }
  }

  const missing = nodes.filter((n) => next[n.id] == null);
  if (missing.length === 0) {
    return { ...graph, nodePositions: next };
  }

  if (Object.keys(next).length === 0) {
    return graph;
  }

  let maxX = -Infinity;
  let minY = Infinity;
  for (const p of Object.values(next)) {
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
  }

  const anchorX = maxX + KG_FILL_GAP * 2;
  const anchorY = minY;
  const cols = Math.max(1, Math.ceil(Math.sqrt(missing.length)));

  missing
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      next[n.id] = {
        x: anchorX + col * KG_FILL_GAP,
        y: anchorY + row * KG_FILL_GAP
      };
    });

  return { ...graph, nodePositions: next };
}

/** 将内存中的坐标与 localStorage 合并（内存优先），再按当前节点列表过滤 */
export function mergeKgPositionSources(
  graph: KnowledgeGraph,
  mem: KgNodePositions | undefined | null,
  storage: KgNodePositions | null
): KnowledgeGraph {
  const combined: KgNodePositions = { ...(storage || {}), ...(mem || {}) };
  return mergeNodePositionsIntoGraph(graph, combined);
}

/**
 * 将 stored（如 localStorage）叠在 graph.nodePositions 之上：同 id 以 stored 为准。
 * 仅 stored 时曾只保留 stored 里有的 id，缺省节点会走 fillMissing 的矩阵补位；现对缺 id 回退到 graph 自带坐标（如样例内置布局）。
 */
export function mergeNodePositionsIntoGraph(graph: KnowledgeGraph, stored: KgNodePositions | undefined | null): KnowledgeGraph {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const base = graph.nodePositions || {};
  const overlay = stored || {};
  const hasOverlay = Object.keys(overlay).length > 0;
  if (!hasOverlay && Object.keys(base).length === 0) return graph;

  const next: KgNodePositions = {};
  for (const id of ids) {
    const p = overlay[id] ?? base[id];
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      next[id] = { x: p.x, y: p.y };
    }
  }
  if (Object.keys(next).length === 0) return graph;
  return { ...graph, nodePositions: next };
}

const KG_LAYOUT_STORAGE_PREFIX = 'mdnote-kg-layout:';

export function loadKgLayoutFromLocalStorage(docKey: string): KgNodePositions | null {
  if (typeof localStorage === 'undefined' || !docKey) return null;
  try {
    const raw = localStorage.getItem(KG_LAYOUT_STORAGE_PREFIX + docKey);
    if (!raw) return null;
    const o = JSON.parse(raw) as { nodePositions?: KgNodePositions };
    return o.nodePositions && typeof o.nodePositions === 'object' ? o.nodePositions : null;
  } catch {
    return null;
  }
}

export function saveKgLayoutToLocalStorage(docKey: string, positions: KgNodePositions): void {
  if (typeof localStorage === 'undefined' || !docKey) return;
  try {
    localStorage.setItem(KG_LAYOUT_STORAGE_PREFIX + docKey, JSON.stringify({ nodePositions: positions }));
  } catch {
    // 配额等错误忽略
  }
}

export function clearKgLayoutLocalStorage(docKey: string): void {
  if (typeof localStorage === 'undefined' || !docKey) return;
  try {
    localStorage.removeItem(KG_LAYOUT_STORAGE_PREFIX + docKey);
  } catch {
    // ignore
  }
}
