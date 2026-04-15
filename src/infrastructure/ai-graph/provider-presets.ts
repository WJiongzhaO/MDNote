import type { AiGraphProviderName } from '../../domain/types/ai-knowledge-graph.types';
import { DEFAULT_PROVIDER_CONFIG } from '../../domain/types/ai-knowledge-graph.types';
import { resolveDashScopeBaseUrl } from './openai-compatible-provider.factory';

export type PresetProviderName = Exclude<AiGraphProviderName, 'custom'>;

export interface ProviderPreset {
  providerName: PresetProviderName;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  isDefault?: boolean;
}

export const PROVIDER_PRESETS: Record<PresetProviderName, ProviderPreset> = {
  dashscope: {
    providerName: 'dashscope',
    displayName: '阿里云百炼 (DashScope)',
    defaultBaseUrl: resolveDashScopeBaseUrl(),
    defaultModel: DEFAULT_PROVIDER_CONFIG.model,
    requiresApiKey: true,
    isDefault: true
  },
  deepseek: {
    providerName: 'deepseek',
    displayName: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    requiresApiKey: true
  },
  volcengine: {
    providerName: 'volcengine',
    displayName: '火山引擎方舟 (Volcengine)',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'ep-your-model-id',
    requiresApiKey: true
  },
  openai: {
    providerName: 'openai',
    displayName: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    requiresApiKey: true
  },
  ollama: {
    providerName: 'ollama',
    displayName: 'Ollama',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',
    requiresApiKey: false
  }
};
