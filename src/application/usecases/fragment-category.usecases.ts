import { inject, injectable } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { FragmentCategoryRepository } from '../../domain/repositories/fragment-category.repository.interface';
import type { FragmentCategory, FragmentCategoryTreeNode } from '../../domain/types/fragment-category.types';
import type { DeleteCategoryOptions } from '../../domain/types/fragment-category.types';

/**
 * 工作2：片段分类用例（与 Vault 绑定，便于工作1 路由合并）
 */
@injectable()
export class FragmentCategoryUseCases {
  constructor(
    @inject(TYPES.FragmentCategoryRepository)
    private readonly repository: FragmentCategoryRepository
  ) {}

  async getCategoryTree(vaultId: string): Promise<FragmentCategoryTreeNode[]> {
    return this.repository.getTree(vaultId);
  }

  async createCategory(
    vaultId: string,
    parentId: string | null,
    name: string
  ): Promise<FragmentCategory> {
    return this.repository.create(vaultId, parentId, name);
  }

  async renameCategory(id: string, name: string): Promise<void> {
    return this.repository.rename(id, name);
  }

  async moveCategory(id: string, newParentId: string | null): Promise<void> {
    return this.repository.move(id, newParentId);
  }

  async deleteCategory(id: string, options?: DeleteCategoryOptions): Promise<void> {
    return this.repository.delete(id, options);
  }

  async reorderCategory(id: string, order: number): Promise<void> {
    return this.repository.reorder(id, order);
  }

  async assignFragmentCategories(
    _fragmentId: string,
    categoryPathIds: string[]
  ): Promise<void> {
    // 片段归属由 KnowledgeFragmentUseCases.updateFragmentMetadata(categoryPathIds) 维护
    // 本方法仅作为“分配分类”的语义入口，实际更新在片段用例中完成
    if (!categoryPathIds || categoryPathIds.length === 0) return;
    // 可选：校验 categoryPathIds 均存在
    return Promise.resolve();
  }
}
