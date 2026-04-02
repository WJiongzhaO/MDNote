import { inject, injectable } from 'inversify'
import { TYPES } from '../../core/container/container.types'
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface'
import type { ReferenceGraphService } from './reference-graph.service'
import { computeFragmentHealth } from './health-calculator.service'
import type {
  VaultHealthSummary,
  ImpactOfFragmentChange,
} from '../../domain/types/reference-graph.types'

/**
 * 工作3：知识健康度与影响分析门面（依赖图谱服务与片段仓储）
 */
@injectable()
export class KnowledgeHealthService {
  constructor(
    @inject(TYPES.KnowledgeFragmentRepository)
    private readonly fragmentRepository: KnowledgeFragmentRepository,
    @inject(TYPES.ReferenceGraphService)
    private readonly graphService: ReferenceGraphService,
  ) {}

  /** 获取知识库健康度摘要（vaultId 预留，当前片段库全局故未按库过滤） */
  async getVaultHealthSummary(_vaultId?: string): Promise<VaultHealthSummary> {
    const fragments = await this.fragmentRepository.findAll()
    const graph = await this.graphService.buildGraph()

    let activeCount = 0
    let isolatedCount = 0
    let pendingVerificationCount = 0
    let lowTrustCount = 0
    const recentActive: VaultHealthSummary['recentActiveFragments'] = []
    const topImpact: VaultHealthSummary['topImpactFragments'] = []

    const refTimeByFragment = new Map<string, number>()
    const healthByFragment = new Map<string, number>()

    for (const f of fragments) {
      const { healthScore, flags } = computeFragmentHealth(f, graph)
      if (f.getStatus() === 'active') activeCount++
      if (flags.isolated) isolatedCount++
      if (flags.expired) pendingVerificationCount++
      if (flags.lowTrust) lowTrustCount++

      const refs = f.getReferencedDocuments()
      const maxRefAt = refs.length ? Math.max(...refs.map((r) => r.referencedAt.getTime())) : 0
      refTimeByFragment.set(f.getId().value, maxRefAt)
      healthByFragment.set(f.getId().value, healthScore)
    }

    const sortedByRef = [...fragments].sort(
      (a, b) =>
        (refTimeByFragment.get(b.getId().value) ?? 0) -
        (refTimeByFragment.get(a.getId().value) ?? 0),
    )
    for (let i = 0; i < Math.min(10, sortedByRef.length); i++) {
      const f = sortedByRef[i]
      const refAt = refTimeByFragment.get(f.getId().value)
      if (!refAt) continue
      recentActive.push({
        id: f.getId().value,
        title: f.getTitle().value,
        referencedAt: new Date(refAt).toISOString(),
      })
    }

    const sortedByImpact = [...fragments].sort(
      (a, b) => (b.getReferencedDocuments().length || 0) - (a.getReferencedDocuments().length || 0),
    )
    for (let i = 0; i < Math.min(10, sortedByImpact.length); i++) {
      const f = sortedByImpact[i]
      topImpact.push({
        id: f.getId().value,
        title: f.getTitle().value,
        referenceCount: f.getReferencedDocuments().length,
        healthScore: healthByFragment.get(f.getId().value) ?? 0,
      })
    }

    return {
      activeCount,
      isolatedCount,
      pendingVerificationCount,
      lowTrustCount,
      recentActiveFragments: recentActive,
      topImpactFragments: topImpact,
    }
  }

  /** 单片段健康分与 flags */
  async getFragmentHealth(
    fragmentId: string,
  ): Promise<{
    healthScore: number
    flags: import('../../domain/types/reference-graph.types').HealthFlags
  } | null> {
    const fragment = await this.fragmentRepository.findById({ value: fragmentId })
    if (!fragment) return null
    const graph = await this.graphService.buildGraph()
    return computeFragmentHealth(fragment, graph)
  }

  /** 修改片段的影响范围 */
  async getImpactOfFragmentChange(fragmentId: string): Promise<ImpactOfFragmentChange> {
    const docIds = await this.graphService.getDocumentsByFragment(fragmentId)
    const fragments = await this.fragmentRepository.findAll()
    const byId = new Map(fragments.map((f) => [f.getId().value, f]))
    const titles: string[] = []
    let highImpactCount = 0
    for (const docId of docIds) {
      const refs = byId.get(fragmentId)?.getReferencedDocuments() ?? []
      const r = refs.find((x) => x.documentId === docId)
      titles.push(r?.documentTitle ?? docId)
      if (r) {
        const daysSinceRef = (Date.now() - r.referencedAt.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceRef <= 30) highImpactCount++
      }
    }
    return {
      documentIds: docIds,
      documentTitles: titles,
      affectedCount: docIds.length,
      highImpactCount,
    }
  }

  /** 获取片段的子片段列表（派生链） */
  async getFragmentChildrenDetails(
    fragmentId: string,
  ): Promise<Array<{ id: string; title: string; status: string; updatedAt: string }>> {
    const childIds = await this.graphService.getFragmentChildren(fragmentId)
    const result: Array<{ id: string; title: string; status: string; updatedAt: string }> = []
    for (const childId of childIds) {
      const fragment = await this.fragmentRepository.findById({ value: childId })
      if (fragment) {
        result.push({
          id: fragment.getId().value,
          title: fragment.getTitle().value,
          status: fragment.getStatus(),
          updatedAt: fragment.getUpdatedAt().toISOString(),
        })
      }
    }
    return result
  }
}
