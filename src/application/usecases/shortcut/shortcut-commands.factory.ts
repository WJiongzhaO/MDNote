import { injectable, inject } from 'inversify';
import { TYPES } from '@/core/container/container.types';
import { EditorToolbarUseCase } from '../editor/editor-toolbar.usecase';
import { Command } from '@/domain/values/Command.vo';
import type { CommandContext } from '@/domain/values/Command.vo';
import { DocumentUseCases } from '../document.usecases';

/**
 * 快捷键命令工厂
 *
 * 负责创建和注册所有默认快捷键命令
 */
@injectable()
export class ShortcutCommandsFactory {
  constructor(
    @inject(TYPES.EditorToolbarUseCase)
    private readonly editorToolbarUseCase: EditorToolbarUseCase,
    @inject(TYPES.DocumentUseCases)
    private readonly documentUseCases: DocumentUseCases
  ) {
    console.log('[ShortcutCommandsFactory.constructor] 构造函数执行', {
      hasEditorToolbarUseCase: !!this.editorToolbarUseCase,
      hasDocumentUseCases: !!this.documentUseCases,
      editorToolbarUseCaseType: typeof this.editorToolbarUseCase
    });
  }

  /**
   * 创建所有默认命令
   */
  createAllCommands(): Command[] {
    const commands: Command[] = [];

    // Markdown 格式化命令
    commands.push(...this.createFormatCommands());

    // 插入内容命令
    commands.push(...this.createInsertCommands());

    // 编辑器操作命令
    commands.push(...this.createEditorCommands());

    return commands;
  }

  /**
   * 创建格式化命令
   */
  private createFormatCommands(): Command[] {
    return [
      new Command(
        'format.bold',
        '加粗',
        this.createFormatHandler('bold'),
        'format',
        undefined,
        ['bold', '加粗']
      ),
      new Command(
        'format.italic',
        '斜体',
        this.createFormatHandler('italic'),
        'format',
        undefined,
        ['italic', '斜体']
      ),
      new Command(
        'format.strikethrough',
        '删除线',
        this.createFormatHandler('strikethrough'),
        'format',
        undefined,
        ['strikethrough', '删除线']
      ),
      new Command(
        'format.code',
        '行内代码',
        this.createFormatHandler('code'),
        'format',
        undefined,
        ['code', '代码', '行内代码']
      ),
      new Command(
        'format.heading1',
        '一级标题',
        this.createFormatHandler('heading', { level: 1 }),
        'format',
        undefined,
        ['h1', 'heading1', '一级标题']
      ),
      new Command(
        'format.heading2',
        '二级标题',
        this.createFormatHandler('heading', { level: 2 }),
        'format',
        undefined,
        ['h2', 'heading2', '二级标题']
      ),
      new Command(
        'format.heading3',
        '三级标题',
        this.createFormatHandler('heading', { level: 3 }),
        'format',
        undefined,
        ['h3', 'heading3', '三级标题']
      ),
      new Command(
        'format.heading4',
        '四级标题',
        this.createFormatHandler('heading', { level: 4 }),
        'format',
        undefined,
        ['h4', 'heading4', '四级标题']
      ),
      new Command(
        'format.heading5',
        '五级标题',
        this.createFormatHandler('heading', { level: 5 }),
        'format',
        undefined,
        ['h5', 'heading5', '五级标题']
      ),
      new Command(
        'format.heading6',
        '六级标题',
        this.createFormatHandler('heading', { level: 6 }),
        'format',
        undefined,
        ['h6', 'heading6', '六级标题']
      ),
      new Command(
        'format.ul',
        '无序列表',
        this.createFormatHandler('ul'),
        'format',
        undefined,
        ['ul', 'unordered list', '无序列表', '列表']
      ),
      new Command(
        'format.ol',
        '有序列表',
        this.createFormatHandler('ol'),
        'format',
        undefined,
        ['ol', 'ordered list', '有序列表', '列表']
      ),
      new Command(
        'format.blockquote',
        '引用块',
        this.createFormatHandler('blockquote'),
        'format',
        undefined,
        ['blockquote', '引用', '引用块']
      ),
      new Command(
        'format.codeblock',
        '代码块',
        this.createFormatHandler('codeblock'),
        'format',
        undefined,
        ['codeblock', 'code block', '代码块']
      ),
    ];
  }

