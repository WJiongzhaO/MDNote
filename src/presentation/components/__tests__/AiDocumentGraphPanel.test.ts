import { mount, shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import AiDocumentGraphPanel from '../AiDocumentGraphPanel.vue';
import MarkdownEditor from '../MarkdownEditor.vue';

vi.mock('../../../core/application', () => ({
  Application: {
    getInstance: () => ({
      getApplicationService: () => ({
        getAiDocumentGraphService: () => ({
          getDocumentGraphState: vi.fn().mockResolvedValue({ status: 'not_built' }),
          buildDocumentKnowledgeGraph: vi.fn()
        }),
        initialize: vi.fn().mockResolvedValue(undefined)
      }),
      getKnowledgeFragmentUseCases: vi.fn()
    })
  }
}));

vi.mock('../../composables/useShortcutManager', () => ({
  useEditorShortcuts: vi.fn(() => ({
    initialize: vi.fn(),
    setContext: vi.fn()
  }))
}));

vi.mock('../KnowledgeGraphView.vue', () => ({
  default: {
    name: 'KnowledgeGraphView',
    props: ['graph'],
    template: '<div class="knowledge-graph-view-stub"></div>'
  }
}));

function createMarkdownEditorMountOptions() {
  return {
    props: {
      document: {
        id: 'doc-1',
        title: 'Doc 1',
        content: '# Demo',
        folderId: 'folder-1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      renderMarkdown: vi.fn().mockResolvedValue('<p>Demo</p>')
    },
    global: {
      provide: {
        diContainer: {
          get: vi.fn(() => ({
            initialize: vi.fn().mockResolvedValue(undefined),
            setEditorContext: vi.fn(),
            setContext: vi.fn(),
            startListening: vi.fn(),
            getAll: vi.fn(() => [])
          }))
        }
      },
      stubs: {
        EditorToolbar: true,
        FragmentRecommendationPanel: true,
        MermaidEditor: true,
        FormulaEditor: true,
        ExportConfigModal: true,
        ExportProgressModal: true,
        KnowledgeGraphView: true
      }
    }
  };
}

async function openKnowledgeGraphFromToolbar(wrapper: any) {
  wrapper.getComponent({ name: 'EditorToolbar' }).vm.$emit('open-knowledge-graph');

  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

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

  it('renders AiDocumentGraphPanel as the primary document graph surface', async () => {
    const wrapper = shallowMount(MarkdownEditor, createMarkdownEditorMountOptions());

    await openKnowledgeGraphFromToolbar(wrapper);

    expect(wrapper.findComponent({ name: 'AiDocumentGraphPanel' }).exists()).toBe(true);
  });

  it('renders the NotBuilt CTA instead of a legacy graph result when no AI graph has been built', async () => {
    const wrapper = mount(MarkdownEditor, createMarkdownEditorMountOptions());

    await openKnowledgeGraphFromToolbar(wrapper);

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

  it('re-emits jump events from KnowledgeGraphView', async () => {
    const wrapper = mount(AiDocumentGraphPanel, {
      props: {
        documentId: 'doc-1',
        graphService: {
          getDocumentGraphState: vi.fn().mockResolvedValue({
            status: 'ready',
            graph: {
              nodes: [
                {
                  id: 'node-1',
                  label: 'Atlas',
                  entityType: 'PROJECT',
                  evidenceCount: 1,
                  evidencePreview: [],
                  primaryAnchor: {
                    anchorId: 'anchor-1',
                    docId: 'doc-1',
                    chunkId: 'chunk-1',
                    startOffset: 1,
                    endOffset: 5,
                    anchorType: 'range'
                  }
                }
              ],
              edges: []
            }
          }),
          buildDocumentKnowledgeGraph: vi.fn()
        }
      }
    });

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    const graphView = wrapper.getComponent({ name: 'KnowledgeGraphView' });

    graphView.vm.$emit('jump-to', { documentId: 'doc-2', start: 3, end: 9 });
    graphView.vm.$emit('jump-to-fragment', { fragmentId: 'frag-1' });

    expect(wrapper.emitted('jump-to')).toEqual([[{ documentId: 'doc-2', start: 3, end: 9 }]]);
    expect(wrapper.emitted('jump-to-fragment')).toEqual([[{ fragmentId: 'frag-1' }]]);
  });
});
