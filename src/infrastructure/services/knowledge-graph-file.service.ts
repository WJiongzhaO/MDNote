import type { KnowledgeGraph } from '../../domain/services/knowledge-graph-extractor';

export interface KnowledgeGraphInfo {
  id: string;
  title: string;
  fileName: string;
  fullPath: string;
  createdAt: string;
  updatedAt?: string;
  documentId?: string | null;
  documentTitle?: string | null;
}

export interface KnowledgeGraphFile {
  id: string;
  title: string;
  documentId?: string | null;
  documentTitle?: string | null;
  createdAt: string;
  updatedAt?: string;
  graph: KnowledgeGraph;
}

/**
 * 知识图谱文件服务
 * 存储位置：全局“知识片段库”路径下的 knowledge-graphs 目录
 */
export class FileSystemKnowledgeGraphService {
  /**
   * 获取知识图谱根目录（绝对路径）
   */
  private async getGraphsRoot(): Promise<string> {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.fragment || !electronAPI.fragment.getGlobalPath) {
      throw new Error('知识图谱需要全局路径支持（fragment API 不可用）');
    }

    const globalPath: string = await electronAPI.fragment.getGlobalPath();
    const normalized = globalPath.replace(/[\\/]+$/, '');
    return `${normalized}/knowledge-graphs`;
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
    const fullPath = `${root}/${fileName}`;

    const fileContent: KnowledgeGraphFile = {
      id,
      title: safeTitle,
      documentId: payload.documentId ?? null,
      documentTitle: payload.documentTitle ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
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
      documentTitle: fileContent.documentTitle
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
        const content = await electronAPI.file.readFileContent(item.path);
        const parsed = JSON.parse(content) as KnowledgeGraphFile;
        results.push({
          id: parsed.id,
          title: parsed.title,
          fileName: item.name,
          fullPath: item.path,
          createdAt: parsed.createdAt,
          updatedAt: parsed.updatedAt,
          documentId: parsed.documentId ?? null,
          documentTitle: parsed.documentTitle ?? null
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

    const content = await electronAPI.file.readFileContent(fullPath);
    return JSON.parse(content) as KnowledgeGraphFile;
  }

  /**
   * 更新知识图谱元信息（如标题）
   */
  async updateGraph(fullPath: string, updates: { title?: string }): Promise<KnowledgeGraphInfo> {
    const file = await this.readGraph(fullPath);
    const now = new Date();
    if (updates.title !== undefined) {
      file.title = updates.title.trim() || file.title;
    }
    file.updatedAt = now.toISOString();

    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || !electronAPI.file || !electronAPI.file.writeFileContent) {
      throw new Error('文件系统 API 不可用，无法写入知识图谱文件');
    }
    await electronAPI.file.writeFileContent(fullPath, JSON.stringify(file, null, 2));

    return {
      id: file.id,
      title: file.title,
      fileName: fullPath.split(/[/\\]/).pop() || '',
      fullPath,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      documentId: file.documentId ?? null,
      documentTitle: file.documentTitle ?? null
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
    await electronAPI.file.deleteNode(fullPath);
  }
}

