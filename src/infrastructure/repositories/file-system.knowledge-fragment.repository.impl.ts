import { KnowledgeFragment } from '../../domain/entities/knowledge-fragment.entity';
import type { KnowledgeFragmentId } from '../../domain/types/knowledge-fragment.types';
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface';

/**
 * 知识片段数据格式（用于文件存储）
 */
export interface KnowledgeFragmentData {
  id: string;
  title: string;
  tags: string[];
  nodes: any[];
  assetDependencies: string[];
  sourceDocumentId?: string;
  referencedDocuments?: Array<{
    documentId: string;
    documentTitle: string;
    referencedAt: string;
    isConnected: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 基于文件系统的知识片段仓储实现
 */
export class FileSystemKnowledgeFragmentRepository implements KnowledgeFragmentRepository {
  private readonly FILE_NAME = 'knowledge-fragments.json';

  async save(fragment: KnowledgeFragment): Promise<void> {
    const fragments = await this.getAllFragmentsFromFile();
    const fragmentData: KnowledgeFragmentData = {
      id: fragment.getId().value,
      title: fragment.getTitle().value,
      tags: fragment.getTags().value,
      nodes: fragment.getNodes().map(node => node.toJSON()),
      assetDependencies: fragment.getAssetDependencies().value,
      createdAt: fragment.getCreatedAt().toISOString(),
      updatedAt: fragment.getUpdatedAt().toISOString()
    };

    const existingIndex = fragments.findIndex(f => f.id === fragmentData.id);
    if (existingIndex !== -1) {
      fragments[existingIndex] = fragmentData;
    } else {
      fragments.push(fragmentData);
    }

    await this.saveFragmentsToFile(fragments);
  }

  async findById(id: KnowledgeFragmentId): Promise<KnowledgeFragment | null> {
    const fragments = await this.getAllFragmentsFromFile();
    const fragmentData = fragments.find(f => f.id === id.value);

    if (!fragmentData) {
      return null;
    }

    return this.mapToEntity(fragmentData);
  }

  async findAll(): Promise<KnowledgeFragment[]> {
    const fragmentsData = await this.getAllFragmentsFromFile();
    return fragmentsData.map(data => this.mapToEntity(data));
  }

  async findByTag(tag: string): Promise<KnowledgeFragment[]> {
    const fragmentsData = (await this.getAllFragmentsFromFile())
      .filter(data => data.tags.includes(tag));

    return fragmentsData.map(data => this.mapToEntity(data));
  }

  async findByTags(tags: string[]): Promise<KnowledgeFragment[]> {
    const fragmentsData = (await this.getAllFragmentsFromFile())
      .filter(data => tags.every(tag => data.tags.includes(tag)));

    return fragmentsData.map(data => this.mapToEntity(data));
  }

  async search(query: string): Promise<KnowledgeFragment[]> {
    const lowerQuery = query.toLowerCase();
    const fragmentsData = (await this.getAllFragmentsFromFile())
      .filter(data =>
        data.title.toLowerCase().includes(lowerQuery) ||
        data.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );

    return fragmentsData.map(data => this.mapToEntity(data));
  }

  async delete(id: KnowledgeFragmentId): Promise<void> {
    const fragments = await this.getAllFragmentsFromFile();
    const exists = fragments.some(f => f.id === id.value);

    if (!exists) {
      throw new Error(`Knowledge fragment with id ${id.value} not found`);
    }

    const filteredFragments = fragments.filter(f => f.id !== id.value);
    await this.saveFragmentsToFile(filteredFragments);
  }

  private async getAllFragmentsFromFile(): Promise<KnowledgeFragmentData[]> {
    try {
      const electronAPI = (window as any).electronAPI;
      // 知识片段库必须使用全局的 fragment API（知识片段库是全局共享的，不随项目切换）
      // 不允许降级到 file API，因为 file API 使用项目路径，会导致知识片段库路径错误
      if (!electronAPI || !electronAPI.fragment) {
        console.error('知识片段库 API 不可用，知识片段库需要全局路径支持');
        throw new Error('知识片段库 API 不可用');
      }

      const data = await electronAPI.fragment.read(this.FILE_NAME);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading knowledge fragments from file:', error);
      // 返回空数组而不是抛出错误，避免应用崩溃
      return [];
    }
  }

  private async saveFragmentsToFile(fragments: KnowledgeFragmentData[]): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      // 知识片段库必须使用全局的 fragment API（知识片段库是全局共享的，不随项目切换）
      // 不允许降级到 file API，因为 file API 使用项目路径，会导致知识片段库路径错误
      if (!electronAPI || !electronAPI.fragment) {
        console.error('知识片段库 API 不可用，知识片段库需要全局路径支持');
        throw new Error('知识片段库 API 不可用');
      }

      await electronAPI.fragment.write(this.FILE_NAME, fragments);
    } catch (error) {
      console.error('Error saving knowledge fragments to file:', error);
      throw new Error('Failed to save knowledge fragments to file system');
    }
  }

  private mapToEntity(data: KnowledgeFragmentData): KnowledgeFragment {
    // 使用JSON序列化/反序列化来重建实体
    const json = JSON.stringify({
      id: data.id,
      title: data.title,
      tags: data.tags,
      nodes: data.nodes,
      assetDependencies: data.assetDependencies,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });

    return KnowledgeFragment.fromJSON(json);
  }
}


