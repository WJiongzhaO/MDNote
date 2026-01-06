import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, computed } from 'vue';
import { useEditorToolbar } from '../useEditorToolbar';
import { EditorToolbarUseCase } from '@/application/usecases/editor/editor-toolbar.usecase';
import { TYPES } from '@/core/container/container.types';

// Mock the DI container
vi.mock('../useInjection', () => ({
  useInjection: vi.fn((token) => {
    if (token === TYPES.EditorToolbarUseCase) {
      const useCase = new EditorToolbarUseCase(
        vi.fn() as any,
        vi.fn() as any
      );
      // 添加真实的实现方法用于测试
      useCase.applyFormat = vi.fn((request: any, type: string) => {
        const mockResults: Record<string, any> = {
          bold: { content: '**' + request.selection.text + '**', newCursorPosition: 10 },
          italic: { content: '*' + request.selection.text + '*', newCursorPosition: 8 },
          heading: { content: '# ' + request.content, newCursorPosition: request.content.length + 2 },
        };
        return mockResults[type] || { content: request.content, newCursorPosition: 0 };
      });
      useCase.insertContent = vi.fn((request: any, type: string) => {
        const mockResults: Record<string, any> = {
          link: { content: '[link](https://)', newCursorPosition: 16 },
          ul: { content: '\n- item\n', newCursorPosition: 8 },
        };
        return mockResults[type] || { content: request.content, newCursorPosition: 0 };
      });
      return useCase;
    }
    return null;
  })
}));

