import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AiGraphProviderSettings from '../AiGraphProviderSettings.vue';

describe('AiGraphProviderSettings', () => {
  it('renders provider, api key, model, and base url fields', () => {
    const wrapper = mount(AiGraphProviderSettings, {
      props: {
        service: {
          load: vi.fn(),
          save: vi.fn(),
          testConnection: vi.fn()
        }
      }
    });

    expect(wrapper.text()).toContain('Provider');
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.find('input[name="model"]').exists()).toBe(true);
    expect(wrapper.find('input[name="baseUrl"]').exists()).toBe(true);
  });
});
