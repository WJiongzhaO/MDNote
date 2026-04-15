import { KnowledgeFragment } from '../../domain/entities/knowledge-fragment.entity'
import type { KnowledgeFragmentId } from '../../domain/types/knowledge-fragment.types'
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface'

/**
 * 知识片段数据格式（用于文件存储）
 * 工作2 扩展：元数据与状态字段，老数据缺省时由实体 fromJSON 默认
 */
export interface KnowledgeFragmentData {
  id: string
  title: string
  tags: string[]
  nodes: any[]
  assetDependencies: string[]
  sourceDocumentId?: string
  referencedDocuments?: Array<{
    documentId: string
    documentTitle: string
    referencedAt: string
    isConnected: boolean
  }>
  createdAt: string
  updatedAt: string
  source?: string
  trustScore?: number
  lastVerifiedAt?: string | null
  verifiedBy?: string
  categoryPathIds?: string[]
  status?: 'active' | 'archived' | 'deprecated'
  derivedFromId?: string
}

/**
 * 基于文件系统的知识片段仓储实现
 *
 * 与「片段资源（图片等）」均位于当前知识库数据路径下：
 * - 本仓储读写：getDataPath()/.mdnote-fragments-{vaultId}/knowledge-fragments.json
 * - 图片等资源：getDataPath()/fragments/assets/{fragmentId}/（主进程 fragment:* 与 FileSystemImageStorageService）
 */
export class FileSystemKnowledgeFragmentRepository implements KnowledgeFragmentRepository {
  private readonly FILE_NAME = 'knowledge-fragments.json'
  private readonly vaultId: string

  constructor(vaultId: string = 'default') {
    this.vaultId = vaultId
  }

  private getFragmentDirName(): string {
    // 使用 vaultId 作为目录名的一部分，确保不同知识库隔离存储
    return `.mdnote-fragments-${this.vaultId}`
  }

