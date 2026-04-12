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

export interface AiGraphExtractor {
  extractEntitiesAndRelations(markdown: string): Promise<AiGraphExtractionResult>;
}
