import type {
  AiGraphProviderConnectionResult,
  AiGraphProviderGateway
} from '../../domain/services/ai-graph-provider.service';
import {
  DEFAULT_PROVIDER_CONFIG,
  type AiGraphProviderConfig,
  type AiGraphProviderName
} from '../../domain/types/ai-knowledge-graph.types';
import { PROVIDER_PRESETS } from '../../infrastructure/ai-graph/provider-presets';

function trimToUndefined(value?: string): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getPreset(providerName: AiGraphProviderName) {
  if (providerName === 'custom') {
    return undefined;
  }

  return PROVIDER_PRESETS[providerName];
}

export class AiGraphSettingsService {
  constructor(private readonly gateway: AiGraphProviderGateway) {}

  withProviderDefaults(config: Partial<AiGraphProviderConfig> = {}): AiGraphProviderConfig {
    const providerName = config.providerName ?? DEFAULT_PROVIDER_CONFIG.providerName;
    const preset = getPreset(providerName);
    const model = trimToUndefined(config.model) ?? preset?.defaultModel;

    if (!model) {
      throw new Error(`Model is required for provider "${providerName}".`);
    }

    return {
      providerName,
      apiKey: trimToUndefined(config.apiKey) ?? DEFAULT_PROVIDER_CONFIG.apiKey,
      baseUrl: trimToUndefined(config.baseUrl) ?? preset?.defaultBaseUrl ?? DEFAULT_PROVIDER_CONFIG.baseUrl,
      model,
      temperature: config.temperature ?? DEFAULT_PROVIDER_CONFIG.temperature,
      maxTokens: config.maxTokens ?? DEFAULT_PROVIDER_CONFIG.maxTokens
    };
  }

  async load(): Promise<AiGraphProviderConfig> {
    const config = await this.gateway.load();
    return this.withProviderDefaults(config ?? {});
  }

  async save(config: Partial<AiGraphProviderConfig>): Promise<AiGraphProviderConfig> {
    const resolvedConfig = this.withProviderDefaults(config);
    await this.gateway.save(resolvedConfig);
    return resolvedConfig;
  }

  async testConnection(
    config: Partial<AiGraphProviderConfig>
  ): Promise<AiGraphProviderConnectionResult> {
    return this.gateway.testConnection(this.withProviderDefaults(config));
  }
}
