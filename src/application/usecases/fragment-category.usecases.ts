import type { FragmentCategoryRepository } from '../../domain/repositories/fragment-category.repository.interface'
import type {
  FragmentCategory,
  FragmentCategoryTreeNode,
} from '../../domain/types/fragment-category.types'
import type { DeleteCategoryOptions } from '../../domain/types/fragment-category.types'
import { StorageAdapter } from '../../infrastructure/storage.adapter'

/**
 * 工作2：片段分类用例（与 Vault 绑定，便于工作1 路由合并）
 */
export class FragmentCategoryUseCases {
  private repository: FragmentCategoryRepository
  private vaultId: string

  constructor(vaultId: string = 'default') {
    this.vaultId = vaultId
    this.repository = StorageAdapter.createFragmentCategoryRepository(vaultId)
  }

  /**
   * 切换知识库
   */
  switchVault(vaultId: string): void {
    this.vaultId = vaultId
    this.repository = StorageAdapter.createFragmentCategoryRepository(vaultId)
  }

  async getCategoryTree(vaultId: string): Promise<FragmentCategoryTreeNode[]> {
    return this.repository.getTree(vaultId)
  }

  async createCategory(
    vaultId: string,
    parentId: string | null,
    name: string,
  ): Promise<FragmentCategory> {
    return this.repository.create(vaultId, parentId, name)
  }

  async renameCategory(id: string, name: string): Promise<void> {
    return this.repository.rename(id, name)
  }

  async moveCategory(id: string, newParentId: string | null): Promise<void> {
    return this.repository.move(id, newParentId)
  }

  async deleteCategory(id: string, options?: DeleteCategoryOptions): Promise<void> {
    return this.repository.delete(id, options)
  }

  async reorderCategory(id: string, order: number): Promise<void> {
    return this.repository.reorder(id, order)
  }

  async assignFragmentCategories(_fragmentId: string, categoryPathIds: string[]): Promise<void> {
    if (!categoryPathIds || categoryPathIds.length === 0) return
    return Promise.resolve()
  }
}