  /**
   * 创建插入内容命令
   */
  private createInsertCommands(): Command[] {
    return [
      new Command(
        'insert.link',
        '插入链接',
        this.createInsertHandler('link'),
        'format',
        undefined,
        ['link', '链接', '插入链接']
      ),
      new Command(
        'insert.image',
        '插入图片',
        this.createInsertHandler('image'),
        'format',
        undefined,
        ['image', '图片', '插入图片']
      ),
      new Command(
        'insert.hr',
        '插入水平线',
        this.createInsertHandler('hr'),
        'format',
        undefined,
        ['hr', 'horizontal rule', '水平线', '分割线']
      ),
    ];
  }

  /**
   * 创建编辑器操作命令
   */
  private createEditorCommands(): Command[] {
    return [
      new Command(
        'editor.save',
        '保存',
        this.createSaveHandler(),
        'file',
        undefined,
        ['save', '保存']
      ),
    ];
  }

  /**
   * 创建格式化处理器
   */
  private createFormatHandler(formatType: string, data?: any): (context: CommandContext) => Promise<void> {
    return async (context: CommandContext) => {
      console.log('[ShortcutCommandsFactory.createFormatHandler] 执行格式化命令', {
        formatType,
        data
      });

      // 获取编辑器内容和选区
      const content = this.getEditorContent(context);
      const selection = this.getEditorSelection(context);

      if (!content || !selection) {
        console.warn('[Shortcut] 无法获取编辑器内容或选区', {
          hasContent: !!content,
          hasSelection: !!selection
        });
        return;
      }

      console.log('[ShortcutCommandsFactory.createFormatHandler] 调用格式化服务', {
        contentLength: content.length,
        contentPreview: content.substring(0, 50) + '...',
        selection: {
          start: selection.start,
          end: selection.end,
          text: selection.text
        }
      });

      // 调用编辑器工具栏用例
      const response = this.editorToolbarUseCase.applyFormat(
        {
          content,
          selection: {
            start: selection.start,
            end: selection.end,
            text: selection.text || ''
          },
          data
        },
        formatType
      );

      console.log('[ShortcutCommandsFactory.createFormatHandler] 格式化完成', {
        newContentLength: response.content.length,
        newContentPreview: response.content.substring(0, 50) + '...',
        newCursorPosition: response.newCursorPosition
      });

      // 更新编辑器内容
      this.updateEditorContent(context, response.content, response.newCursorPosition);
    };
  }

  /**
   * 创建插入内容处理器
   */
  private createInsertHandler(insertType: string): (context: CommandContext) => Promise<void> {
    return async (context: CommandContext) => {
      // 获取编辑器内容和选区
      const content = this.getEditorContent(context);
      const selection = this.getEditorSelection(context);

      if (!content || !selection) {
        console.warn('[Shortcut] 无法获取编辑器内容或选区');
        return;
      }

      // 调用编辑器工具栏用例
      const response = this.editorToolbarUseCase.insertContent(
        {
          content,
          selection: {
            start: selection.start,
            end: selection.end,
            text: selection.text || ''
          },
          data: {}
        },
        insertType
      );

      // 更新编辑器内容
      this.updateEditorContent(context, response.content, response.newCursorPosition);
    };
  }

  /**
   * 创建保存处理器
   */
  private createSaveHandler(): (context: CommandContext) => Promise<void> {
    return async (context: CommandContext) => {
      // TODO: 实现保存功能
      console.log('[Shortcut] 保存命令 - 待实现');

      // 这里可以调用 DocumentUseCases 来保存文档
      // const currentDocument = context.document;
      // if (currentDocument) {
      //   await this.documentUseCases.updateDocument({
      //     id: currentDocument.id,
      //     content: this.getEditorContent(context)
      //   });
      // }
    };
  }

