import OpenAI from 'openai';
import type { AiGraphProviderConfig } from '../../domain/types/ai-knowledge-graph.types';

export type DashScopeRegion = 'beijing' | 'singapore' | 'virginia';

const DASHSCOPE_BASE_URLS: Record<DashScopeRegion, string> = {
  beijing: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  singapore: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  virginia: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1'
};

export function resolveDashScopeBaseUrl(region: DashScopeRegion = 'beijing'): string {
  return DASHSCOPE_BASE_URLS[region];
}

export function createOpenAICompatibleClient(config: AiGraphProviderConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true
  });
}
