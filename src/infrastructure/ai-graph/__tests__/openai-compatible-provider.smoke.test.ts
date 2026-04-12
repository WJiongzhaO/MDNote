/**
 * 手动运行说明：
 * 1. 将 DashScope API Key 配置到环境变量 DASHSCOPE_API_KEY，或写入 /Users/bytedance/hw/MDNote/.key。
 * 2. 将下方 describe.skip 改为 describe。
 * 3. 运行：npm run test:unit -- src/infrastructure/ai-graph/__tests__/openai-compatible-provider.smoke.test.ts --run
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PROVIDER_CONFIG } from '../../../domain/types/ai-knowledge-graph.types';
import { OpenAICompatibleExtractor } from '../openai-compatible-extractor';
import { createOpenAICompatibleClient } from '../openai-compatible-provider.factory';

const KEY_FILE_PATH = '/Users/bytedance/hw/MDNote/.key';

function loadDashScopeApiKey(): string {
  if (process.env.DASHSCOPE_API_KEY?.trim()) {
    return process.env.DASHSCOPE_API_KEY.trim();
  }

  return readFileSync(KEY_FILE_PATH, 'utf8').trim();
}

function createDashScopeConfig() {
  return {
    ...DEFAULT_PROVIDER_CONFIG,
    apiKey: loadDashScopeApiKey()
  };
}

describe.skip('OpenAI compatible provider smoke tests', () => {
  it('creates a DashScope-compatible OpenAI client', () => {
    const client = createOpenAICompatibleClient(createDashScopeConfig());

    expect(client).toBeDefined();
    expect(client.chat.completions.create).toBeTypeOf('function');
  });

  it('extracts entities and relations end-to-end', async () => {
    const extractor = new OpenAICompatibleExtractor(createDashScopeConfig());

    const result = await extractor.extractEntitiesAndRelations(`
      阿里云总部位于杭州。
      工程师张三在阿里云工作。
      杭州位于中国。
    `);

    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        type: expect.any(String)
      })
    );

    expect(result.relations.length).toBeGreaterThan(0);
    expect(result.relations[0]).toEqual(
      expect.objectContaining({
        source: expect.any(String),
        target: expect.any(String),
        name: expect.any(String),
        type: expect.any(String)
      })
    );
  }, 30_000);

  it('returns a JSON Mode response', async () => {
    const client = createOpenAICompatibleClient(createDashScopeConfig());

    const response = await client.chat.completions.create({
      model: DEFAULT_PROVIDER_CONFIG.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You must return valid JSON only.'
        },
        {
          role: 'user',
          content: 'Return a JSON object with a single field named "status" and value "ok".'
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    expect(typeof content).toBe('string');
    expect(JSON.parse(content ?? '{}')).toEqual({ status: 'ok' });
  }, 30_000);
});
