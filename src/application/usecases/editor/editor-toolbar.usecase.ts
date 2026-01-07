/**
 * 编辑器工具栏用例
 *
 * 协调领域服务，处理工具栏的业务流程
 *
 * @module application/usecases/editor
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/core/container/container.types';
import { FormatEditorService } from '@/domain/services/editor/format-editor.service';
import { InsertContentService } from '@/domain/services/editor/insert-content.service';
import { TextSelection } from '@/domain/services/editor/text-selection.vo';
import type { FormatResult } from '@/domain/services/editor/format-editor.service';

/**
 * 工具栏用例请求DTO
 */
export interface FormatRequest {
  content: string;
  selection: {
    start: number;
    end: number;
    text: string;
  };
  data?: any;
}

export interface InsertRequest {
  content: string;
  selection: {
    start: number;
    end: number;
    text: string;
  };
  data?: {
    url?: string;
    text?: string;
    alt?: string;
    language?: string;
    level?: number;
    columns?: number;
    rows?: number;
    items?: string[];
  };
}

/**
 * 工具栏用例响应DTO
 */
export interface ToolbarResponse {
  content: string;
  newCursorPosition: number;
}

/**
 * 编辑器工具栏用例
 */
@injectable()
export class EditorToolbarUseCase {
  constructor(
    @inject(TYPES.FormatEditorService)
    private readonly formatService: FormatEditorService,
    @inject(TYPES.InsertContentService)
    private readonly insertService: InsertContentService
  ) {}

  /**
   * 应用格式化
   *
   * @param request - 格式化请求
   * @param formatType - 格式化类型
   * @returns 工具栏响应
   */
  applyFormat(request: FormatRequest, formatType: string): ToolbarResponse {
    const selection = TextSelection.create(
      request.selection.start,
      request.selection.end,
      request.selection.text
    );

    let result: FormatResult;

    switch (formatType) {
      case 'bold':
        result = this.formatService.applyBold(request.content, selection);
        break;
      case 'italic':
        result = this.formatService.applyItalic(request.content, selection);
        break;
      case 'strikethrough':
        result = this.formatService.applyStrikethrough(request.content, selection);
        break;
      case 'code':
        result = this.formatService.applyInlineCode(request.content, selection);
        break;
      case 'heading':
        const level = request.data?.level || 1;
        result = this.formatService.toggleHeading(request.content, selection, level);
        break;
      case 'ul':
        result = this.formatService.toggleUnorderedList(request.content, selection);
        break;
      case 'ol':
        result = this.formatService.toggleOrderedList(request.content, selection);
        break;
      case 'blockquote':
        result = this.formatService.insertBlockquote(request.content, selection);
        break;
      case 'codeblock':
        const language = request.data?.language || '';
        result = this.formatService.insertCodeBlock(request.content, selection, language);
        break;
      default:
        throw new Error(`Unknown format type: ${formatType}`);
    }

    return {
      content: result.formattedContent,
      newCursorPosition: result.cursorPosition
    };
  }

  /**
   * 插入内容
   *
   * @param request - 插入请求
   * @param insertType - 插入类型
   * @returns 工具栏响应
   */
  insertContent(request: InsertRequest, insertType: string): ToolbarResponse {
    const selection = TextSelection.create(
      request.selection.start,
      request.selection.end,
      request.selection.text
    );

    let result: FormatResult;

    switch (insertType) {
      case 'link':
        result = this.insertService.insertLink(
          request.content,
          selection,
          request.data?.url,
          request.data?.text
        );
        break;
      case 'image':
        result = this.insertService.insertImage(
          request.content,
          selection,
          request.data?.url,
          request.data?.alt
        );
        break;
      case 'table':
        result = this.insertService.insertTable(
          request.content,
          selection,
          request.data?.columns,
          request.data?.rows
        );
        break;
      case 'ul':
        result = this.insertService.insertUnorderedList(request.content, selection);
        break;
      case 'ol':
        result = this.insertService.insertOrderedList(request.content, selection);
        break;
      case 'tasklist':
        result = this.insertService.insertTaskList(
          request.content,
          selection,
          request.data?.items
        );
        break;
      case 'hr':
        result = this.insertService.insertHorizontalRule(request.content, selection);
        break;
      default:
        throw new Error(`Unknown insert type: ${insertType}`);
    }

    return {
      content: result.formattedContent,
      newCursorPosition: result.cursorPosition
    };
  }
}
