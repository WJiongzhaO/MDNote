import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useEditorToolbar } from '../useEditorToolbar';
import { EditorToolbarUseCase } from '@/application/usecases/editor/editor-toolbar.usecase';
import { TYPES } from '@/core/container/container.types';
import EditorToolbar from '@/presentation/components/editor/toolbar/EditorToolbar.vue';

vi.mock('../useInjection', () => ({
  useInjection: vi.fn((token) => {
    if (token === TYPES.EditorToolbarUseCase) {
      const useCase = new EditorToolbarUseCase(vi.fn() as any, vi.fn() as any);

      useCase.applyFormat = vi.fn((request: any, type: string) => {
        if (!request?.selection) {
          throw new Error('missing selection');
        }

        switch (type) {
          case 'bold':
            return {
              content:
                request.content.slice(0, request.selection.start) +
                `**${request.selection.text}**` +
                request.content.slice(request.selection.end),
              newCursorPosition: request.selection.start + request.selection.text.length + 4,
            };
          case 'italic':
            return {
              content:
                request.content.slice(0, request.selection.start) +
                `*${request.selection.text}*` +
                request.content.slice(request.selection.end),
              newCursorPosition: request.selection.start + request.selection.text.length + 2,
            };
          case 'heading': {
            const level = request.data?.level ?? 1;
            return {
              content: `${'#'.repeat(level)} ${request.content}`,
              newCursorPosition: request.content.length + level + 1,
            };
          }
          default:
            throw new Error(`Unsupported format: ${type}`);
        }
      });

      useCase.insertContent = vi.fn((request: any, type: string) => {
        switch (type) {
          case 'link':
            return { content: `${request.content}[link](https://)`, newCursorPosition: request.content.length + 16 };
          case 'ul':
            return { content: `${request.content}\n- item\n`, newCursorPosition: request.content.length + 8 };
          default:
            throw new Error(`Unsupported insert: ${type}`);
        }
      });

      return useCase;
    }

    return null;
  })
}));

