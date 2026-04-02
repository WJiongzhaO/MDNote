import { KnowledgeFragment } from '../entities/knowledge-fragment.entity'
import type { KnowledgeFragmentId } from '../types/knowledge-fragment.types'

/**
 * 知识片段仓储接口
 */
export interface KnowledgeFragmentRepository {
  /**
   * 保存知识片段
   */
  save(fragment: KnowledgeFragment): Promise<void>

  /**
   * 根据ID查找知识片段
   */
  findById(id: KnowledgeFragmentId): Promise<KnowledgeFragment | null>

  /**
   * 查找所有知识片段
   */
  findAll(): Promise<KnowledgeFragment[]>

  /**
   * 根据标签查找知识片段
   */
  findByTag(tag: string): Promise<KnowledgeFragment[]>

  /**
   * 根据多个标签查找知识片段（AND关系）
   */
  findByTags(tags: string[]): Promise<KnowledgeFragment[]>

  /**
   * 搜索知识片段（标题和标签）
   */
  search(query: string): Promise<KnowledgeFragment[]>

  /**
   * 删除知识片段
   */
  delete(id: KnowledgeFragmentId): Promise<void>

  /**
   * 获取所有标签列表（去重）
   */
  getAllTags(): Promise<string[]>
}
