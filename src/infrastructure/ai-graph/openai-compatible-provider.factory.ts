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

function readErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }

  return '';
}

export function normalizeProviderConnectionError(error: unknown): string {
  const status = readErrorStatus(error);
  const message = readErrorMessage(error).toLowerCase();

  if (status === 401 || message.includes('incorrect api key') || message.includes('invalid api key')) {
    return 'API Key 无效，请检查后重试。';
  }

  if (status === 429 || message.includes('rate limit')) {
    return '请求过于频繁，请稍后再试。';
  }

  return '连接 AI Provider 失败，请检查网络或配置后重试。';
}

export function createOpenAICompatibleClient(config: AiGraphProviderConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true
  });
}
