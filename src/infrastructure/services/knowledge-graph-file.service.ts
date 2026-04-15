import type { KnowledgeGraph, KgNodePositions, KgViewport } from '../../domain/services/knowledge-graph-extractor';

export interface KnowledgeGraphInfo {
  id: string;
  title: string;
  fileName: string;
  fullPath: string;
  createdAt: string;
  updatedAt?: string;
  documentId?: string | null;
  documentTitle?: string | null;
  graphType?: 'heading' | 'ai';
}

export interface KnowledgeGraphFile {
  id: string;
  title: string;
  documentId?: string | null;
  documentTitle?: string | null;
  createdAt: string;
  updatedAt?: string;
  graphType?: 'heading' | 'ai';
  graph: KnowledgeGraph;
}

/**
 * 从 JSON 反序列化后的原始 graph 做一次物化：深拷贝、id/source/target 转字符串、
 * nodePositions 的 x/y 用 Number() 收敛（避免 "12.3" 导致 hasCompleteNodeLayout 为 false 从而整图 cose 像「默认布局」）。
 */
function materializeKnowledgeGraphFromJson(raw: unknown): KnowledgeGraph {
  if (!raw || typeof raw !== 'object') {
    throw new Error('graph 字段无效');
  }
  const g = raw as Record<string, unknown>;
  if (!Array.isArray(g.nodes)) {
    throw new Error('graph.nodes 必须为数组');
  }

  const nodes = g.nodes.map((item: unknown) => {
    if (!item || typeof item !== 'object') {
      return { id: '_invalid', label: '', type: 'link' as const };
    }
    const n = item as Record<string, unknown>;
    return {
      ...n,
      id: String(n.id ?? ''),
      label: n.label != null ? String(n.label) : '',
      type:
        n.type === 'section' || n.type === 'link' || n.type === 'tag'
          ? n.type
          : 'link'
    } as KnowledgeGraph['nodes'][number];
  });

  const edges = Array.isArray(g.edges)
    ? (g.edges as unknown[]).map((item) => {
        if (!item || typeof item !== 'object') {
          return { source: '', target: '' };
        }
        const e = item as Record<string, unknown>;
        return {
          source: String(e.source ?? ''),
          target: String(e.target ?? ''),
          ...(e.relation != null ? { relation: String(e.relation) } : {})
        };
      })
    : [];

  let nodePositions: KgNodePositions | undefined;
  const npRaw = g.nodePositions;
  if (npRaw && typeof npRaw === 'object' && !Array.isArray(npRaw)) {
    const np: KgNodePositions = {};
    for (const [k, v] of Object.entries(npRaw as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const o = v as Record<string, unknown>;
      const x = Number(o.x);
      const y = Number(o.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        np[String(k)] = { x, y };
      }
    }
    if (Object.keys(np).length > 0) {
      nodePositions = np;
    }
  }

  let viewState: KgViewport | undefined;
  const vsRaw = g.viewState;
  if (vsRaw && typeof vsRaw === 'object' && !Array.isArray(vsRaw)) {
    const o = vsRaw as Record<string, unknown>;
    const zoom = Number(o.zoom);
    const panObj = o.pan;
    if (
      Number.isFinite(zoom) &&
      zoom > 0 &&
      panObj &&
      typeof panObj === 'object' &&
      !Array.isArray(panObj)
    ) {
      const p = panObj as Record<string, unknown>;
      const x = Number(p.x);
      const y = Number(p.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        viewState = { zoom, pan: { x, y } };
      }
    }
  }

  return { nodes, edges, nodePositions, ...(viewState ? { viewState } : {}) };
}

/**
 * 知识图谱文件服务
 * 存储位置：当前知识库（项目数据路径）下的 knowledge-graphs 目录
 */
export class FileSystemKnowledgeGraphService {
  /** 与主进程 path.normalize 一致，避免 Windows 下列目录与读文件路径不一致 */
  private async normalizeFsPath(p: string): Promise<string> {
    const api = (window as any).electronAPI;
    if (api?.file?.normalizePath) {
      return api.file.normalizePath(p);
    }
    return p;
  }

  /** 与主进程一致的路径，供列表选中后与落盘路径对齐 */
  async resolveKnowledgeGraphPath(fullPath: string): Promise<string> {
    return this.normalizeFsPath(fullPath);
  }

  /**
   * 获取知识图谱根目录（绝对路径）
   */
  private async getGraphsRoot(): Promise<string> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.file?.getDataPath) {
      throw new Error('知识图谱需要项目数据路径（file.getDataPath 不可用）');
    }

    const dataPath: string = await electronAPI.file.getDataPath();
    const normalized = dataPath.replace(/[\\/]+$/, '');
    const joined = `${normalized}/knowledge-graphs`;
    return this.normalizeFsPath(joined);
  }

  /**
   * 确保知识图谱目录存在
   */
  async ensureGraphsDirExists(): Promise<string> {
    const root = await this.getGraphsRoot();
    const electronAPI = (window as any).electronAPI;

    if (electronAPI && electronAPI.file && electronAPI.file.mkdirIfNotExists) {
      await electronAPI.file.mkdirIfNotExists(root);
    } else if (electronAPI && electronAPI.file && electronAPI.file.mkdir) {
      try {
        await electronAPI.file.mkdir(root);
      } catch {
        // 已存在时可能报错，忽略即可
      }
    }

    return root;
  }

  /**
   * 保存或更新一个知识图谱
   */
  async saveGraph(payload: {
    id?: string;
    title: string;
    documentId?: string | null;
    documentTitle?: string | null;
    graphType?: 'heading' | 'ai';
    graph: KnowledgeGraph;
  }): Promise<KnowledgeGraphInfo> {
    const root = await this.ensureGraphsDirExists();
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.writeFileContent) {
      throw new Error('文件系统 API 不可用，无法写入知识图谱文件');
    }

    const now = new Date();
    const id = payload.id || `kg-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeTitle = payload.title.trim() || '未命名图谱';
    const fileName = `${id}.json`;
    const fullPath = await this.normalizeFsPath(`${root.replace(/[\\/]+$/, '')}/${fileName}`);

    const fileContent: KnowledgeGraphFile = {
      id,
      title: safeTitle,
      documentId: payload.documentId ?? null,
      documentTitle: payload.documentTitle ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      graphType: payload.graphType,
      graph: payload.graph
    };

    await electronAPI.file.writeFileContent(fullPath, JSON.stringify(fileContent, null, 2));

    return {
      id,
      title: safeTitle,
      fileName,
      fullPath,
      createdAt: fileContent.createdAt,
      updatedAt: fileContent.updatedAt,
      documentId: fileContent.documentId,
      documentTitle: fileContent.documentTitle,
      graphType: fileContent.graphType
    };
  }

  /**
   * 列出所有已保存的知识图谱（仅返回元信息，避免一次性加载全部图数据）
   */
  async listGraphs(): Promise<KnowledgeGraphInfo[]> {
    const root = await this.ensureGraphsDirExists();
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.readDirectory) {
      throw new Error('文件系统 API 不可用，无法读取知识图谱目录');
    }

    const items: Array<{ name: string; type: 'file' | 'folder'; path: string }> =
      await electronAPI.file.readDirectory(root);

    const jsonFiles = items.filter(item => item.type === 'file' && /\.json$/i.test(item.name));
    const results: KnowledgeGraphInfo[] = [];

    if (!electronAPI.file.readFileContent) {
      return results;
    }

    for (const item of jsonFiles) {
      try {
        const filePath = await this.normalizeFsPath(item.path);
        const content = await electronAPI.file.readFileContent(filePath);
        if (content == null || typeof content !== 'string' || content.trim() === '') {
          continue;
        }
        const parsed = JSON.parse(content) as KnowledgeGraphFile;
        if (!parsed?.graph?.nodes) {
          continue;
        }
        results.push({
          id: parsed.id,
          title: parsed.title,
          fileName: item.name,
          fullPath: filePath,
          createdAt: parsed.createdAt,
          updatedAt: parsed.updatedAt,
          documentId: parsed.documentId ?? null,
          documentTitle: parsed.documentTitle ?? null,
          graphType: parsed.graphType
        });
      } catch {
        // 单个文件解析失败时忽略，避免影响整体列表
        continue;
      }
    }

    // 按创建时间倒序排列
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return results;
  }

  /**
   * 读取单个知识图谱文件
   */
  async readGraph(fullPath: string): Promise<KnowledgeGraphFile> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.readFileContent) {
      throw new Error('文件系统 API 不可用，无法读取知识图谱文件');
    }

    const p = await this.normalizeFsPath(fullPath);
    const content = await electronAPI.file.readFileContent(p);
    if (content == null || typeof content !== 'string' || content.trim() === '') {
      throw new Error(`知识图谱文件无法读取或不存在: ${p}`);
    }
    const parsed = JSON.parse(content) as KnowledgeGraphFile;
    if (!parsed || typeof parsed !== 'object' || !parsed.graph || !Array.isArray(parsed.graph.nodes)) {
      throw new Error('知识图谱 JSON 格式无效（缺少 graph.nodes）');
    }
    const graph = materializeKnowledgeGraphFromJson(parsed.graph);
    return {
      ...parsed,
      graph
    };
  }

  /**
   * 更新已存在文件中的图谱数据（保留 id、标题等元信息），用于保存节点坐标等
   */
  async writeGraphData(fullPath: string, graph: KnowledgeGraph): Promise<void> {
    const p = await this.normalizeFsPath(fullPath);
    const file = await this.readGraph(p);
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.writeFileContent) {
      throw new Error('文件系统 API 不可用，无法写入知识图谱文件');
    }
    file.graph = graph;
    file.updatedAt = new Date().toISOString();
    await electronAPI.file.writeFileContent(p, JSON.stringify(file, null, 2));
  }

  /**
   * 更新知识图谱元信息（如标题）
   */
  async updateGraph(fullPath: string, updates: { title?: string }): Promise<KnowledgeGraphInfo> {
    const p = await this.normalizeFsPath(fullPath);
    const file = await this.readGraph(p);
    const now = new Date();
    if (updates.title !== undefined) {
      file.title = updates.title.trim() || file.title;
    }
    file.updatedAt = now.toISOString();

    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.writeFileContent) {
      throw new Error('文件系统 API 不可用，无法写入知识图谱文件');
    }
    await electronAPI.file.writeFileContent(p, JSON.stringify(file, null, 2));

    return {
      id: file.id,
      title: file.title,
      fileName: p.split(/[/\\]/).pop() || '',
      fullPath: p,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      documentId: file.documentId ?? null,
      documentTitle: file.documentTitle ?? null,
      graphType: file.graphType
    };
  }

  /**
   * 删除知识图谱文件
   */
  async deleteGraph(fullPath: string): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.deleteNode) {
      throw new Error('文件系统 API 不可用，无法删除知识图谱文件');
    }
    const p = await this.normalizeFsPath(fullPath);
    await electronAPI.file.deleteNode(p);
  }
}