  /**
   * 获取编辑器内容
   */
  private getEditorContent(context: CommandContext): string | null {
    console.log('[ShortcutCommandsFactory.getEditorContent] 开始获取编辑器内容', {
      hasContextContent: !!context.content,
      contextContentType: typeof context.content,
      hasValueInContent: 'value' in (context.content || {}),
      hasContextEditor: !!context.editor
    });

    // 尝试从 context 中获取内容
    if (context.content) {
      // 如果是 Vue Ref，需要获取 value
      if (typeof context.content.value !== 'undefined') {
        const content = context.content.value;
        console.log('[ShortcutCommandsFactory.getEditorContent] 从 Ref.value 获取内容', {
          contentLength: content.length,
          contentPreview: content.substring(0, 50) + '...'
        });
        return content;
      }
      const content = context.content as string;
      console.log('[ShortcutCommandsFactory.getEditorContent] 直接从 context.content 获取内容', {
        contentLength: content.length,
        contentPreview: content.substring(0, 50) + '...'
      });
      return content;
    }

    // 尝试从编辑器元素获取
    if (context.editor) {
      const textContent = context.editor.textContent || '';
      console.log('[ShortcutCommandsFactory.getEditorContent] 从 editor.textContent 获取内容（回退方案）', {
        textContentLength: textContent.length,
        textContentPreview: textContent.substring(0, 50) + '...'
      });
      console.warn('[ShortcutCommandsFactory.getEditorContent] ⚠️ 使用了回退方案，可能不是 Markdown 源文本！');
      return textContent;
    }

    console.error('[ShortcutCommandsFactory.getEditorContent] ❌ 无法获取编辑器内容！');
    return null;
  }

  /**
   * 获取编辑器选区
   */
  private getEditorSelection(context: CommandContext): { start: number; end: number; text?: string } | null {
    if (context.selection) {
      return context.selection;
    }

    // 尝试从编辑器元素获取选区
    if (context.editor) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const text = range.toString();
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(context.editor!);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const start = preCaretRange.toString().length;

        preCaretRange.setEnd(range.endContainer, range.endOffset);
        const end = preCaretRange.toString().length;

        return { start, end, text };
      }
    }

    return null;
  }

  /**
   * 更新编辑器内容
   */
  private updateEditorContent(context: CommandContext, newContent: string, newCursorPosition: number): void {
    console.log('[ShortcutCommandsFactory.updateEditorContent] 开始更新编辑器内容', {
      newContentLength: newContent.length,
      newCursorPosition,
      newContentPreview: newContent.substring(0, 50) + '...'
    });

    // 更新 context.content Ref
    if (context.content && typeof context.content.value !== 'undefined') {
      console.log('[ShortcutCommandsFactory.updateEditorContent] 更新 context.content.value');
      context.content.value = newContent;
    } else {
      console.warn('[ShortcutCommandsFactory.updateEditorContent] ⚠️ context.content 不是 Ref 或不存在');
    }

    // 更新编辑器元素
    if (context.editor) {
      console.log('[ShortcutCommandsFactory.updateEditorContent] 更新 editor.textContent');
      context.editor.textContent = newContent;

      // 设置光标位置
      this.setCursorPosition(context.editor, newCursorPosition);
    }
  }

  /**
   * 设置光标位置
   */
  private setCursorPosition(editor: HTMLDivElement, position: number): void {
    const range = document.createRange();
    const selection = window.getSelection();

    let currentPosition = 0;
    let found = false;

    const traverseNodes = (node: Node) => {
      if (found) return;

      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;

        if (currentPosition + textLength >= position) {
          range.setStart(node, position - currentPosition);
          range.setEnd(node, position - currentPosition);
          found = true;
        } else {
          currentPosition += textLength;
        }
      } else {
        for (const child of Array.from(node.childNodes)) {
          traverseNodes(child);
          if (found) break;
        }
      }
    };

    traverseNodes(editor);

    if (found && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}
