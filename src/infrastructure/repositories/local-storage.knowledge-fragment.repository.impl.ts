import { KnowledgeFragment } from '../../domain/entities/knowledge-fragment.entity'
import type { KnowledgeFragmentId } from '../../domain/types/knowledge-fragment.types'
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface'
import type { KnowledgeFragmentData } from './file-system.knowledge-fragment.repository.impl'

/**
 * 基于LocalStorage的知识片段仓储实现
 */
export class LocalStorageKnowledgeFragmentRepository implements KnowledgeFragmentRepository {
  private readonly STORAGE_KEY_PREFIX = 'mdnote-knowledge-fragments'
  private readonly vaultId: string

  constructor(vaultId: string = 'default') {
    this.vaultId = vaultId
  }

  private getStorageKey(): string {
    return `${this.STORAGE_KEY_PREFIX}-${this.vaultId}`
  }

  async save(fragment: KnowledgeFragment): Promise<void> {
    const fragments = this.getAllFragmentsFromStorage()
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

    this.saveFragmentsToStorage(fragments)
  }

  async findById(id: KnowledgeFragmentId): Promise<KnowledgeFragment | null> {
    const fragments = this.getAllFragmentsFromStorage()
    const fragmentData = fragments.find((f) => f.id === id.value)

    if (!fragmentData) {
      return null
    }

    return this.mapToEntity(fragmentData)
  }

  async findAll(): Promise<KnowledgeFragment[]> {
    const fragmentsData = this.getAllFragmentsFromStorage()
    return fragmentsData.map((data) => this.mapToEntity(data))
  }

  async findByTag(tag: string): Promise<KnowledgeFragment[]> {
    const fragmentsData = this.getAllFragmentsFromStorage().filter((data) =>
      data.tags.includes(tag),
    )

    return fragmentsData.map((data) => this.mapToEntity(data))
  }

  async findByTags(tags: string[]): Promise<KnowledgeFragment[]> {
    const fragmentsData = this.getAllFragmentsFromStorage().filter((data) =>
      tags.every((tag) => data.tags.includes(tag)),
    )

    return fragmentsData.map((data) => this.mapToEntity(data))
  }

  async search(query: string): Promise<KnowledgeFragment[]> {
    const lowerQuery = query.toLowerCase()
    const fragmentsData = this.getAllFragmentsFromStorage().filter(
      (data) =>
        data.title.toLowerCase().includes(lowerQuery) ||
        data.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    )

    return fragmentsData.map((data) => this.mapToEntity(data))
  }

  async delete(id: KnowledgeFragmentId): Promise<void> {
    const fragments = this.getAllFragmentsFromStorage()
    const exists = fragments.some((f) => f.id === id.value)

    if (!exists) {
      throw new Error(`Knowledge fragment with id ${id.value} not found`)
    }

    const filteredFragments = fragments.filter((f) => f.id !== id.value)
    this.saveFragmentsToStorage(filteredFragments)
  }

  async getAllTags(): Promise<string[]> {
    const fragments = this.getAllFragmentsFromStorage()
    const tagSet = new Set<string>()
    for (const fragment of fragments) {
      for (const tag of fragment.tags) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  }

  private getAllFragmentsFromStorage(): KnowledgeFragmentData[] {
    try {
      const stored = localStorage.getItem(this.getStorageKey())
      if (!stored) {
        return []
      }
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Error loading knowledge fragments from localStorage:', error)
      return []
    }
  }

  private saveFragmentsToStorage(fragments: KnowledgeFragmentData[]): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(fragments))
    } catch (error) {
      console.error('Error saving knowledge fragments to localStorage:', error)
      throw new Error('Failed to save knowledge fragments to local storage')
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
