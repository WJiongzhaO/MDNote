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

  // 保存最后的选区信息（用于工具栏操作）
  const lastSelection = ref<{
    start: number;
    end: number;
    text: string;
  } | null>(null);

  /**
   * 获取纯文本内容（移除HTML标签，保留换行）
   */
  const getTextContent = (element: HTMLElement): string => {
    // 如果元素是文本节点，直接返回
    if (element.nodeType === Node.TEXT_NODE) {
      return element.textContent || '';
    }

    // 递归获取所有文本节点的内容，保留换行
    let text = '';
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Node) => {
          // 跳过 script 和 style 标签
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = (node as Element).tagName.toLowerCase();
            if (tagName === 'script' || tagName === 'style') {
              return NodeFilter.FILTER_REJECT;
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        text += currentNode.textContent || '';
      } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const tagName = (currentNode as Element).tagName.toLowerCase();
        // 块级元素后添加换行
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre'].includes(tagName)) {
          text += '\n';
        }
        // br 标签添加换行
        if (tagName === 'br') {
          text += '\n';
        }
      }
    }

    return text;
  };

  /**
   * 计算从元素开始到指定节点的文本长度
   */
  const calculateTextLength = (element: HTMLElement, endNode: Node, endOffset: number): number => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.setEnd(endNode, endOffset);

    // 创建一个临时容器来提取范围内的内容
    const fragment = range.cloneContents();
    const tempContainer = document.createElement('div');
    tempContainer.appendChild(fragment);

    // 使用 getTextContent 来获取文本内容，确保逻辑一致
    return getTextContent(tempContainer).length;
  };

  /**
   * 获取当前光标位置
   */
  const getCursorPosition = (): { start: number; end: number } => {
    const editor = editorRef.value;
    if (!editor) return { start: 0, end: 0 };

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // 如果没有选区，返回文本内容末尾
      const editorText = getTextContent(editor);
      return { start: editorText.length, end: editorText.length };
    }

    const range = selection.getRangeAt(0);

    // 检查选区是否在编辑器内
    if (!editor.contains(range.commonAncestorContainer)) {
      return { start: 0, end: 0 };
    }

    // 使用 calculateTextLength 来计算位置
    const start = calculateTextLength(editor, range.startContainer, range.startOffset);
    const end = calculateTextLength(editor, range.endContainer, range.endOffset);

    return { start, end };
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

    // 保存选区位置信息（用于工具栏操作）
    const position = getCursorPosition();
    lastSelection.value = {
      start: position.start,
      end: position.end,
      text: range.toString()
    };

    // 调试日志：显示选区信息
    console.log('[选区更新]', {
      text: range.toString(),
      start: position.start,
      end: position.end,
      collapsed: range.collapsed
    });

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
    const editor = editorRef.value;
    if (!editor) {
      blockType.value = 'p';
      return;
    }

    // 首先尝试检测 HTML 标签
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

    // 如果没有找到 HTML 标签，尝试检测 Markdown 井号标题
    // 获取编辑器的纯文本内容
    const textContent = getTextContent(editor);
    
    // 计算光标在文本中的位置
    const cursorPosition = calculateTextLength(editor, range.startContainer, range.startOffset);
    
    // 找到光标所在的行
    const lines = textContent.split('\n');
    let currentPos = 0;
    let currentLine = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (cursorPosition >= currentPos && cursorPosition <= currentPos + line.length) {
        currentLine = line;
        break;
      }
      currentPos += line.length + 1; // +1 for newline
    }
    
    // 检查是否是 Markdown 井号标题
    const headingMatch = currentLine.match(/^(#{1,6})\s/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blockType.value = `h${level}` as any;
      return;
    }
    
    // 默认为段落
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
   * 设置光标位置
   */
  const setCursorPosition = (position: number): void => {
    console.log('[setCursorPosition] ========== 开始设置光标位置 ==========');
    console.log('[setCursorPosition] 目标位置:', position);
    
    const editor = editorRef.value;
    if (!editor) {
      console.error('[setCursorPosition] 编辑器引用为空');
      return;
    }
    console.log('[setCursorPosition] 编辑器引用存在');

    try {
      const selection = window.getSelection();
      if (!selection) {
        console.error('[setCursorPosition] 无法获取 window.getSelection()');
        return;
      }
      console.log('[setCursorPosition] window.getSelection() 存在');

      // 确保位置在有效范围内
      const textContent = getTextContent(editor);
      const maxPosition = textContent.length;
      const validPosition = Math.max(0, Math.min(position, maxPosition));
      
      console.log('[setCursorPosition] 文本内容长度:', textContent.length);
      console.log('[setCursorPosition] 最大位置:', maxPosition);
      console.log('[setCursorPosition] 有效位置:', validPosition);
      console.log('[setCursorPosition] 文本内容预览:', textContent.substring(0, 50) + (textContent.length > 50 ? '...' : ''));

      const range = document.createRange();
      const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentPos = 0;
      let targetNode: Node | null = null;
      let targetOffset = 0;
      let nodeCount = 0;

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeLength = node.textContent?.length || 0;
        nodeCount++;

        if (currentPos + nodeLength >= validPosition) {
          targetNode = node;
          targetOffset = Math.max(0, Math.min(validPosition - currentPos, nodeLength));
          break;
        }
        currentPos += nodeLength;
      }
      
      console.log('[setCursorPosition] 遍历文本节点数量:', nodeCount);
      console.log('[setCursorPosition] 目标节点:', targetNode);
      console.log('[setCursorPosition] 目标偏移:', targetOffset);
      console.log('[setCursorPosition] 当前位置:', currentPos);

      if (targetNode) {
        console.log('[setCursorPosition] 找到目标节点，设置光标位置');
        range.setStart(targetNode, targetOffset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        console.log('[setCursorPosition] 光标位置已设置');
        console.log('[setCursorPosition] 当前选区:', {
          anchorOffset: selection.anchorOffset,
          focusOffset: selection.focusOffset,
          isCollapsed: selection.isCollapsed
        });
      } else {
        console.warn('[setCursorPosition] 未找到目标节点，尝试设置到末尾');
        // 如果找不到目标节点，将光标设置到末尾
        const textNodes: Node[] = [];
        const nodeWalker = document.createTreeWalker(
          editor,
          NodeFilter.SHOW_TEXT,
          null
        );
        let node: Node | null;
        while ((node = nodeWalker.nextNode())) {
          textNodes.push(node);
        }

        if (textNodes.length > 0) {
          const lastNode = textNodes[textNodes.length - 1];
          if (lastNode) {
            const lastLength = lastNode.textContent?.length || 0;
            range.setStart(lastNode, lastLength);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            console.log('[setCursorPosition] 光标已设置到最后一个文本节点末尾');
          }
        } else {
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          console.log('[setCursorPosition] 光标已设置到编辑器内容末尾');
        }
      }
    } catch (error) {
      console.error('[光标位置设置失败]', error);
    }
    console.log('[setCursorPosition] ========== 光标位置设置完成 ==========');
  };

  /**
   * 应用格式化
   */
  const applyFormat = async (formatType: string, data?: any) => {
    console.log('[工具栏-applyFormat] 开始执行', { formatType, data });
    
    const editor = editorRef.value;
    if (!editor) {
      console.error('[工具栏-applyFormat] 编辑器引用为空');
      return;
    }
    console.log('[工具栏-applyFormat] 编辑器引用存在', { editorElement: editor.tagName });

    // 使用保存的选区信息（而不是当前的 window.getSelection()）
    // 因为点击工具栏按钮会导致编辑器失去焦点，选区会丢失
    if (!lastSelection.value) {
      console.warn('[工具栏-applyFormat] 没有保存的选区信息，无法应用格式');
      return;
    }

    const { start, end, text: selectedText } = lastSelection.value;

    console.log('[工具栏-应用格式]', {
      formatType,
      selection: { start, end, text: selectedText },
      contentLength: contentRef.value.length,
      contentPreview: contentRef.value.substring(0, 50) + (contentRef.value.length > 50 ? '...' : ''),
      contentRefType: typeof contentRef.value,
      isRef: 'value' in contentRef
    });

    try {
      console.log('[工具栏-applyFormat] 调用 toolbarUseCase.applyFormat');
      const result = await toolbarUseCase.applyFormat({
        content: contentRef.value,
        selection: {
          start,
          end,
          text: selectedText
        },
        data
      }, formatType);

      console.log('[工具栏-格式应用结果]', {
        newContentLength: result.content.length,
        newCursorPosition: result.newCursorPosition,
        resultPreview: result.content.substring(0, 100) + (result.content.length > 100 ? '...' : '')
      });

      console.log('[工具栏-applyFormat] 准备更新 contentRef');
      console.log('[工具栏-applyFormat] 更新前 contentRef.value:', contentRef.value);

      // 保存旧内容长度（用于计算光标位置）
      const oldContentLength = contentRef.value.length;

      // 更新内容（会触发父组件的 handleToolbarUpdate）
      contentRef.value = result.content;

      console.log('[工具栏-applyFormat] contentRef 已设置，但可能还没更新到父组件');

      // 使用双重 nextTick 确保：
      // 1. Vue 响应式更新完成
      // 2. 父组件的 mainContent 更新完成
      // 3. 编辑器 DOM 更新完成
      nextTick(() => {
        nextTick(() => {
          console.log('[工具栏-applyFormat] 双重 nextTick 回调执行');
          console.log('[工具栏-applyFormat] 准备恢复光标位置到:', result.newCursorPosition);
          setCursorPosition(result.newCursorPosition);
        });
      });

    } catch (error) {
      console.error('[工具栏-格式应用失败]', error);
    }
  };

  /**
   * 插入内容
   */
  const insertContent = async (insertType: string, data?: any) => {
    const editor = editorRef.value;
    if (!editor) return;

    // 使用保存的选区信息
    const savedSelection = lastSelection.value || { start: 0, end: 0, text: '' };

    console.log('[工具栏-插入内容]', {
      insertType,
      selection: savedSelection,
      data
    });

    try {
      const result = await toolbarUseCase.insertContent({
        content: contentRef.value,
        selection: {
          start: savedSelection.start,
          end: savedSelection.end,
          text: savedSelection.text
        },
        data
      }, insertType);

      // 更新内容
      contentRef.value = result.content;

      // 恢复光标位置
      nextTick(() => {
        setCursorPosition(result.newCursorPosition);
      });

    } catch (error) {
      console.error('[工具栏-插入内容失败]', error);
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
