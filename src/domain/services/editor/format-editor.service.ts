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
   * 切换标题（添加或移除标题格式）
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @param level - 标题级别（1-6）
   * @returns 格式化结果
   */
  toggleHeading(
    content: string,
    selection: TextSelection,
    level: number
  ): FormatResult {
    if (level < 1 || level > 6) {
      throw new Error('Heading level must be between 1 and 6');
    }

    const lineStart = this.findLineStart(content, selection.start);
    const lineEnd = this.findLineEnd(content, selection.end);
    const line = content.substring(lineStart, lineEnd);

    const headingPrefix = '#'.repeat(level) + ' ';

    // 检查当前行是否已经是标题
    const headingRegex = /^(#{1,6})\s/;
    const match = line.match(headingRegex);

    let newLine: string;
    if (match) {
      // 如果已经是标题，检查是否是相同级别的标题
      const currentLevel = match[1].length;
      if (currentLevel === level) {
        // 相同级别，移除标题格式
        newLine = line.substring(match[0].length);
      } else {
        // 不同级别，替换为新级别
        newLine = headingPrefix + line.substring(match[0].length);
      }
    } else {
      // 不是标题，添加标题格式
      newLine = headingPrefix + line;
    }

    const before = content.substring(0, lineStart);
    const after = content.substring(lineEnd);
    const formattedContent = before + newLine + after;

    // 计算新的光标位置（保持在行的相对位置）
    const relativePos = selection.start - lineStart;
    const newCursorPos = lineStart + relativePos + (newLine.length - line.length);

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newCursorPos),
      cursorPosition: newCursorPos
    };
  }

  /**
   * 切换无序列表（添加或移除列表格式）
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  toggleUnorderedList(content: string, selection: TextSelection): FormatResult {
    const lineStart = this.findLineStart(content, selection.start);
    const lineEnd = this.findLineEnd(content, selection.end);
    const line = content.substring(lineStart, lineEnd);

    const listPrefix = '- ';

    // 检查当前行是否已经是无序列表
    const ulRegex = /^(\s*)[-*+]\s/;
    const match = line.match(ulRegex);

    let newLine: string;
    if (match) {
      // 已经是无序列表，移除列表格式
      newLine = line.substring(match[0].length);
    } else {
      // 不是无序列表，添加列表格式
      newLine = listPrefix + line;
    }

    const before = content.substring(0, lineStart);
    const after = content.substring(lineEnd);
    const formattedContent = before + newLine + after;

    // 计算新的光标位置
    const relativePos = selection.start - lineStart;
    const newCursorPos = lineStart + relativePos + (newLine.length - line.length);

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newCursorPos),
      cursorPosition: newCursorPos
    };
  }

  /**
   * 切换有序列表（添加或移除列表格式）
   *
   * 如果上一行是有序列表，则自动递增序号
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  toggleOrderedList(content: string, selection: TextSelection): FormatResult {
    const lineStart = this.findLineStart(content, selection.start);
    const lineEnd = this.findLineEnd(content, selection.end);
    const line = content.substring(lineStart, lineEnd);

    // 检查当前行是否已经是有序列表
    const olRegex = /^(\s*)\d+\.\s/;
    const match = line.match(olRegex);

    let newLine: string;
    if (match) {
      // 已经是有序列表，移除列表格式
      newLine = line.substring(match[0].length);
    } else {
      // 不是有序列表，添加列表格式
      // 检查上一行是否是有序列表，如果是则递增序号
      const prevLineNumber = this.getPreviousLineNumber(content, lineStart);
      const listNumber = prevLineNumber > 0 ? prevLineNumber : 1;
      newLine = `${listNumber}. ${line}`;
    }

    const before = content.substring(0, lineStart);
    const after = content.substring(lineEnd);
    const formattedContent = before + newLine + after;

    // 计算新的光标位置
    const relativePos = selection.start - lineStart;
    const newCursorPos = lineStart + relativePos + (newLine.length - line.length);

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newCursorPos),
      cursorPosition: newCursorPos
    };
  }

  /**
   * 获取上一行的有序列表序号
   *
   * @param content - 完整内容
   * @param currentLineStart - 当前行开始位置
   * @returns 上一行的序号，如果不是有序列表则返回 0
   */
  private getPreviousLineNumber(content: string, currentLineStart: number): number {
    // 找到上一行的开始位置
    let prevLineEnd = currentLineStart - 1;
    while (prevLineEnd > 0 && content[prevLineEnd] === '\n') {
      prevLineEnd--;
    }

    if (prevLineEnd <= 0) {
      return 0; // 没有上一行
    }

    // 向前查找上一行的开始位置
    let prevLineStart = prevLineEnd;
    while (prevLineStart > 0 && content[prevLineStart - 1] !== '\n') {
      prevLineStart--;
    }

    // 获取上一行的内容
    const prevLine = content.substring(prevLineStart, prevLineEnd + 1);

    // 检查上一行是否是有序列表
    const olRegex = /^(\s*)(\d+)\.\s/;
    const match = prevLine.match(olRegex);

    if (match) {
      // 返回上一行的序号 + 1
      const prevNumber = parseInt(match[2], 10);
      return prevNumber + 1;
    }

    return 0; // 上一行不是有序列表
  }

  /**
   * 查找行结束位置（私有方法）
   *
   * @param content - 内容
   * @param position - 当前位置
   * @returns 行结束位置
   */
  private findLineEnd(content: string, position: number): number {
    // 向后查找最近的换行符或内容结尾
    let lineEnd = position;
    while (lineEnd < content.length && content[lineEnd] !== '\n') {
      lineEnd++;
    }

    return lineEnd;
  }

  /**
   * 插入标题（旧方法，保留向后兼容）
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