  private async getAllFragmentsFromFile(): Promise<KnowledgeFragmentData[]> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI || !electronAPI.file) {
        return this.getLocalStorageFallback()
      }

      let basePath: string
      if (electronAPI.file.getDataPath) {
        basePath = await electronAPI.file.getDataPath()
      } else if (electronAPI.file.getCustomDataPath) {
        basePath = await electronAPI.file.getCustomDataPath()
      } else {
        return this.getLocalStorageFallback()
      }

      const fragmentDir = `${basePath}/${this.getFragmentDirName()}`
      const filePath = `${fragmentDir}/${this.FILE_NAME}`

      try {
        const dirExists = await electronAPI.file.exists(fragmentDir)
        if (!dirExists) {
          await electronAPI.file.mkdir(fragmentDir)
        }
      } catch {
        // 目录可能已存在，忽略错误
      }

      const content = await electronAPI.file.readFileContent(filePath)
      return content ? JSON.parse(content) : []
    } catch (error) {
      console.error('Error loading knowledge fragments from file:', error)
      return this.getLocalStorageFallback()
    }
  }

  async save(fragment: KnowledgeFragment): Promise<void> {
    const fragments = await this.getAllFragmentsFromFile()
    const fragmentData: KnowledgeFragmentData = {
      id: fragment.getId().value,
      title: fragment.getTitle().value,
      tags: fragment.getTags().value,
      nodes: fragment.getNodes().map((node) => node.toJSON()),
      assetDependencies: fragment.getAssetDependencies().value,
      createdAt: fragment.getCreatedAt().toISOString(),
      updatedAt: fragment.getUpdatedAt().toISOString(),
      sourceDocumentId: fragment.getSourceDocumentId(),
      referencedDocuments: fragment.getReferencedDocuments().map((ref) => ({
        documentId: ref.documentId,
        documentTitle: ref.documentTitle,
        referencedAt: ref.referencedAt.toISOString(),
        isConnected: ref.isConnected,
        referenceCount: (ref as any).referenceCount || 1,
      })),
      source: fragment.getSource(),
      trustScore: fragment.getTrustScore(),
      lastVerifiedAt: fragment.getLastVerifiedAt()?.toISOString() ?? null,
      verifiedBy: fragment.getVerifiedBy(),
      categoryPathIds: fragment.getCategoryPathIds(),
      status: fragment.getStatus(),
      derivedFromId: fragment.getDerivedFromId(),
    }

    const existingIndex = fragments.findIndex((f) => f.id === fragmentData.id)
    if (existingIndex !== -1) {
      fragments[existingIndex] = fragmentData
    } else {
      fragments.push(fragmentData)
    }

    await this.saveFragmentsToFile(fragments)
    console.log(
      '[FileSystemFragmentRepo] 保存片段, id:',
      fragmentData.id,
      '引用数:',
      fragmentData.referencedDocuments?.length ?? 0,
    )
  }

  async findById(id: KnowledgeFragmentId): Promise<KnowledgeFragment | null> {
    const fragments = await this.getAllFragmentsFromFile()
    const fragmentData = fragments.find((f) => f.id === id.value)

    if (!fragmentData) {
      return null
    }

    console.log(
      '[FileSystemFragmentRepo] findById, id:',
      id.value,
      '引用数:',
      fragmentData.referencedDocuments?.length ?? 0,
    )
    return this.mapToEntity(fragmentData)
  }

  async findAll(): Promise<KnowledgeFragment[]> {
    const fragmentsData = await this.getAllFragmentsFromFile()
    console.log(
      '[FileSystemFragmentRepo] findAll, 片段数:',
      fragmentsData.length,
      'vaultId:',
      this.vaultId,
    )
    return fragmentsData.map((data) => this.mapToEntity(data))
  }

  async findByTag(tag: string): Promise<KnowledgeFragment[]> {
    const fragmentsData = (await this.getAllFragmentsFromFile()).filter((data) =>
      data.tags.includes(tag),
    )

    return fragmentsData.map((data) => this.mapToEntity(data))
  }

  async findByTags(tags: string[]): Promise<KnowledgeFragment[]> {
    const fragmentsData = (await this.getAllFragmentsFromFile()).filter((data) =>
      tags.every((tag) => data.tags.includes(tag)),
    )

    return fragmentsData.map((data) => this.mapToEntity(data))
  }

  async search(query: string): Promise<KnowledgeFragment[]> {
    const lowerQuery = query.toLowerCase()
    const fragmentsData = (await this.getAllFragmentsFromFile()).filter(
      (data) =>
        data.title.toLowerCase().includes(lowerQuery) ||
        data.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    )

    return fragmentsData.map((data) => this.mapToEntity(data))
  }

  async delete(id: KnowledgeFragmentId): Promise<void> {
    const fragments = await this.getAllFragmentsFromFile()
    const exists = fragments.some((f) => f.id === id.value)

    if (!exists) {
      throw new Error(`Knowledge fragment with id ${id.value} not found`)
    }

    const filteredFragments = fragments.filter((f) => f.id !== id.value)
    await this.saveFragmentsToFile(filteredFragments)
  }

  async getAllTags(): Promise<string[]> {
    const fragments = await this.getAllFragmentsFromFile()
    const tagSet = new Set<string>()
    for (const fragment of fragments) {
      for (const tag of fragment.tags) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  }

  private getLocalStorageFallback(): KnowledgeFragmentData[] {
    try {
      const key = `mdnote-knowledge-fragments-${this.vaultId}`
      const stored = localStorage.getItem(key)
      if (!stored) return []
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private async saveFragmentsToFile(fragments: KnowledgeFragmentData[]): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI || !electronAPI.file) {
        console.warn('文件 API 不可用，使用 LocalStorage fallback')
        this.saveLocalStorageFallback(fragments)
        return
      }

      // 获取当前知识库的路径
      let basePath: string
      if (electronAPI.file.getDataPath) {
        basePath = await electronAPI.file.getDataPath()
      } else if (electronAPI.file.getCustomDataPath) {
        basePath = await electronAPI.file.getCustomDataPath()
      } else {
        this.saveLocalStorageFallback(fragments)
        return
      }

      // 使用 vaultId 区分不同知识库的片段存储
      const fragmentDir = `${basePath}/${this.getFragmentDirName()}`
      const filePath = `${fragmentDir}/${this.FILE_NAME}`

      // 确保目录存在
      try {
        const dirExists = await electronAPI.file.exists(fragmentDir)
        if (!dirExists) {
          await electronAPI.file.mkdir(fragmentDir)
        }
      } catch {
        // 目录可能已存在，忽略错误
      }

      await electronAPI.file.writeFileContent(filePath, JSON.stringify(fragments, null, 2))
    } catch (error) {
      console.error('Error saving knowledge fragments to file:', error)
      this.saveLocalStorageFallback(fragments)
    }
  }

  private saveLocalStorageFallback(fragments: KnowledgeFragmentData[]): void {
    try {
      const key = `mdnote-knowledge-fragments-${this.vaultId}`
      localStorage.setItem(key, JSON.stringify(fragments))
    } catch (error) {
      console.error('Error saving knowledge fragments to localStorage:', error)
      throw new Error('Failed to save knowledge fragments')
    }
  }

  private mapToEntity(data: KnowledgeFragmentData): KnowledgeFragment {
    const json = JSON.stringify({
      id: data.id,
      title: data.title,
      tags: data.tags,
      nodes: data.nodes,
      assetDependencies: data.assetDependencies,
      sourceDocumentId: data.sourceDocumentId,
      referencedDocuments: data.referencedDocuments ?? [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      source: data.source,
      trustScore: data.trustScore,
      lastVerifiedAt: data.lastVerifiedAt,
      verifiedBy: data.verifiedBy,
      categoryPathIds: data.categoryPathIds,
      status: data.status,
      derivedFromId: data.derivedFromId,
    })
    return KnowledgeFragment.fromJSON(json)
  }
}
