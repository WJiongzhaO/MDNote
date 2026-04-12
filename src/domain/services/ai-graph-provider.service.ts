import type { AiGraphProviderConfig } from '../types/ai-knowledge-graph.types';

export interface AiGraphProviderConnectionResult {
  success: boolean;
  message?: string;
}

export interface AiGraphProviderGateway {
  load(): Promise<Partial<AiGraphProviderConfig> | null>;
  save(config: AiGraphProviderConfig): Promise<void>;
  testConnection(config: AiGraphProviderConfig): Promise<AiGraphProviderConnectionResult>;
}
