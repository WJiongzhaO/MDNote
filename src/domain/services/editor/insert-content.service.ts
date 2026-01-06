/**
 * 插入内容领域服务
 *
 * 负责处理插入链接、图片、表格等业务逻辑
 *
 * @module domain/services/editor
 */

import { injectable } from 'inversify';
import { TextSelection } from './text-selection.vo';
import type { FormatResult } from './format-editor.service';

/**
 * 插入内容领域服务
 */
@injectable()
export class InsertContentService {

  /**
   * 插入链接
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @param url - 链接地址
   * @param text - 链接文本
   * @returns 格式化结果
   */
  insertLink(
    content: string,
    selection: TextSelection,
    url?: string,
    text?: string
  ): FormatResult {
    const linkText = text || selection.text || '链接文本';
    const linkUrl = url || 'https://';
    const markdown = `[${linkText}](${linkUrl})`;

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const formattedContent = before + markdown + after;

    const newPosition = selection.start + markdown.length;

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newPosition),
      cursorPosition: newPosition
    };
  }

  /**
   * 插入图片
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @param url - 图片地址
   * @param alt - 图片描述
   * @returns 格式化结果
   */
  insertImage(
    content: string,
    selection: TextSelection,
    url?: string,
    alt?: string
  ): FormatResult {
    const imageAlt = alt || '图片描述';
    const imageUrl = url || 'https://';
    const markdown = `
![${imageAlt}](${imageUrl})
`;

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const formattedContent = before + markdown + after;

    const newPosition = selection.start + markdown.length;

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newPosition),
      cursorPosition: newPosition
    };
  }

  /**
   * 插入表格
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @param columns - 列数
   * @param rows - 行数
   * @returns 格式化结果
   */
  insertTable(
    content: string,
    selection: TextSelection,
    columns: number = 3,
    rows: number = 2
  ): FormatResult {
    // 生成表头
    const header = '| ' + Array.from({ length: columns }, (_, i) => `列${i + 1}`).join(' | ') + ' |';

    // 生成分隔线
    const separator = '|' + Array.from({ length: columns }, () => '-----').join('|') + '|';

    // 生成数据行
    const dataRows = Array.from({ length: rows }, () =>
      '|' + Array.from({ length: columns }, () => '     ').join('|') + '|'
    ).join('\n');

    const table = `\n${header}\n${separator}\n${dataRows}\n`;

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const formattedContent = before + table + after;

    const newPosition = selection.start + table.length;

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newPosition),
      cursorPosition: newPosition
    };
  }

  /**
   * 插入无序列表
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  insertUnorderedList(content: string, selection: TextSelection): FormatResult {
    const selectedText = selection.text || '列表项';
    const lines = selectedText.split('\n');
    const listItems = lines.map(line => `- ${line}`).join('\n');
    const markdown = `\n${listItems}\n`;

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const formattedContent = before + markdown + after;

    const newPosition = selection.start + markdown.length;

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newPosition),
      cursorPosition: newPosition
    };
  }

  /**
   * 插入有序列表
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  insertOrderedList(content: string, selection: TextSelection): FormatResult {
    const selectedText = selection.text || '列表项';
    const lines = selectedText.split('\n');
    const listItems = lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
    const markdown = `\n${listItems}\n`;

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const formattedContent = before + markdown + after;

    const newPosition = selection.start + markdown.length;

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newPosition),
      cursorPosition: newPosition
    };
  }

  /**
   * 插入任务列表
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @param items - 任务项数组
   * @returns 格式化结果
   */
  insertTaskList(
    content: string,
    selection: TextSelection,
    items: string[] = ['任务1', '任务2']
  ): FormatResult {
    const taskItems = items.map(item => `- [ ] ${item}`).join('\n');
    const markdown = `\n${taskItems}\n`;

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const formattedContent = before + markdown + after;

    const newPosition = selection.start + markdown.length;

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newPosition),
      cursorPosition: newPosition
    };
  }

  /**
   * 插入水平分隔线
   *
   * @param content - 原始内容
   * @param selection - 文本选区
   * @returns 格式化结果
   */
  insertHorizontalRule(content: string, selection: TextSelection): FormatResult {
    const hr = '\n---\n';

    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    const formattedContent = before + hr + after;

    const newPosition = selection.start + hr.length;

    return {
      formattedContent,
      newSelection: TextSelection.collapsed(newPosition),
      cursorPosition: newPosition
    };
  }
}
