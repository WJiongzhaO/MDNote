export interface HealthFlags {
  isolated: boolean
  expired: boolean
  lowTrust: boolean
  deprecatedDependency: boolean
}

export interface FragmentHealthResult {
  healthScore: number
  flags: HealthFlags
}

export interface ReferenceGraph {
  fragmentToDocuments: Map<string, string[]>
  documentToFragments: Map<string, string[]>
  fragmentToChildren: Map<string, string[]>
}

export interface VaultHealthSummary {
  activeCount: number
  isolatedCount: number
  pendingVerificationCount: number
  lowTrustCount: number
  recentActiveFragments: Array<{
    id: string
    title: string
    referencedAt: string
  }>
  topImpactFragments: Array<{
    id: string
    title: string
    referenceCount: number
    healthScore: number
  }>
}

export interface FragmentImpactResult {
  affectedCount: number
  documentTitles: string[]
  highImpactCount: number
}

export interface FragmentChildrenDetail {
  id: string
  title: string
  status: string
}
