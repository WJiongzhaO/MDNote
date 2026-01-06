/**
 * 编辑器工具栏 Composable
 *
 * 提供工具栏的状态管理和操作方法
 *
 * @module presentation/composables
 */

import { ref, computed, reactive, onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { useInjection } from './useInjection';
import { TYPES } from '@/core/container/container.types';
import type { EditorToolbarUseCase } from '@/application/usecases/editor/editor-toolbar.usecase';

/**
 * 工具栏状态
 */
export interface ToolbarState {
  isActive: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    code: boolean;
  };
  blockType: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'pre';
  hasSelection: boolean;
  selectionText: string;
}

/**
 * 使用编辑器工具栏
 *
 * @param editorRef - 编辑器元素引用
 * @param contentRef - 内容引用
 * @returns 工具栏状态和方法
 *
 * @example
 * ```ts
 * const { isActive, applyFormat, insertContent } = useEditorToolbar(editorRef, contentRef);
 * ```
 */
export function useEditorToolbar(
  editorRef: Ref<HTMLDivElement | null>,
  contentRef: Ref<string>
) {
  // 注入用例
  const toolbarUseCase = useInjection<EditorToolbarUseCase>(
    TYPES.EditorToolbarUseCase
  );

  // 响应式状态
  const isActive = reactive({
    bold: false,
    italic: false,
    strikethrough: false,
    code: false,
  });

  const blockType = ref<'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'pre'>('p');
  const hasSelection = ref(false);
  const selectionText = ref('');

  /**
   * 获取当前光标位置
   */
  const getCursorPosition = (): { start: number; end: number } => {
    const editor = editorRef.value;
    if (!editor) return { start: 0, end: 0 };

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };

    const range = selection.getRangeAt(0);

    // 检查选区是否在编辑器内
    if (!editor.contains(range.commonAncestorContainer)) {
      return { start: 0, end: 0 };
    }

    // 简化版本：使用 textContent 计算位置
    // 注意：这是一个基础实现，可能需要根据实际编辑器结构调整
    const textContent = editor.textContent || '';

    // TODO: 实现更精确的光标位置计算
    // 当前使用简化版本，实际可能需要遍历 DOM 树
    return { start: 0, end: textContent.length };
  };

  /**
   * 更新选区状态
   */
  const updateSelectionState = () => {
    const editor = editorRef.value;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      resetState();
      return;
    }

    const range = selection.getRangeAt(0);

    // 检查选区是否在编辑器内
    if (!editor.contains(range.commonAncestorContainer)) {
      resetState();
      return;
    }

    // 更新选区信息
    hasSelection.value = !range.collapsed;
    selectionText.value = range.toString();

    // 检测格式状态
    detectFormats(range);

    // 检测块级元素类型
    detectBlockType(range);
  };

  /**
   * 检测格式状态
   */
  const detectFormats = (range: Range) => {
    isActive.bold = isFormatActive(range, 'bold');
    isActive.italic = isFormatActive(range, 'italic');
    isActive.strikethrough = isFormatActive(range, 'strikethrough');
    isActive.code = isFormatActive(range, 'code');
  };

  /**
   * 检测格式是否激活
   */
  const isFormatActive = (range: Range, format: string): boolean => {
    const container = range.commonAncestorContainer;
    let node: Node | null = container.nodeType === Node.TEXT_NODE
      ? container.parentNode
      : container;

    while (node && node !== document.body) {
      if (node instanceof HTMLElement) {
        const tagName = node.tagName.toLowerCase();
        if (
          (format === 'bold' && (tagName === 'strong' || tagName === 'b')) ||
          (format === 'italic' && (tagName === 'em' || tagName === 'i')) ||
          (format === 'strikethrough' && tagName === 's') ||
          (format === 'code' && tagName === 'code')
        ) {
          return true;
        }
      }
      node = node.parentNode;
    }

    return false;
  };

  /**
   * 检测块级元素类型
   */
  const detectBlockType = (range: Range) => {
    const container = range.startContainer;
    let node: Node | null = container.nodeType === Node.TEXT_NODE
      ? container.parentNode
      : container;

    while (node && node !== document.body) {
      if (node instanceof HTMLElement) {
        const tagName = node.tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'pre'].includes(tagName)) {
          blockType.value = tagName as any;
          return;
        }
      }
      node = node.parentNode;
    }

    blockType.value = 'p';
  };

  /**
   * 重置状态
   */
  const resetState = () => {
    hasSelection.value = false;
    selectionText.value = '';
    isActive.bold = false;
    isActive.italic = false;
    isActive.strikethrough = false;
    isActive.code = false;
    blockType.value = 'p';
  };

  /**
   * 应用格式化
   */
  const applyFormat = async (formatType: string, data?: any) => {
    const editor = editorRef.value;
    if (!editor) return;

    // 获取当前选中的文本（简化版本）
    const selection = window.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    try {
      const result = await toolbarUseCase.applyFormat({
        content: contentRef.value,
        selection: {
          start: 0,  // TODO: 使用实际的光标位置
          end: selectedText.length,
          text: selectedText
        },
        data
      }, formatType);

      // 更新内容
      contentRef.value = result.content;

      // 恢复光标位置（简化版本）
      nextTick(() => {
        // TODO: 实现精确的光标位置恢复
        console.log('New cursor position:', result.newCursorPosition);
      });

    } catch (error) {
      console.error('Failed to apply format:', error);
    }
  };

  /**
   * 插入内容
   */
  const insertContent = async (insertType: string, data?: any) => {
    const editor = editorRef.value;
    if (!editor) return;

    try {
      const result = await toolbarUseCase.insertContent({
        content: contentRef.value,
        selection: { start: 0, end: 0, text: '' },  // TODO: 使用实际的光标位置
        data
      }, insertType);

      // 更新内容
      contentRef.value = result.content;

      // 恢复光标位置
      nextTick(() => {
        // TODO: 实现精确的光标位置恢复
        console.log('New cursor position:', result.newCursorPosition);
      });

    } catch (error) {
      console.error('Failed to insert content:', error);
    }
  };

  // 监听选区变化
  onMounted(() => {
    document.addEventListener('selectionchange', updateSelectionState);
  });

  onUnmounted(() => {
    document.removeEventListener('selectionchange', updateSelectionState);
  });

  return {
    // 状态
    isActive,
    blockType,
    hasSelection,
    selectionText,

    // 方法
    applyFormat,
    insertContent,
    updateSelectionState,
    getCursorPosition,
  };
}
