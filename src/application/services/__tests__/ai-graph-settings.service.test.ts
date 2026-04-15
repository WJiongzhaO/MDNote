import { describe, expect, it } from 'vitest';
import { AiGraphSettingsService } from '../ai-graph-settings.service';
import { DEFAULT_PROVIDER_CONFIG } from '../../../domain/types/ai-knowledge-graph.types';
import type {
  AiGraphProviderConnectionResult,
  AiGraphProviderGateway
} from '../../../domain/services/ai-graph-provider.service';
import { PROVIDER_PRESETS } from '../../../infrastructure/ai-graph/provider-presets';
import { normalizeProviderConnectionError } from '../../../infrastructure/ai-graph/openai-compatible-provider.factory';

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
  it('rejects save when a required API key is missing', async () => {
    const service = new AiGraphSettingsService({
      load: async () => null,
      save: async () => undefined,
      testConnection: async () => ({ success: true })
    });

    await expect(
      service.save({ providerName: 'openai', apiKey: '', model: 'gpt-4o-mini' })
    ).rejects.toThrow('API key is required for provider "openai".');
  });

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

  it('maps invalid api key provider errors to a readable message', () => {
    const error = {
      status: 401,
      message: 'Incorrect API key provided: sk-test'
    };

    expect(normalizeProviderConnectionError(error)).toBe('API Key 无效，请检查后重试。');
  });

  it('maps rate limit provider errors to a readable message', () => {
    const error = {
      status: 429,
      message: 'Rate limit exceeded'
    };

    expect(normalizeProviderConnectionError(error)).toBe('请求过于频繁，请稍后再试。');
  });
});
