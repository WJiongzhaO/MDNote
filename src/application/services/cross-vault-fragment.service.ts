import { StorageAdapter } from '../../infrastructure/storage.adapter'
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface'
import type { KnowledgeFragment } from '../../domain/entities/knowledge-fragment.entity'

/**
 * 跨知识库片段引用服务
 * 用于解析和获取其他知识库的片段引用
 */
export class CrossVaultFragmentService {
  /**
   * 获取指定知识库的片段
   */
  async getFragmentFromVault(
    vaultId: string,
    fragmentId: string,
  ): Promise<KnowledgeFragment | null> {
    const repository = StorageAdapter.createKnowledgeFragmentRepository(vaultId)
    return repository.findById({ value: fragmentId })
  }

  /**
   * 列出指定知识库的所有片段
   */
  async listFragmentsFromVault(vaultId: string): Promise<KnowledgeFragment[]> {
    const repository = StorageAdapter.createKnowledgeFragmentRepository(vaultId)
    return repository.findAll()
  }

  /**
   * 搜索指定知识库的片段
   */
  async searchFragmentsInVault(vaultId: string, query: string): Promise<KnowledgeFragment[]> {
    const repository = StorageAdapter.createKnowledgeFragmentRepository(vaultId)
    return repository.search(query)
  }

  /**
   * 获取片段标题（用于显示引用占位符）
   */
  async getFragmentTitle(vaultId: string, fragmentId: string): Promise<string | null> {
    const fragment = await this.getFragmentFromVault(vaultId, fragmentId)
    return fragment?.getTitle().value ?? null
  }

  /**
   * 解析引用格式
   * 支持格式：
   * - {{ref:fragmentId}} - 同知识库引用
   * - {{ref:vaultId/fragmentId}} - 跨知识库引用
   */
  parseReference(ref: string): { vaultId: string; fragmentId: string } | null {
    // 匹配跨知识库格式：vaultId/fragmentId
    const crossVaultMatch = ref.match(/^([^/]+)\/(.+)$/)
    if (crossVaultMatch) {
      return {
        vaultId: crossVaultMatch[1] ?? 'default',
        fragmentId: crossVaultMatch[2] ?? '',
      }
    }

    // 同知识库格式
    return null
  }

  /**
   * 生成引用标志
   */
  generateReference(vaultId: string, fragmentId: string): string {
    if (vaultId === 'default' || !vaultId) {
      return `{{ref:${fragmentId}}}`
    }
    return `{{ref:${vaultId}/${fragmentId}}}`
  }
}

export const crossVaultFragmentService = new CrossVaultFragmentService()
