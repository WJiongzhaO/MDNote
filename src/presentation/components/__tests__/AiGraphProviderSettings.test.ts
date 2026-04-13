import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AiGraphProviderSettings from '../AiGraphProviderSettings.vue';

function createService(overrides: Partial<{
  load: () => Promise<unknown>;
  save: (config: unknown) => Promise<void>;
  testConnection: (config: unknown) => Promise<{ success: boolean; message?: string }>;
}> = {}) {
  return {
    load: vi.fn().mockResolvedValue({
      providerName: 'dashscope',
      apiKey: 'sk-test',
      model: 'qwen3.6-plus',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    }),
    save: vi.fn().mockResolvedValue(undefined),
    testConnection: vi.fn().mockResolvedValue({ success: true, message: '连接测试成功' }),
    ...overrides
  };
}

async function flushForm() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

describe('AiGraphProviderSettings', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the titled settings form with helper copy and action buttons', async () => {
    const wrapper = mount(AiGraphProviderSettings, {
      props: { service: createService() }
    });

    await flushForm();

    expect(wrapper.text()).toContain('模型设置');
    expect(wrapper.text()).toContain('配置用于 AI 知识图谱构建的服务商、模型和连接地址。');
    expect(wrapper.find('select[name="provider"]').exists()).toBe(true);
    expect(wrapper.find('input[name="model"]').exists()).toBe(true);
    expect(wrapper.find('input[name="baseUrl"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="ai-graph-test-button"]').text()).toContain('测试连接');
    expect(wrapper.get('[data-testid="ai-graph-save-button"]').text()).toContain('保存设置');
  });

  it('shows a success notice after a successful connection test', async () => {
    vi.useFakeTimers();
    const service = createService();
    const wrapper = mount(AiGraphProviderSettings, {
      props: { service }
    });

    await flushForm();

    await wrapper.get('[data-testid="ai-graph-test-button"]').trigger('click');
    expect(wrapper.get('[data-testid="ai-graph-test-button"]').text()).toContain('测试连接中...');

    await flushForm();

    expect(service.testConnection).toHaveBeenCalledWith(
      expect.objectContaining({ providerName: 'dashscope', model: 'qwen3.6-plus' })
    );
    expect(wrapper.get('[data-testid="ai-graph-feedback"]').text()).toContain('连接测试成功');

    vi.advanceTimersByTime(2500);
    await nextTick();

    expect(wrapper.find('[data-testid="ai-graph-feedback"]').exists()).toBe(false);
  });

  it('shows an error banner and api key field error after a failed connection test', async () => {
    const service = createService({
      testConnection: vi.fn().mockRejectedValue(new Error('API key is required for provider "openai".'))
    });
    const wrapper = mount(AiGraphProviderSettings, {
      props: { service }
    });

    await flushForm();
    await wrapper.get('select[name="provider"]').setValue('openai');
    await wrapper.get('input[name="apiKey"]').setValue('');

    await wrapper.get('[data-testid="ai-graph-test-button"]').trigger('click');
    await flushForm();

    expect(wrapper.get('[data-testid="ai-graph-feedback"]').classes()).toContain('is-error');
    expect(wrapper.text()).toContain('连接测试失败，请检查配置后重试');
    expect(wrapper.get('[data-testid="ai-graph-error-apiKey"]').text()).toContain('请输入有效的 API Key');
  });
});
