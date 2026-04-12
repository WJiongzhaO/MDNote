import type { AiGraphBuildRecord } from '../types/ai-knowledge-graph.types';

export interface AiGraphMetadataRepository {
  saveRecord(record: AiGraphBuildRecord): Promise<void>;
  getRecord(docId: string): Promise<AiGraphBuildRecord | null>;
}
