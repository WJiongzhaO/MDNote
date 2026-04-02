import type { KnowledgeFragment } from '../../domain/entities/knowledge-fragment.entity';
import type { ReferenceGraph } from '../../domain/types/reference-graph.types';
import type { FragmentHealthResult, HealthFlags } from '../../domain/types/reference-graph.types';

const VERIFICATION_EXPIRY_DAYS = 90;
const RECENT_REFERENCE_DAYS = 30;
const LOW_TRUST_THRESHOLD = 3;
const TRUST_HIGH = 4;

/**
 * 工作3：健康度规则评分（纯函数，便于单测）
 */
export function computeFragmentHealth(
  fragment: KnowledgeFragment,
  graph: ReferenceGraph
): FragmentHealthResult {
  const flags: HealthFlags = {
    isolated: false,
    expired: false,
    lowTrust: false,
    deprecatedDependency: false
  };

  const refs = fragment.getReferencedDocuments();
  const refCount = refs.length;
  const parentId = fragment.getDerivedFromId();
  const children = graph.fragmentToChildren.get(fragment.getId().value) ?? [];
  const hasRelation = refCount > 0 || parentId != null || children.length > 0;
  if (!hasRelation) flags.isolated = true;

  const lastVerified = fragment.getLastVerifiedAt();
  if (lastVerified) {
    const daysSince = (Date.now() - lastVerified.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > VERIFICATION_EXPIRY_DAYS) flags.expired = true;
  } else {
    flags.expired = true; // 从未验证视为过期
  }

  if (fragment.getTrustScore() < LOW_TRUST_THRESHOLD) flags.lowTrust = true;

  if (parentId) {
    // 父片段状态需调用方传入或从仓储查，此处仅基于 graph 无法知 status；简化：不设 deprecatedDependency，由上层传入
    // 若需可扩展为传入 parentFragment 或 parentStatus
  }

  let score = 0;
  if (refCount > 5) score += 20;
  const maxRefAt = refs.length ? Math.max(...refs.map(r => r.referencedAt.getTime())) : 0;
  if (maxRefAt && (Date.now() - maxRefAt) / (24 * 60 * 60 * 1000) <= RECENT_REFERENCE_DAYS)
    score += 15;
  if (fragment.getTrustScore() >= TRUST_HIGH) score += 20;
  if (lastVerified && (Date.now() - lastVerified.getTime()) / (24 * 60 * 60 * 1000) <= VERIFICATION_EXPIRY_DAYS)
    score += 15;
  if (flags.isolated) score -= 30;
  if (fragment.getStatus() === 'deprecated') score -= 50;
  if (fragment.getStatus() === 'archived') score -= 10;

  return { healthScore: Math.max(0, Math.min(100, score)), flags };
}
