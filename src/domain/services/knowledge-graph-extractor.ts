/**
 * 从 Markdown 文本中提取知识图谱的节点与边
 * 基于文档结构（标题、双链、标签）与共现关系
 */

/** 节点在文档中的出现位置（用于点击跳转） */
export interface KgNodeOccurrence {
  documentId?: string;
  documentTitle?: string;
  start: number;
  end: number;
}

export interface KgNode {
  id: string;
  label: string;
  type: 'section' | 'link' | 'tag';
  level?: number; // 仅 section：标题级别 1-6
  /** 在文档中的出现位置，保存时传入 documentId/documentTitle 后会有值 */
  occurrences?: KgNodeOccurrence[];
}

export interface KgEdge {
  source: string;
  target: string;
  relation?: string;
}

/** 画布上的节点坐标（Cytoscape），用于固定布局、避免每次打开随机变化 */
export type KgNodePositions = Record<string, { x: number; y: number }>;

export interface KnowledgeGraph {
  nodes: KgNode[];
  edges: KgEdge[];
  /** 存在且覆盖当前全部节点 id 时，按固定坐标展示，不再自动跑随机力导向 */
  nodePositions?: KgNodePositions;
}

/** 样例用假文档 id，仅用于演示跳转列表（实际跳转时不会加载） */
const SAMPLE_DOC_ID = 'sample-doc';
const SAMPLE_DOC_TITLE = '数据结构笔记（样例）';

/**
 * 知识图谱样例数据（用于演示最终展示效果，后续将用 RAG 等方式提取）
 * 部分节点带假 occurrence，便于演示“点击节点 → 跳转位置列表”
 */
export const sampleKnowledgeGraph: KnowledgeGraph = {
  nodes: [
    {
      id: 's_0',
      label: '数据结构概述',
      type: 'section',
      level: 1,
      occurrences: [{ documentId: SAMPLE_DOC_ID, documentTitle: SAMPLE_DOC_TITLE, start: 0, end: 18 }]
    },
    {
      id: 's_1',
      label: '线性结构',
      type: 'section',
      level: 2,
      occurrences: [{ documentId: SAMPLE_DOC_ID, documentTitle: SAMPLE_DOC_TITLE, start: 22, end: 35 }]
    },
    { id: 's_2', label: '树形结构', type: 'section', level: 2 },
    {
      id: 's_3',
      label: '查找结构',
      type: 'section',
      level: 2,
      occurrences: [{ documentId: SAMPLE_DOC_ID, documentTitle: SAMPLE_DOC_TITLE, start: 80, end: 95 }]
    },
    { id: 's_4', label: '排序算法', type: 'section', level: 2 },
    {
      id: 'l_0',
      label: '链表',
      type: 'link',
      occurrences: [
        { documentId: SAMPLE_DOC_ID, documentTitle: SAMPLE_DOC_TITLE, start: 45, end: 52 },
        { documentId: SAMPLE_DOC_ID, documentTitle: SAMPLE_DOC_TITLE, start: 120, end: 127 }
      ]
    },
    { id: 'l_1', label: '栈', type: 'link' },
    { id: 'l_2', label: '队列', type: 'link' },
    {
      id: 'l_3',
      label: '二叉树',
      type: 'link',
      occurrences: [{ documentId: SAMPLE_DOC_ID, documentTitle: SAMPLE_DOC_TITLE, start: 60, end: 68 }]
    },
    { id: 'l_4', label: '哈希表', type: 'link' },
    { id: 'l_5', label: '平衡二叉树', type: 'link' },
    { id: 'l_6', label: '红黑树', type: 'link' },
    { id: 'l_7', label: '快速排序', type: 'link' },
    { id: 'l_8', label: '归并排序', type: 'link' },
    { id: 'l_9', label: '堆排序', type: 'link' },
    {
      id: 't_0',
      label: '算法',
      type: 'tag',
      occurrences: [{ documentId: SAMPLE_DOC_ID, documentTitle: SAMPLE_DOC_TITLE, start: 200, end: 206 }]
    },
    { id: 't_1', label: '面试', type: 'tag' },
    { id: 't_2', label: '基础', type: 'tag' },
    { id: 't_3', label: '性能优化', type: 'tag' }
  ],
  edges: [
    { source: 's_0', target: 's_1', relation: '包含' },
    { source: 's_0', target: 's_2', relation: '包含' },
    { source: 's_0', target: 's_3', relation: '包含' },
    { source: 's_0', target: 's_4', relation: '包含' },
    { source: 's_1', target: 'l_0', relation: '引用' },
    { source: 's_1', target: 'l_1', relation: '引用' },
    { source: 's_1', target: 'l_2', relation: '引用' },
    { source: 's_2', target: 'l_3', relation: '引用' },
    { source: 's_3', target: 'l_4', relation: '引用' },
    { source: 's_2', target: 'l_5', relation: '扩展' },
    { source: 'l_5', target: 'l_6', relation: '实现' },
    { source: 's_4', target: 'l_7', relation: '引用' },
    { source: 's_4', target: 'l_8', relation: '引用' },
    { source: 's_4', target: 'l_9', relation: '引用' },
    { source: 'l_0', target: 'l_1', relation: '可实现' },
    { source: 'l_0', target: 'l_2', relation: '可实现' },
    { source: 's_0', target: 't_0', relation: '标签' },
    { source: 's_0', target: 't_1', relation: '标签' },
    { source: 's_0', target: 't_2', relation: '标签' },
    { source: 's_4', target: 't_3', relation: '标签' },
    { source: 'l_3', target: 'l_5', relation: '相关' },
    { source: 'l_7', target: 'l_9', relation: '对比' },
    { source: 'l_8', target: 'l_9', relation: '对比' }
  ],
  /**
   * 样例默认画布：刻意不对称、非网格（区别于 fillMissingNodePositions 的矩阵补位）。
   * 用于在编辑器/侧栏中一眼区分「走 JSON 或内置 preset」与「缺坐标后的自动补格」。
   */
  nodePositions: {
    s_0: { x: 400, y: 88 },
    s_1: { x: 208, y: 212 },
    s_2: { x: 352, y: 228 },
    s_3: { x: 508, y: 204 },
    s_4: { x: 264, y: 348 },
    l_0: { x: 628, y: 292 },
    l_1: { x: 568, y: 392 },
    l_2: { x: 692, y: 368 },
    l_3: { x: 432, y: 124 },
    l_4: { x: 118, y: 296 },
    l_5: { x: 488, y: 36 },
    l_6: { x: 596, y: 28 },
    l_7: { x: 72, y: 432 },
    l_8: { x: 196, y: 536 },
    l_9: { x: 132, y: 388 },
    t_0: { x: 316, y: 432 },
    t_1: { x: 528, y: 492 },
    t_2: { x: 236, y: 464 },
    t_3: { x: 384, y: 572 }
  }
};

