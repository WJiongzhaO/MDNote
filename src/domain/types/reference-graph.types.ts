/**
 * 工作3：资产引用关系图谱类型（片段-文档、父子片段）
 */

export interface ReferenceGraph {
  documentToFragments: Map<string, string[]>;
  fragmentToDocuments: Map<string, string[]>;
  fragmentToParent: Map<string, string | null>;
  fragmentToChildren: Map<string, string[]>;
  /** 预留给模板-变量关系图（工作3/工作5联动） */
  templateToVariables: Map<string, string[]>;
}

export interface HealthFlags {
  isolated: boolean;
  expired: boolean;
  lowTrust: boolean;
  deprecatedDependency: boolean;
}

export interface FragmentHealthResult {
  healthScore: number;
  flags: HealthFlags;
}

export interface VaultHealthSummary {
  activeCount: number;
  isolatedCount: number;
  pendingVerificationCount: number;
  lowTrustCount: number;
  recentActiveFragments: Array<{ id: string; title: string; referencedAt: string }>;
  topImpactFragments: Array<{ id: string; title: string; referenceCount: number; healthScore: number }>;
}

export interface RecommendationContext {
  documentTitleKeywords?: string[];
  documentTags?: string[];
  /** 正文关键词（已去代码块/引用标记），用于与片段标题轻量匹配 */
  contextKeywords?: string[];
  /** 已引用片段聚合出的分类上下文，用于分类匹配加权 */
  contextCategoryIds?: string[];
  variableValues?: Record<string, string>;
  alreadyReferencedFragmentIds?: string[];
  recentUsedFragmentIds?: string[];
}

export interface RecommendedFragment {
  fragmentId: string;
  title: string;
  score: number;
  reason?: string;
}

export interface ImpactOfFragmentChange {
  documentIds: string[];
  documentTitles: string[];
  affectedCount: number;
  highImpactCount?: number;
}
