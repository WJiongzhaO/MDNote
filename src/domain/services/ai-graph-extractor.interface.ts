import type { AiGraphProviderConfig } from '../types/ai-knowledge-graph.types';

export interface AiGraphExtractedEntity {
  name: string;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AiGraphExtractedRelation {
  source: string;
  target: string;
  type: string;
  name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AiGraphExtractionResult {
  entities: AiGraphExtractedEntity[];
  relations: AiGraphExtractedRelation[];
}

export interface AiGraphExtractionChunk {
  chunkId: string;
  docId: string;
  markdown: string;
  headingPath: string[];
  startOffset: number;
  endOffset: number;
}

export interface AiGraphExtractor {
  extractChunk(
    chunk: AiGraphExtractionChunk,
    config: AiGraphProviderConfig
  ): Promise<AiGraphExtractionResult>;
}