/** 生成 Mermaid 安全的节点 id（字母数字与下划线） */
function toSafeId(prefix: string, index: number): string {
  return `${prefix}_${index}`;
}

/** 转义 Mermaid 节点标签中的引号与方括号 */
function escapeMermaidLabel(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ');
}

export interface ExtractKnowledgeGraphOptions {
  documentId?: string;
  documentTitle?: string;
}

/**
 * 从纯 Markdown 字符串提取知识图谱
 * - 节点：标题(section)、双链 [[...]](link)、标签 #tag
 * - 边：标题层级包含、章节→链接/标签、同段内共现(可选)
 * - 若传入 options.documentId/documentTitle，会在节点上填充 occurrences 供跳转
 */
export function extractKnowledgeGraph(
  markdown: string,
  options?: ExtractKnowledgeGraphOptions
): KnowledgeGraph {
  const nodes: KgNode[] = [];
  const edges: KgEdge[] = [];
  const nodeIdByKey = new Map<string, string>();
  const nodeMap = new Map<string, KgNode>(); // id -> node，用于给 link/tag 追加 occurrence

  const body = markdown.replace(/^\s*---[\s\S]*?---\s*\n?/, '').trim();
  const lines = body.split('\n');

  interface SectionInfo {
    id: string;
    label: string;
    level: number;
    lineStart: number;
    charStart: number;
  }
  const sections: SectionInfo[] = [];
  let charOffset = 0;
  const headingRe = /^(#{1,6})\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLen = line.length + 1;
    const match = line.match(headingRe);
    if (match) {
      const level = match[1].length;
      const label = match[2].trim();
      const id = toSafeId('s', sections.length);
      const sectionNode: KgNode = {
        id,
        label,
        type: 'section',
        level,
        occurrences:
          options && options.documentId
            ? [{ documentId: options.documentId, documentTitle: options.documentTitle, start: charOffset, end: charOffset + line.length }]
            : undefined
      };
      nodes.push(sectionNode);
      sections.push({
        id,
        label,
        level,
        lineStart: i,
        charStart: charOffset
      });
    }
    charOffset += lineLen;
  }

  // 标题层级边：按层级连到上一级
  for (let i = 0; i < sections.length; i++) {
    const curr = sections[i];
    for (let j = i - 1; j >= 0; j--) {
      if (sections[j].level < curr.level) {
        edges.push({ source: sections[j].id, target: curr.id, relation: '包含' });
        break;
      }
    }
  }

  // 2. 双链 [[...]] 或 [[...|显示]]
  const wikilinkRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  // 3. 标签 #xxx（避免匹配到 # 标题）
  const tagRe = /(?:^|[^\w\u4e00-\u9fa5])#([\w\u4e00-\u9fa5]+)/g;

  const getSectionAtChar = (pos: number): SectionInfo | null => {
    for (let k = sections.length - 1; k >= 0; k--) {
      if (sections[k].charStart <= pos) return sections[k];
    }
    return null;
  };

  charOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = charOffset;
    charOffset += line.length + 1;

    // 跳过代码块、表格等（简单按行判断）
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('|') || trimmed.startsWith('>')) continue;

    let m: RegExpExecArray | null;
    wikilinkRe.lastIndex = 0;
    while ((m = wikilinkRe.exec(line)) !== null) {
      const label = m[1].trim();
      const key = `link:${label}`;
      const start = lineStart + m.index;
      const end = start + m[0].length;
      const occ = options?.documentId ? { documentId: options.documentId, documentTitle: options.documentTitle, start, end } : undefined;
      let id = nodeIdByKey.get(key);
      if (!id) {
        id = toSafeId('l', nodes.length);
        nodeIdByKey.set(key, id);
        const linkNode: KgNode = { id, label, type: 'link', occurrences: occ ? [occ] : undefined };
        nodes.push(linkNode);
        nodeMap.set(id, linkNode);
      } else {
        const existing = nodeMap.get(id);
        if (existing && occ) {
          if (!existing.occurrences) existing.occurrences = [];
          existing.occurrences.push(occ);
        }
      }
      const section = getSectionAtChar(lineStart + m.index);
      if (section) {
        if (!edges.some(e => e.source === section.id && e.target === id)) {
          edges.push({ source: section.id, target: id, relation: '引用' });
        }
      }
    }

    tagRe.lastIndex = 0;
    while ((m = tagRe.exec(line)) !== null) {
      const label = m[1].trim();
      const key = `tag:${label}`;
      const start = lineStart + m.index;
      const end = start + m[0].length;
      const occ = options?.documentId ? { documentId: options.documentId, documentTitle: options.documentTitle, start, end } : undefined;
      let id = nodeIdByKey.get(key);
      if (!id) {
        id = toSafeId('t', nodes.length);
        nodeIdByKey.set(key, id);
        const tagNode: KgNode = { id, label, type: 'tag', occurrences: occ ? [occ] : undefined };
        nodes.push(tagNode);
        nodeMap.set(id, tagNode);
      } else {
        const existing = nodeMap.get(id);
        if (existing && occ) {
          if (!existing.occurrences) existing.occurrences = [];
          existing.occurrences.push(occ);
        }
      }
      const section = getSectionAtChar(lineStart + m.index);
      if (section) {
        if (!edges.some(e => e.source === section.id && e.target === id)) {
          edges.push({ source: section.id, target: id, relation: '标签' });
        }
      }
    }
  }

  // 4. 若没有任何节点，可加一个“文档”虚拟节点，避免空图
  if (nodes.length === 0) {
    const docId = toSafeId('doc', 0);
    nodes.push({ id: docId, label: '（无结构）', type: 'section' });
  }

  return { nodes, edges };
}

/**
 * 将知识图谱转为 Mermaid flowchart 代码（便于用现有 Mermaid 渲染）
 */
export function knowledgeGraphToMermaid(graph: KnowledgeGraph): string {
  const { nodes, edges } = graph;
  if (nodes.length === 0) return 'flowchart TD\n  empty["（无内容）"]';

  const lines: string[] = ['flowchart TB'];
  for (const n of nodes) {
    const label = escapeMermaidLabel(n.label);
    const safe = n.id.replace(/-/g, '_');
    lines.push(`  ${safe}["${label}"]`);
  }
  for (const e of edges) {
    const src = e.source.replace(/-/g, '_');
    const tgt = e.target.replace(/-/g, '_');
    if (e.relation) {
      const rel = escapeMermaidLabel(e.relation);
      lines.push(`  ${src} -->|${rel}| ${tgt}`);
    } else {
      lines.push(`  ${src} --> ${tgt}`);
    }
  }
  return lines.join('\n');
}
