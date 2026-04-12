import { describe, expect, it } from 'vitest';
import { AiGraphSettingsService } from '../ai-graph-settings.service';
import { DEFAULT_PROVIDER_CONFIG } from '../../../domain/types/ai-knowledge-graph.types';
import type {
  AiGraphProviderConnectionResult,
  AiGraphProviderGateway
} from '../../../domain/services/ai-graph-provider.service';
import { PROVIDER_PRESETS } from '../../../infrastructure/ai-graph/provider-presets';

function createGateway(): AiGraphProviderGateway {
  return {
    async load() {
      return null;
    },
    async save() {
      return undefined;
    },
    async testConnection(): Promise<AiGraphProviderConnectionResult> {
      return { success: true };
    }
  };
}

describe('AiGraphSettingsService', () => {
  it('exposes the default DashScope provider config', () => {
    expect(DEFAULT_PROVIDER_CONFIG).toEqual({
      providerName: 'dashscope',
      apiKey: '',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen3.6-plus',
      temperature: 0.1,
      maxTokens: 4096
    });
  });

  it('fills missing values with DashScope defaults', () => {
    const service = new AiGraphSettingsService(createGateway());

    expect(
      service.withProviderDefaults({
        apiKey: 'sk-test'
      })
    ).toEqual({
      ...DEFAULT_PROVIDER_CONFIG,
      apiKey: 'sk-test'
    });
  });

  it('exposes provider preset metadata', () => {
    expect(Object.keys(PROVIDER_PRESETS)).toHaveLength(5);
    expect(PROVIDER_PRESETS.dashscope).toMatchObject({
      providerName: 'dashscope',
      displayName: '阿里云百炼 (DashScope)',
      isDefault: true,
      defaultBaseUrl: DEFAULT_PROVIDER_CONFIG.baseUrl,
      defaultModel: DEFAULT_PROVIDER_CONFIG.model
    });
  });

  it('throws when a custom provider is missing a model', () => {
    const service = new AiGraphSettingsService(createGateway());

    expect(() =>
      service.withProviderDefaults({
        providerName: 'custom',
        apiKey: 'sk-test',
        baseUrl: 'https://example.com/v1'
      })
    ).toThrow(/model/i);
  });
});