describe('useEditorToolbar Composable', () => {
  const createEditor = (html = 'hello world') => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.innerHTML = html;
    document.body.appendChild(editor);
    return editor;
  };

  const clearSelection = () => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
  };

  const selectTextInEditor = (editor: HTMLDivElement, start: number, end: number) => {
    const textNode = editor.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error('editor firstChild is not a text node');
    }

    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Selection unavailable');
    }

    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
  };

  const selectNodeContents = (node: Node) => {
    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Selection unavailable');
    }

    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
  };

  const mountToolbarHost = (options?: { editor?: HTMLDivElement | null; content?: string }) => {
    const editorRef = ref<HTMLDivElement | null>(options?.editor ?? null);
    const contentRef = ref(options?.content ?? 'hello world');
    let api!: ReturnType<typeof useEditorToolbar>;

    const Host = defineComponent({
      setup() {
        api = useEditorToolbar(editorRef, contentRef);
        return () => h('div');
      }
    });

    const wrapper = mount(Host);
    return { wrapper, editorRef, contentRef, api };
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    clearSelection();
  });

  afterEach(() => {
    clearSelection();
    vi.restoreAllMocks();
  });

  describe('初始化', () => {
    it('应该初始化响应式状态', () => {
      const { wrapper, api } = mountToolbarHost({ content: 'test content' });

      expect(api.isActive).toBeDefined();
      expect(api.blockType).toBeDefined();
      expect(api.hasSelection).toBeDefined();
      expect(api.selectionText).toBeDefined();
      expect(api.hasSelection.value).toBe(false);
      expect(api.selectionText.value).toBe('');

      wrapper.unmount();
    });

    it('应该提供必要的方法', () => {
      const { wrapper, api } = mountToolbarHost({ content: 'test content' });

      expect(api.applyFormat).toBeDefined();
      expect(api.insertContent).toBeDefined();
      expect(api.updateSelectionState).toBeDefined();
      expect(api.getCursorPosition).toBeDefined();

      wrapper.unmount();
    });
  });

  describe('格式检测', () => {
    it('应该检测加粗格式', () => {
      const editor = createEditor('<strong>bold text</strong>');
      const { wrapper, api } = mountToolbarHost({ editor, content: 'bold text' });

      selectNodeContents(editor.firstChild!);
      api.updateSelectionState();

      expect(api.isActive.bold).toBe(true);
      wrapper.unmount();
    });

    it('应该检测斜体格式', () => {
      const editor = createEditor('<em>italic text</em>');
      const { wrapper, api } = mountToolbarHost({ editor, content: 'italic text' });

      selectNodeContents(editor.firstChild!);
      api.updateSelectionState();

      expect(api.isActive.italic).toBe(true);
      wrapper.unmount();
    });

    it('应该检测删除线格式', () => {
      const editor = createEditor('<s>strikethrough</s>');
      const { wrapper, api } = mountToolbarHost({ editor, content: 'strikethrough' });

      selectNodeContents(editor.firstChild!);
      api.updateSelectionState();

      expect(api.isActive.strikethrough).toBe(true);
      wrapper.unmount();
    });

    it('应该检测代码格式', () => {
      const editor = createEditor('<code>code</code>');
      const { wrapper, api } = mountToolbarHost({ editor, content: 'code' });

      selectNodeContents(editor.firstChild!);
      api.updateSelectionState();

      expect(api.isActive.code).toBe(true);
      wrapper.unmount();
    });

    it('应该检测块级元素类型', () => {
      const editor = createEditor('<h1>Heading</h1>');
      const { wrapper, api } = mountToolbarHost({ editor, content: 'Heading' });

      selectNodeContents(editor.firstChild!);
      api.updateSelectionState();

      expect(api.blockType.value).toBe('h1');
      wrapper.unmount();
    });

    it('应该默认检测段落类型', () => {
      const editor = createEditor('<p>Paragraph</p>');
      const { wrapper, api } = mountToolbarHost({ editor, content: 'Paragraph' });

      selectNodeContents(editor.firstChild!);
      api.updateSelectionState();

      expect(api.blockType.value).toBe('p');
      wrapper.unmount();
    });
  });

  describe('格式化应用', () => {
    it('应该应用加粗格式', async () => {
      const editor = createEditor('hello world');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'hello world' });

      selectTextInEditor(editor, 0, 5);
      api.updateSelectionState();
      await api.applyFormat('bold');

      expect(contentRef.value).toBe('**hello** world');
      wrapper.unmount();
    });

    it('应该应用斜体格式', async () => {
      const editor = createEditor('hello world');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'hello world' });

      selectTextInEditor(editor, 0, 5);
      api.updateSelectionState();
      await api.applyFormat('italic');

      expect(contentRef.value).toBe('*hello* world');
      wrapper.unmount();
    });

    it('应该应用标题格式', async () => {
      const editor = createEditor('hello world');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'hello world' });

      selectTextInEditor(editor, 0, 5);
      api.updateSelectionState();
      await api.applyFormat('heading', { level: 2 });

      expect(contentRef.value).toBe('## hello world');
      wrapper.unmount();
    });
  });

  describe('内容插入', () => {
    it('应该插入链接', async () => {
      const editor = createEditor('test content');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'test content' });

      await api.insertContent('link');

      expect(contentRef.value).toContain('[link](https://)');
      wrapper.unmount();
    });

    it('应该插入无序列表', async () => {
      const editor = createEditor('test content');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'test content' });

      await api.insertContent('ul');

      expect(contentRef.value).toContain('- item');
      wrapper.unmount();
    });
  });

  describe('光标位置计算', () => {
    it('应该获取光标位置', () => {
      const editor = createEditor('test content');
      const { wrapper, api } = mountToolbarHost({ editor, content: 'test content' });

      selectTextInEditor(editor, 2, 4);
      const position = api.getCursorPosition();

      expect(position).toEqual({ start: 2, end: 4 });
      wrapper.unmount();
    });

    it('应该处理无选区的情况', () => {
      const editor = createEditor('test content');
      const { wrapper, api } = mountToolbarHost({ editor, content: 'test content' });

      clearSelection();
      const position = api.getCursorPosition();

      expect(position.start).toBe('test content'.length);
      expect(position.end).toBe('test content'.length);
      wrapper.unmount();
    });
  });

  describe('状态重置', () => {
    it('应该在选区移出编辑器时重置状态', () => {
      const editor = createEditor('<strong>selected</strong>');
      const { wrapper, api } = mountToolbarHost({ editor, content: 'selected' });

      selectNodeContents(editor.firstChild!);
      api.updateSelectionState();
      expect(api.hasSelection.value).toBe(true);

      clearSelection();
      api.updateSelectionState();

      expect(api.hasSelection.value).toBe(false);
      expect(api.selectionText.value).toBe('');
      expect(api.isActive.bold).toBe(false);
      wrapper.unmount();
    });
  });

  describe('响应式行为', () => {
    it('应该响应编辑器引用变化', () => {
      const { wrapper, api, editorRef } = mountToolbarHost({ editor: null, content: 'test content' });

      expect(api.getCursorPosition()).toEqual({ start: 0, end: 0 });

      editorRef.value = createEditor('test content');
      expect(api.getCursorPosition()).toBeDefined();
      wrapper.unmount();
    });

    it('应该在内容变化后基于新内容执行格式化', async () => {
      const editor = createEditor('updated content');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'initial content' });

      contentRef.value = 'updated content';
      editor.textContent = 'updated content';
      selectTextInEditor(editor, 0, 7);
      api.updateSelectionState();
      await api.applyFormat('bold');

      expect(contentRef.value).toBe('**updated** content');
      wrapper.unmount();
    });
  });

  describe('错误处理', () => {
    it('应该处理格式化错误', async () => {
      const editor = createEditor('test content');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'test content' });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      selectTextInEditor(editor, 0, 4);
      api.updateSelectionState();
      await api.applyFormat('invalid' as any);

      expect(consoleSpy).toHaveBeenCalled();
      expect(contentRef.value).toBe('test content');
      wrapper.unmount();
    });

    it('应该处理插入错误', async () => {
      const editor = createEditor('test content');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'test content' });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await api.insertContent('invalid' as any);

      expect(consoleSpy).toHaveBeenCalled();
      expect(contentRef.value).toBe('test content');
      wrapper.unmount();
    });
  });

  describe('边缘情况', () => {
    it('应该处理空编辑器', () => {
      const { wrapper, api } = mountToolbarHost({ editor: null, content: '' });

      expect(api.getCursorPosition()).toEqual({ start: 0, end: 0 });
      wrapper.unmount();
    });

    it('应该处理空内容', () => {
      const editor = createEditor('');
      const { wrapper, api } = mountToolbarHost({ editor, content: '' });

      expect(() => api.updateSelectionState()).not.toThrow();
      wrapper.unmount();
    });

    it('应该处理包含特殊字符的内容', () => {
      const editor = createEditor('你好🌍世界\n\t\r');
      const { wrapper, api } = mountToolbarHost({ editor, content: '你好🌍世界\n\t\r' });

      expect(() => api.updateSelectionState()).not.toThrow();
      wrapper.unmount();
    });

    it('应该处理超长内容', () => {
      const longText = 'a'.repeat(100000);
      const editor = createEditor(longText);
      const { wrapper, api } = mountToolbarHost({ editor, content: longText });

      expect(() => api.updateSelectionState()).not.toThrow();
      wrapper.unmount();
    });
  });

  describe('生命周期', () => {
    it('应该在挂载时添加选区监听器', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const { wrapper } = mountToolbarHost({ content: 'test' });

      expect(addEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function));
      wrapper.unmount();
    });
  });

  describe('toolbar graph 入口兼容性', () => {
    it('应该保留并触发 open-knowledge-graph 事件', async () => {
      const host = defineComponent({
        components: { EditorToolbar },
        setup() {
          const editor = ref<HTMLDivElement | null>(document.createElement('div'));
          const content = ref('test content');
          return { editor, content };
        },
        render() {
          return h(EditorToolbar, {
            editor: this.editor,
            content: this.content,
            onOpenKnowledgeGraph: (...args: unknown[]) => this.$emit('open-knowledge-graph', ...args),
          });
        }
      });

      const wrapper = mount(host);
      const graphButton = wrapper.find('button[title="知识图谱"]');

      expect(graphButton.exists()).toBe(true);
      await graphButton.trigger('click');
      expect(wrapper.emitted('open-knowledge-graph')).toHaveLength(1);
    });
  });

  describe('集成场景', () => {
    it('应该完整执行格式化流程', async () => {
      const editor = createEditor('hello world');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'hello world' });

      selectTextInEditor(editor, 0, 5);
      api.updateSelectionState();
      await api.applyFormat('bold');

      expect(contentRef.value).toBe('**hello** world');
      wrapper.unmount();
    });

    it('应该处理多次格式化操作', async () => {
      const editor = createEditor('text');
      const { wrapper, api, contentRef } = mountToolbarHost({ editor, content: 'text' });

      selectTextInEditor(editor, 0, 4);
      api.updateSelectionState();
      await api.applyFormat('bold');
      const afterBold = contentRef.value;

      editor.textContent = afterBold;
      await nextTick();
      selectTextInEditor(editor, 0, afterBold.length);
      api.updateSelectionState();
      await api.applyFormat('italic');
      const afterItalic = contentRef.value;

      expect(afterBold).not.toBe(afterItalic);
      expect(afterItalic).toContain('*');
      wrapper.unmount();
    });
  });
});
