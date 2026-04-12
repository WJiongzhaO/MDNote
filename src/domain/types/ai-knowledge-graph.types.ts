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

export interface AiGraphProviderConfig {
  providerType: 'openai' | 'volcengine' | 'dashscope' | 'deepseek' | 'ollama' | 'custom';
  baseURL?: string;
  apiKey?: string;
  model: string;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}
