import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import AiDocumentGraphPanel from '../AiDocumentGraphPanel.vue';

describe('AiDocumentGraphPanel', () => {
  it('renders build CTA for not_built state', async () => {
    const wrapper = mount(AiDocumentGraphPanel, {
      props: {
        documentId: 'doc-1',
        graphService: {
          getDocumentGraphState: vi.fn().mockResolvedValue({ status: 'not_built' }),
          buildDocumentKnowledgeGraph: vi.fn()
        }
      },
      global: {
        stubs: {
          KnowledgeGraphView: true
        }
      }
    });

    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain('Build Knowledge Graph');
  });

  it('renders explicit empty-result message for ready_empty state', async () => {
    const wrapper = mount(AiDocumentGraphPanel, {
      props: {
        documentId: 'doc-1',
        graphService: {
          getDocumentGraphState: vi.fn().mockResolvedValue({
            status: 'ready_empty',
            graph: { nodes: [], edges: [] }
          }),
          buildDocumentKnowledgeGraph: vi.fn()
        }
      },
      global: {
        stubs: {
          KnowledgeGraphView: true
        }
      }
    });

    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain('No meaningful graph was extracted');
  });
});
