export type AiGraphBuildStatus = 'not_built' | 'building' | 'ready' | 'failed' | 'ready_empty';

export type AiEvidenceAnchorType = 'range' | 'block';

export interface AiEvidenceAnchor {
  anchorId: string;
  docId: string;
  chunkId: string;
  blockId?: string;
  startOffset?: number;
  endOffset?: number;
  excerpt?: string;
  anchorType: AiEvidenceAnchorType;
}

export interface AiGraphEntity {
  entityId: string;
  name: string;
  normalizedName: string;
  type: string;
  description?: string;
  sourceDocId: string;
  sourceChunkId: string;
  metadata: Record<string, unknown>;
  anchors: AiEvidenceAnchor[];
}

export interface AiGraphRelation {
  relationId: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  description?: string;
  sourceDocId: string;
  sourceChunkId: string;
  metadata: Record<string, unknown>;
}

export interface AiKnowledgeGraphNode {
  id: string;
  label: string;
  entityType: string;
  description?: string;
  primaryAnchor?: AiEvidenceAnchor;
  evidenceCount: number;
  evidencePreview: AiEvidenceAnchor[];
}

export interface AiKnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
  description?: string;
}

export interface AiKnowledgeGraph {
  nodes: AiKnowledgeGraphNode[];
  edges: AiKnowledgeGraphEdge[];
}

export interface AiGraphBuildRecord {
  docId: string;
  contentHash: string;
  status: AiGraphBuildStatus;
  provider: string;
  model: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  graphVersion: string;
}

export interface AiGraphBuildState extends AiGraphBuildRecord {
  graph?: AiKnowledgeGraph | null;
  partialFailure?: {
    stage: 'global_merge';
    message: string;
  };
}

export interface AiGlobalGraphQuery {
  seedDocId?: string;
  seedNodeId?: string;
  keyword?: string;
  maxHops: number;
  limit: number;
}

export interface AiNodeEvidence {
  nodeId: string;
  label: string;
  anchors: AiEvidenceAnchor[];
}

export type AiNodeJumpResolution =
  | {
      mode: 'direct';
      anchor: AiEvidenceAnchor;
    }
  | {
      mode: 'select';
      anchors: AiEvidenceAnchor[];
    }
  | {
      mode: 'unavailable';
      reason: string;
    };

export type AiGraphProviderName =
  | 'dashscope'
  | 'openai'
  | 'deepseek'
  | 'volcengine'
  | 'ollama'
  | 'custom';

export interface AiGraphProviderConfig {
  providerName: AiGraphProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export const DEFAULT_PROVIDER_CONFIG: AiGraphProviderConfig = {
  providerName: 'dashscope',
  apiKey: '',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen3.6-plus',
  temperature: 0.1,
  maxTokens: 4096
};
