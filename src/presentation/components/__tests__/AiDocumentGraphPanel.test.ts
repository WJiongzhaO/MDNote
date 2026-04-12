import { mount, shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import AiDocumentGraphPanel from '../AiDocumentGraphPanel.vue';

describe('AiDocumentGraphPanel', () => {
  it('passes AI node primaryAnchor metadata into KnowledgeGraphView graph prop', async () => {
    const aiGraph = {
      nodes: [
        {
          id: 'node-1',
          label: 'Project Atlas',
          type: 'link',
          entityType: 'PROJECT',
          evidenceCount: 2,
          evidence: [{ summary: 'Atlas coordinates delivery milestones.' }],
          primaryAnchor: {
            docId: 'doc-1',
            startOffset: 12,
            endOffset: 26,
            excerpt: 'Project Atlas'
          }
        }
      ],
      edges: []
    };

    const wrapper = shallowMount(AiDocumentGraphPanel, {
      props: {
        documentId: 'doc-1',
        graphService: {
          getDocumentGraphState: vi.fn().mockResolvedValue({ status: 'ready', graph: aiGraph }),
          buildDocumentKnowledgeGraph: vi.fn()
        }
      }
    });

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    const graphView = wrapper.findComponent({ name: 'KnowledgeGraphView' });

    expect(graphView.exists()).toBe(true);

    const graphProp = graphView.props('graph') as {
      nodes: Array<Record<string, unknown>>;
    };
    const aiNode = graphProp.nodes[0];

    expect(aiNode.entityType).toBe('PROJECT');
    expect(aiNode.evidenceCount).toBe(2);
    expect(aiNode.primaryAnchor).toEqual(
      expect.objectContaining({
        startOffset: 12,
        endOffset: 26
      })
    );
    expect(aiNode.occurrences).toEqual([
      expect.objectContaining({
        documentId: 'doc-1',
        start: 12,
        end: 26
      })
    ]);
  });

  it('renders build CTA for not_built state', async () => {
    const wrapper = mount(AiDocumentGraphPanel, {
      props: {
        documentId: 'doc-1',
        graphService: {
          getDocumentGraphState: vi.fn().mockResolvedValue({ status: 'not_built' }),
          buildDocumentKnowledgeGraph: vi.fn()
        }
      }
    });

    await Promise.resolve();
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
      }
    });

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain('No meaningful graph was extracted');
  });
});