describe('useEditorToolbar Composable', () => {
  // 创建模拟的编辑器元素
  const createMockEditor = () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.innerHTML = 'hello world';
    document.body.appendChild(editor);
    return editor;
  };

  // 创建模拟的选区
  const createMockSelection = (text: string, startOffset = 0, endOffset = text.length) => {
    const range = document.createRange();
    const selection = window.getSelection();

    if (!selection) {
      throw new Error('Selection not available');
    }

    // 简化的选区创建（实际测试中可能需要更复杂的DOM结构）
    const textNode = document.createTextNode(text);
    range.setStart(textNode, startOffset);
    range.setEnd(textNode, endOffset);

    selection.removeAllRanges();
    selection.addRange(range);

    return { range, selection };
  };

  beforeEach(() => {
    // 清理DOM
    document.body.innerHTML = '';
  });

  describe('初始化', () => {
    it('应该初始化响应式状态', () => {
      const editorRef = ref(null);
      const contentRef = ref('test content');

      const { isActive, blockType, hasSelection, selectionText } = useEditorToolbar(
        editorRef,
        contentRef
      );

      // 验证状态存在
      expect(isActive).toBeDefined();
      expect(blockType).toBeDefined();
      expect(hasSelection).toBeDefined();
      expect(selectionText).toBeDefined();

      // 验证初始值
      expect(hasSelection.value).toBe(false);
      expect(selectionText.value).toBe('');
    });

    it('应该提供必要的方法', () => {
      const editorRef = ref(null);
      const contentRef = ref('test content');

      const { applyFormat, insertContent, updateSelectionState, getCursorPosition } = useEditorToolbar(
        editorRef,
        contentRef
      );

      expect(applyFormat).toBeDefined();
      expect(insertContent).toBeDefined();
      expect(updateSelectionState).toBeDefined();
      expect(getCursorPosition).toBeDefined();
    });
  });

  describe('格式检测', () => {
    it('应该检测加粗格式', () => {
      const editor = createMockEditor();
      editor.innerHTML = '<strong>bold text</strong>';
      const editorRef = ref(editor);
      const contentRef = ref('bold text');

      const { isActive, updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      // 创建选区并更新状态
      const range = document.createRange();
      const selection = window.getSelection();
      if (selection && editor.firstChild) {
        range.selectNodeContents(editor.firstChild);
        selection.removeAllRanges();
        selection.addRange(range);

        updateSelectionState();

        expect(isActive.bold.value).toBe(true);
      }
    });

    it('应该检测斜体格式', () => {
      const editor = createMockEditor();
      editor.innerHTML = '<em>italic text</em>';
      const editorRef = ref(editor);
      const contentRef = ref('italic text');

      const { isActive, updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      const range = document.createRange();
      const selection = window.getSelection();
      if (selection && editor.firstChild) {
        range.selectNodeContents(editor.firstChild);
        selection.removeAllRanges();
        selection.addRange(range);

        updateSelectionState();

        expect(isActive.italic.value).toBe(true);
      }
    });

    it('应该检测删除线格式', () => {
      const editor = createMockEditor();
      editor.innerHTML = '<s>strikethrough</s>';
      const editorRef = ref(editor);
      const contentRef = ref('strikethrough');

      const { isActive, updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      const range = document.createRange();
      const selection = window.getSelection();
      if (selection && editor.firstChild) {
        range.selectNodeContents(editor.firstChild);
        selection.removeAllRanges();
        selection.addRange(range);

        updateSelectionState();

        expect(isActive.strikethrough.value).toBe(true);
      }
    });

    it('应该检测代码格式', () => {
      const editor = createMockEditor();
      editor.innerHTML = '<code>code</code>';
      const editorRef = ref(editor);
      const contentRef = ref('code');

      const { isActive, updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      const range = document.createRange();
      const selection = window.getSelection();
      if (selection && editor.firstChild) {
        range.selectNodeContents(editor.firstChild);
        selection.removeAllRanges();
        selection.addRange(range);

        updateSelectionState();

        expect(isActive.code.value).toBe(true);
      }
    });

    it('应该检测块级元素类型', () => {
      const editor = createMockEditor();
      editor.innerHTML = '<h1>Heading</h1>';
      const editorRef = ref(editor);
      const contentRef = ref('Heading');

      const { blockType, updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      const range = document.createRange();
      const selection = window.getSelection();
      if (selection && editor.firstChild) {
        range.selectNodeContents(editor.firstChild);
        selection.removeAllRanges();
        selection.addRange(range);

        updateSelectionState();

        expect(blockType.value).toBe('h1');
      }
    });

    it('应该默认检测段落类型', () => {
      const editor = createMockEditor();
      editor.innerHTML = '<p>Paragraph</p>';
      const editorRef = ref(editor);
      const contentRef = ref('Paragraph');

      const { blockType, updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      const range = document.createRange();
      const selection = window.getSelection();
      if (selection && editor.firstChild) {
        range.selectNodeContents(editor.firstChild);
        selection.removeAllRanges();
        selection.addRange(range);

        updateSelectionState();

        expect(blockType.value).toBe('p');
      }
    });
  });

  describe('格式化应用', () => {
    it('应该应用加粗格式', async () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('hello world');

      const { applyFormat } = useEditorToolbar(editorRef, contentRef);

      // 创建选区
      const range = document.createRange();
      const selection = window.getSelection();
      if (selection) {
        const textNode = editor.firstChild || document.createTextNode('hello world');
        range.setStart(textNode, 0);
        range.setEnd(textNode, 5);
        selection.removeAllRanges();
        selection.addRange(range);

        await applyFormat('bold');

        // 验证内容被更新
        expect(contentRef.value).toContain('**');
      }
    });

    it('应该应用斜体格式', async () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('hello world');

      const { applyFormat } = useEditorToolbar(editorRef, contentRef);

      await applyFormat('italic');

      expect(contentRef.value).toContain('*');
    });

    it('应该应用标题格式', async () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('hello world');

      const { applyFormat } = useEditorToolbar(editorRef, contentRef);

      await applyFormat('heading', { level: 2 });

      expect(contentRef.value).toContain('##');
    });
  });

  describe('内容插入', () => {
    it('应该插入链接', async () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('test content');

      const { insertContent } = useEditorToolbar(editorRef, contentRef);

      await insertContent('link');

      expect(contentRef.value).toContain('[');
      expect(contentRef.value).toContain(']');
      expect(contentRef.value).toContain('(');
      expect(contentRef.value).toContain(')');
    });

    it('应该插入无序列表', async () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('test content');

      const { insertContent } = useEditorToolbar(editorRef, contentRef);

      await insertContent('ul');

      expect(contentRef.value).toContain('-');
    });
  });

  describe('光标位置计算', () => {
    it('应该获取光标位置', () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('test content');

      const { getCursorPosition } = useEditorToolbar(editorRef, contentRef);

      const position = getCursorPosition();

      expect(position).toBeDefined();
      expect(typeof position.start).toBe('number');
      expect(typeof position.end).toBe('number');
    });

    it('应该处理无选区的情况', () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('test content');

      // 清除选区
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      const { getCursorPosition } = useEditorToolbar(editorRef, contentRef);

      const position = getCursorPosition();

      expect(position.start).toBe(0);
      expect(position.end).toBe(0);
    });
  });

  describe('状态重置', () => {
    it('应该在选区移出编辑器时重置状态', () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('test content');

      const { hasSelection, selectionText, isActive, updateSelectionState } = useEditorToolbar(
        editorRef,
        contentRef
      );

      // 设置初始状态
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        const textNode = document.createTextNode('selected');
        range.selectNodeContents(textNode);

        selection.removeAllRanges();
        selection.addRange(range);
      }

      updateSelectionState();

      // 清除选区
      if (selection) {
        selection.removeAllRanges();
      }

      updateSelectionState();

      expect(hasSelection.value).toBe(false);
      expect(selectionText.value).toBe('');
      expect(isActive.bold.value).toBe(false);
    });
  });

  describe('响应式行为', () => {
    it('应该响应编辑器引用变化', () => {
      const editorRef = ref<HTMLDivElement | null>(null);
      const contentRef = ref('test content');

      const { getCursorPosition } = useEditorToolbar(editorRef, contentRef);

      // 初始状态
      let position = getCursorPosition();
      expect(position.start).toBe(0);

      // 更新编辑器引用
      const editor = createMockEditor();
      editorRef.value = editor;

      position = getCursorPosition();
      expect(position).toBeDefined();
    });

    it('应该响应内容变化', () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('initial content');

      const { applyFormat } = useEditorToolbar(editorRef, contentRef);

      const initialContent = contentRef.value;

      applyFormat('bold');

      // 内容应该被修改
      expect(contentRef.value).not.toBe(initialContent);
    });
  });

  describe('错误处理', () => {
    it('应该处理格式化错误', async () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('test content');

      const { applyFormat } = useEditorToolbar(editorRef, contentRef);

      // Mock console.error to avoid cluttering test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // 尝试应用无效格式（应该被捕获并记录错误）
      await applyFormat('invalid' as any);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('应该处理插入错误', async () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('test content');

      const { insertContent } = useEditorToolbar(editorRef, contentRef);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await insertContent('invalid' as any);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('边缘情况', () => {
    it('应该处理空编辑器', () => {
      const editorRef = ref<HTMLDivElement | null>(null);
      const contentRef = ref('');

      const { getCursorPosition } = useEditorToolbar(editorRef, contentRef);

      const position = getCursorPosition();

      expect(position.start).toBe(0);
      expect(position.end).toBe(0);
    });

    it('应该处理空内容', () => {
      const editor = createMockEditor();
      editor.innerHTML = '';
      const editorRef = ref(editor);
      const contentRef = ref('');

      const { updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      // 不应该抛出错误
      expect(() => updateSelectionState()).not.toThrow();
    });

    it('应该处理包含特殊字符的内容', () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('你好🌍世界\n\t\r');

      const { updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      expect(() => updateSelectionState()).not.toThrow();
    });

    it('应该处理超长内容', () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const longText = 'a'.repeat(100000);
      const contentRef = ref(longText);

      const { updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      expect(() => updateSelectionState()).not.toThrow();
    });
  });

  describe('生命周期', () => {
    it('应该在挂载时添加选区监听器', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const editorRef = ref(null);
      const contentRef = ref('test');

      useEditorToolbar(editorRef, contentRef);

      expect(addEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    // 注意：在测试环境中验证组件卸载时的清理比较困难，
    // 因为 onUnmounted 钩子需要在组件实际卸载时才会触发
  });

  describe('集成场景', () => {
    it('应该完整执行格式化流程', async () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('hello world');

      const { applyFormat, updateSelectionState } = useEditorToolbar(editorRef, contentRef);

      // 1. 创建选区
      const range = document.createRange();
      const selection = window.getSelection();
      if (selection) {
        const textNode = editor.firstChild || document.createTextNode('hello world');
        range.setStart(textNode, 0);
        range.setEnd(textNode, 5);
        selection.removeAllRanges();
        selection.addRange(range);

        // 2. 更新选区状态
        updateSelectionState();

        // 3. 应用格式
        await applyFormat('bold');

        // 4. 验证结果
        expect(contentRef.value).toContain('**');
      }
    });

    it('应该处理多次格式化操作', async () => {
      const editor = createMockEditor();
      const editorRef = ref(editor);
      const contentRef = ref('text');

      const { applyFormat } = useEditorToolbar(editorRef, contentRef);

      await applyFormat('bold');
      const afterBold = contentRef.value;

      await applyFormat('italic');
      const afterItalic = contentRef.value;

      expect(afterBold).not.toBe(afterItalic);
    });
  });
});
