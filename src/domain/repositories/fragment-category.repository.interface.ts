import type { FragmentCategory, FragmentCategoryTreeNode } from '../types/fragment-category.types';
import type { DeleteCategoryOptions } from '../types/fragment-category.types';

/**
 * 片段分类仓储接口（工作2，与 Vault 绑定）
 * vaultId 由调用方传入，便于工作1 路由合并后按知识库隔离分类树
 */
export interface FragmentCategoryRepository {
  getTree(vaultId: string): Promise<FragmentCategoryTreeNode[]>;

  create(vaultId: string, parentId: string | null, name: string): Promise<FragmentCategory>;

  rename(id: string, name: string): Promise<void>;

  move(id: string, newParentId: string | null): Promise<void>;

  delete(id: string, options?: DeleteCategoryOptions): Promise<void>;

  reorder(id: string, order: number): Promise<void>;

  findById(id: string): Promise<FragmentCategory | null>;
}
