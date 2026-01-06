/**
 * 格式化编辑器领域服务
 *
 * 负责处理文本格式化业务逻辑
 * 不依赖具体的 UI 框架或编辑器实现
 *
 * @module domain/services/editor
 */

import { injectable } from 'inversify';
import { TextSelection } from './text-selection.vo';

/**
 * 格式化操作结果
 */
export type FormatResult = {
  formattedContent: string;
  newSelection: TextSelection;
  cursorPosition: number;
};

/**
 * 格式化编辑器领域服务
 */
@injectable()
export class FormatEditorService {

  /**
   * 应用加粗格式
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  applyBold(content: string, selection: TextSelection): FormatResult {
    return this.wrapSelection(content, selection, '**', '**');
  }

  /**
   * 应用斜体格式
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  applyItalic(content: string, selection: TextSelection): FormatResult {
    return this.wrapSelection(content, selection, '*', '*');
  }

  /**
   * 应用删除线格式
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  applyStrikethrough(content: string, selection: TextSelection): FormatResult {
    return this.wrapSelection(content, selection, '~~', '~~');
  }

  /**
   * 应用行内代码格式
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  applyInlineCode(content: string, selection: TextSelection): FormatResult {
    return this.wrapSelection(content, selection, '`', '`');
  }

  /**
   * 插入标题
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @param level - 标题级别（1-6）
   * @returns 格式化结果
   */
  insertHeading(
    content: string,
    selection: TextSelection,
    level: number
  ): FormatResult {
    if (level < 1 || level > 6) {
      throw new Error('Heading level must be between 1 and 6');
    }

    const prefix = '#'.repeat(level) + ' ';
    return this.insertAtLineStart(content, selection, prefix);
  }

  /**
   * 插入引用块
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  insertBlockquote(content: string, selection: TextSelection): FormatResult {
    const selectedText = selection.text || '引用内容';
    const lines = selectedText.split('\n');
    const quoted = lines.map(line => `> ${line}`).join('\n');

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const formatted = before + quoted + after;

    const newPosition = selection.start + quoted.length;

    return {
      formattedContent: formatted,
      newSelection: TextSelection.collapsed(newPosition),
      cursorPosition: newPosition
    };
  }

  /**
   * 插入代码块
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @param language - 代码语言
   * @returns 格式化结果
   */
  insertCodeBlock(
    content: string,
    selection: TextSelection,
    language: string = ''
  ): FormatResult {
    const codeBlock = `\`\`\`${language}\n${selection.text || '代码'}\n\`\`\``;

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const formatted = before + codeBlock + after;

    const newPosition = selection.start + codeBlock.length;

    return {
      formattedContent: formatted,
      newSelection: TextSelection.collapsed(newPosition),
      cursorPosition: newPosition
    };
  }

  /**
   * 包裹选中文本（私有方法）
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @param before - 前缀标记
   * @param after - 后缀标记
   * @returns 格式化结果
   */
  private wrapSelection(
    content: string,
    selection: TextSelection,
    before: string,
    after: string
  ): FormatResult {
    const selectedText = selection.text || '文本';
    const wrapped = before + selectedText + after;

    const beforeContent = content.substring(0, selection.start);
    const afterContent = content.substring(selection.end);
    const formattedContent = beforeContent + wrapped + afterContent;

    // 计算新的光标位置
    const newCursorPos = selection.start + wrapped.length;

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newCursorPos),
      cursorPosition: newCursorPos
    };
  }

  /**
   * 在行首插入文本（私有方法）
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @param text - 要插入的文本
   * @returns 格式化结果
   */
  private insertAtLineStart(
    content: string,
    selection: TextSelection,
    text: string
  ): FormatResult {
    // 找到当前行的开始位置
    const lineStart = this.findLineStart(content, selection.start);

    // 在行首插入文本
    const before = content.substring(0, lineStart);
    const lineContent = content.substring(lineStart, selection.end);
    const after = content.substring(selection.end);
    const formattedContent = before + text + lineContent + after;

    // 计算新的光标位置
    const newCursorPos = lineStart + text.length + (selection.end - lineStart);

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newCursorPos),
      cursorPosition: newCursorPos
    };
  }

  /**
   * 查找行开始位置（私有方法）
   *
   * @param content - 内容
   * @param position - 当前位置
   * @returns 行开始位置
   */
  private findLineStart(content: string, position: number): number {
    // 向前查找最近的换行符
    let lineStart = position;
    while (lineStart > 0 && content[lineStart - 1] !== '\n') {
      lineStart--;
    }

    return lineStart;
  }
}
