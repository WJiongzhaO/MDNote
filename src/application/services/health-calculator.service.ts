import type { KnowledgeFragment } from '../../domain/entities/knowledge-fragment.entity'
import type {
  ReferenceGraph,
  HealthFlags,
  FragmentHealthResult,
} from '../../domain/types/reference-graph.types'

/**
 * 计算片段健康度
 */
export function computeFragmentHealth(
  fragment: KnowledgeFragment,
  graph: ReferenceGraph,
): FragmentHealthResult {
  const flags: HealthFlags = {
    isolated: false,
    expired: false,
    lowTrust: false,
    deprecatedDependency: false,
  }

  // 1. 是否孤立（没有被任何文档引用，也没有子片段）
  const refs = fragment.getReferencedDocuments()
  const children = graph.fragmentToChildren.get(fragment.getId().value) ?? []
  if (refs.length === 0 && children.length === 0) {
    flags.isolated = true
  }

  // 2. 是否过期（超过90天未验证）
  const lastVerified = fragment.getLastVerifiedAt()
  if (lastVerified) {
    const daysSinceVerified = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceVerified > 90) {
      flags.expired = true
    }
  }

  // 3. 可信度是否过低（信任分 < 60）
  const trustScore = fragment.getTrustScore()
  if (trustScore < 60) {
    flags.lowTrust = true
  }

  // 4. 是否有废弃依赖（引用的片段状态为 deprecated）
  for (const ref of refs) {
    const refFragmentId = ref.documentId
    // 简化处理：如果文档引用已断开，认为有废弃依赖
    if (!ref.isConnected) {
      flags.deprecatedDependency = true
      break
    }
  }

  // 计算健康分（0-100）
  let healthScore = 100
  if (flags.isolated) healthScore -= 30
  if (flags.expired) healthScore -= 25
  if (flags.lowTrust) healthScore -= 25
  if (flags.deprecatedDependency) healthScore -= 20
  healthScore = Math.max(0, healthScore)

  return { healthScore, flags }
}
