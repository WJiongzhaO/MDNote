import { inject, injectable } from 'inversify'
import { TYPES } from '../../core/container/container.types'
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface'
import { KnowledgeFragment } from '../../domain/entities/knowledge-fragment.entity'
import type {
  ReferenceGraph,
  FragmentHealthResult,
  VaultHealthSummary,
  FragmentImpactResult,
  FragmentChildrenDetail,
} from '../../domain/types/reference-graph.types'
import { computeFragmentHealth } from './health-calculator.service'
import { StorageAdapter } from '../../infrastructure/storage.adapter'

@injectable()
export class KnowledgeHealthService {
  private repository: KnowledgeFragmentRepository
  private vaultId: string

  constructor(vaultId: string = 'default') {
    this.vaultId = vaultId
    this.repository = StorageAdapter.createKnowledgeFragmentRepository(vaultId)
  }

  /**
   * 切换知识库
   */
  switchVault(vaultId: string): void {
    this.vaultId = vaultId
    this.repository = StorageAdapter.createKnowledgeFragmentRepository(vaultId)
  }

  private buildReferenceGraph(allFragments: KnowledgeFragment[]): ReferenceGraph {
    const fragmentToDocuments = new Map<string, string[]>()
    const documentToFragments = new Map<string, string[]>()
    const fragmentToChildren = new Map<string, string[]>()

    for (const fragment of allFragments) {
      const fragmentId = fragment.getId().value
      const refs = fragment.getReferencedDocuments()

      fragmentToDocuments.set(
        fragmentId,
        refs.map((ref) => ref.documentId),
      )

      for (const ref of refs) {
        const existing = documentToFragments.get(ref.documentId) ?? []
        existing.push(fragmentId)
        documentToFragments.set(ref.documentId, existing)
      }

      const derivedFromId = fragment.getDerivedFromId()
      if (derivedFromId) {
        const existing = fragmentToChildren.get(derivedFromId) ?? []
        existing.push(fragmentId)
        fragmentToChildren.set(derivedFromId, existing)
      }
    }

    return {
      fragmentToDocuments,
      documentToFragments,
      fragmentToChildren,
    }
  }

  async getFragmentHealth(fragmentId: string): Promise<FragmentHealthResult> {
    const fragment = await this.repository.findById({ value: fragmentId })
    if (!fragment) {
      return {
        healthScore: 0,
        flags: { isolated: true, expired: false, lowTrust: false, deprecatedDependency: false },
      }
    }

    const allFragments = await this.repository.findAll()
    const graph = this.buildReferenceGraph(allFragments)
    return computeFragmentHealth(fragment, graph)
  }

  async getImpactOfFragmentChange(fragmentId: string): Promise<FragmentImpactResult> {
    const fragment = await this.repository.findById({ value: fragmentId })
    if (!fragment) {
      return { affectedCount: 0, documentTitles: [], highImpactCount: 0 }
    }

    const referencedDocs = fragment.getReferencedDocuments()
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    const documentTitles: string[] = []
    let highImpactCount = 0

    for (const ref of referencedDocs) {
      if (ref.documentTitle) {
        documentTitles.push(ref.documentTitle)
      }
      if (ref.referencedAt.getTime() > thirtyDaysAgo) {
        highImpactCount++
      }
    }

    return {
      affectedCount: referencedDocs.length,
      documentTitles: documentTitles.slice(0, 10),
      highImpactCount,
    }
  }

  async getFragmentChildrenDetails(fragmentId: string): Promise<FragmentChildrenDetail[]> {
    const allFragments = await this.repository.findAll()
    return allFragments
      .filter((f) => f.getDerivedFromId() === fragmentId)
      .map((f) => ({
        id: f.getId().value,
        title: f.getTitle().value,
        status: f.getStatus(),
      }))
  }

  async getVaultHealthSummary(vaultId: string): Promise<VaultHealthSummary> {
    // 如果传入的 vaultId 与当前不同，需要使用正确的 repository
    if (vaultId !== this.vaultId) {
      this.vaultId = vaultId
      this.repository = StorageAdapter.createKnowledgeFragmentRepository(vaultId)
    }

    const allFragments = await this.repository.findAll()
    const graph = this.buildReferenceGraph(allFragments)

    let activeCount = 0
    let isolatedCount = 0
    let pendingVerificationCount = 0
    let lowTrustCount = 0

    const recentActiveFragments: Array<{ id: string; title: string; referencedAt: string }> = []
    const topImpactFragments: Array<{
      id: string
      title: string
      referenceCount: number
      healthScore: number
    }> = []

    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000

    for (const fragment of allFragments) {
      const status = fragment.getStatus()
      if (status === 'active') activeCount++

      const refs = fragment.getReferencedDocuments()
      const children = graph.fragmentToChildren.get(fragment.getId().value) ?? []

      if (refs.length === 0 && children.length === 0) {
        isolatedCount++
      }

      const lastVerified = fragment.getLastVerifiedAt()
      if (lastVerified && lastVerified.getTime() < ninetyDaysAgo) {
        pendingVerificationCount++
      }

      const trustScore = fragment.getTrustScore()
      if (trustScore < 60) {
        lowTrustCount++
      }

      const healthResult = computeFragmentHealth(fragment, graph)

      if (refs.length > 0) {
        const lastRef = refs.reduce((max: (typeof refs)[0], ref: (typeof refs)[0]) =>
          ref.referencedAt.getTime() > max.referencedAt.getTime() ? ref : max,
        )
        recentActiveFragments.push({
          id: fragment.getId().value,
          title: fragment.getTitle().value,
          referencedAt: lastRef.referencedAt.toISOString(),
        })
      }

      if (refs.length > 0) {
        topImpactFragments.push({
          id: fragment.getId().value,
          title: fragment.getTitle().value,
          referenceCount: refs.length,
          healthScore: healthResult.healthScore,
        })
      }
    }

    recentActiveFragments.sort(
      (a, b) => new Date(b.referencedAt).getTime() - new Date(a.referencedAt).getTime(),
    )
    recentActiveFragments.splice(5)

    topImpactFragments.sort((a, b) => b.referenceCount - a.referenceCount)
    topImpactFragments.splice(5)

    return {
      activeCount,
      isolatedCount,
      pendingVerificationCount,
      lowTrustCount,
      recentActiveFragments,
      topImpactFragments,
    }
  }
}
