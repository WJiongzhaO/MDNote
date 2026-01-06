import { describe, it, expect, beforeEach } from 'vitest';
import { FormatEditorService } from '../format-editor.service';
import { TextSelection } from '../text-selection.vo';

describe('FormatEditorService', () => {
  let service: FormatEditorService;

  beforeEach(() => {
    service = new FormatEditorService();
  });

  describe('applyBold', () => {
    it('应该用 ** 包裹选中文本', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('**hello** world');
      expect(result.newSelection.start).toBe(9);
      expect(result.newSelection.end).toBe(9);
    });

    it('应该处理空选区', () => {
      const content = 'hello world';
      const selection = TextSelection.collapsed(5);
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('hello**文本** world');
    });

    it('应该处理多行文本', () => {
      const content = 'line1\nline2';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('**line1\nline2**');
    });

    it('应该处理已有加粗标记的文本', () => {
      const content = '**hello** world';
      const selection = TextSelection.create(0, 9, '**hello**');
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('****hello**** world');
    });
  });

  describe('applyItalic', () => {
    it('应该用 * 包裹选中文本', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');
      const result = service.applyItalic(content, selection);

      expect(result.formattedContent).toBe('*hello* world');
      expect(result.newSelection.start).toBe(7);
      expect(result.newSelection.end).toBe(7);
    });

    it('应该处理空选区', () => {
      const content = 'hello world';
      const selection = TextSelection.collapsed(5);
      const result = service.applyItalic(content, selection);

      expect(result.formattedContent).toBe('hello*文本* world');
    });

    it('应该处理中文文本', () => {
      const content = '你好世界';
      const selection = TextSelection.create(0, 2, '你好');
      const result = service.applyItalic(content, selection);

      expect(result.formattedContent).toBe('*你好*世界');
    });
  });

  describe('applyStrikethrough', () => {
    it('应该用 ~~ 包裹选中文本', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');
      const result = service.applyStrikethrough(content, selection);

      expect(result.formattedContent).toBe('~~hello~~ world');
      expect(result.newSelection.start).toBe(9);
      expect(result.newSelection.end).toBe(9);
    });

    it('应该处理空选区', () => {
      const content = 'hello world';
      const selection = TextSelection.collapsed(5);
      const result = service.applyStrikethrough(content, selection);

      expect(result.formattedContent).toBe('hello~~文本~~ world');
    });

    it('应该处理长文本', () => {
      const content = 'this is a long text';
      const selection = TextSelection.create(5, 14, 'is a long');
      const result = service.applyStrikethrough(content, selection);

      expect(result.formattedContent).toBe('this ~~is a long~~ text');
    });
  });

  describe('applyInlineCode', () => {
    it('应该用 ` 包裹选中文本', () => {
      const content = 'const x = 5';
      const selection = TextSelection.create(6, 7, 'x');
      const result = service.applyInlineCode(content, selection);

      expect(result.formattedContent).toBe('const `x` = 5');
      expect(result.newSelection.start).toBe(9);
      expect(result.newSelection.end).toBe(9);
    });

    it('应该处理空选区', () => {
      const content = 'const x = 5';
      const selection = TextSelection.collapsed(7);
      const result = service.applyInlineCode(content, selection);

      expect(result.formattedContent).toBe('const x`文本` = 5');
    });

    it('应该处理包含空格的代码', () => {
      const content = 'use const value';
      const selection = TextSelection.create(4, 15, 'const value');
      const result = service.applyInlineCode(content, selection);

      expect(result.formattedContent).toBe('use `const value`');
    });
  });

  describe('insertHeading', () => {
    it('应该插入H1标题', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');
      const result = service.insertHeading(content, selection, 1);

      expect(result.formattedContent).toBe('# hello world');
      expect(result.newSelection.start).toBe(7);
      expect(result.newSelection.end).toBe(7);
    });

    it('应该插入H2标题', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');
      const result = service.insertHeading(content, selection, 2);

      expect(result.formattedContent).toBe('## hello world');
    });

    it('应该插入H6标题', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');
      const result = service.insertHeading(content, selection, 6);

      expect(result.formattedContent).toBe('###### hello world');
    });

    it('应该拒绝无效的标题级别（>6）', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');

      expect(() => service.insertHeading(content, selection, 7)).toThrow('Heading level must be between 1 and 6');
    });

    it('应该拒绝无效的标题级别（<1）', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');

      expect(() => service.insertHeading(content, selection, 0)).toThrow('Heading level must be between 1 and 6');
    });

    it('应该处理多行标题', () => {
      const content = 'line1\nline2';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.insertHeading(content, selection, 3);

      expect(result.formattedContent).toBe('### line1\nline2');
    });

    it('应该在行首插入标题标记', () => {
      const content = '  indented text';
      const selection = TextSelection.create(2, 14, 'indented text');
      const result = service.insertHeading(content, selection, 2);

      expect(result.formattedContent).toBe('##   indented text');
    });
  });

  describe('insertBlockquote', () => {
    it('应该插入引用标记', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 11, 'hello world');
      const result = service.insertBlockquote(content, selection);

      expect(result.formattedContent).toBe('> hello world');
      expect(result.newSelection.start).toBe(13);
      expect(result.newSelection.end).toBe(13);
    });

    it('应该处理空选区', () => {
      const content = 'hello world';
      const selection = TextSelection.collapsed(5);
      const result = service.insertBlockquote(content, selection);

      expect(result.formattedContent).toBe('hello> 引用内容 world');
    });

    it('应该为多行文本的每行添加引用标记', () => {
      const content = 'line1\nline2\nline3';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.insertBlockquote(content, selection);

      expect(result.formattedContent).toBe('> line1\n> line2\n> line3');
    });

    it('应该处理包含空行的多行文本', () => {
      const content = 'line1\n\nline3';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.insertBlockquote(content, selection);

      expect(result.formattedContent).toBe('> line1\n> \n> line3');
    });
  });

  describe('insertCodeBlock', () => {
    it('应该插入无语言标记的代码块', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');
      const result = service.insertCodeBlock(content, selection);

      expect(result.formattedContent).toBe('```\nhello\n``` world');
      expect(result.newSelection.start).toBe(13);
      expect(result.newSelection.end).toBe(13);
    });

    it('应该插入带语言标记的代码块', () => {
      const content = 'const x = 5';
      const selection = TextSelection.create(0, 11, 'const x = 5');
      const result = service.insertCodeBlock(content, selection, 'javascript');

      expect(result.formattedContent).toBe('```javascript\nconst x = 5\n```');
    });

    it('应该处理空选区', () => {
      const content = 'hello world';
      const selection = TextSelection.collapsed(5);
      const result = service.insertCodeBlock(content, selection);

      expect(result.formattedContent).toBe('hello```\n代码\n``` world');
    });

    it('应该处理多行代码', () => {
      const content = 'line1\nline2';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.insertCodeBlock(content, selection, 'python');

      expect(result.formattedContent).toBe('```python\nline1\nline2\n```');
    });

    it('应该处理特殊语言标记', () => {
      const content = 'code';
      const selection = TextSelection.create(0, 4, 'code');
      const result = service.insertCodeBlock(content, selection, 'c++');

      expect(result.formattedContent).toBe('```c++\ncode\n```');
    });
  });

  describe('edge cases', () => {
    it('应该处理空内容', () => {
      const content = '';
      const selection = TextSelection.collapsed(0);
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('**文本**');
    });

    it('应该处理只有空格的内容', () => {
      const content = '   ';
      const selection = TextSelection.create(0, 3, '   ');
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('**   **');
    });

    it('应该处理Unicode字符', () => {
      const content = '你好🌍世界';
      const selection = TextSelection.create(0, 4, '你好🌍');
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('**你好🌍**世界');
    });

    it('应该处理包含特殊Markdown字符的文本', () => {
      const content = '*italic* and **bold**';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('***italic* and **bold****');
    });

    it('应该正确计算新光标位置', () => {
      const content = 'hello world';
      const selection = TextSelection.create(0, 5, 'hello');
      const result = service.applyBold(content, selection);

      // 新光标位置 = 原start + **前缀长度 + 原文本长度 + **后缀长度
      // 0 + 2 + 5 + 2 = 9
      expect(result.cursorPosition).toBe(9);
    });
  });

  describe('complex scenarios', () => {
    it('应该连续应用多个格式', () => {
      const content = 'hello world';
      let selection = TextSelection.create(0, 5, 'hello');

      // 应用加粗
      let result = service.applyBold(content, selection);
      expect(result.formattedContent).toBe('**hello** world');

      // 应用斜体（模拟用户再次选中文本）
      selection = TextSelection.create(0, 9, '**hello**');
      result = service.applyItalic(result.formattedContent, selection);

      expect(result.formattedContent).toBe('***hello*** world');
    });

    it('应该处理文档中间的格式化', () => {
      const content = 'start middle end';
      const selection = TextSelection.create(6, 12, 'middle');
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('start **middle** end');
    });

    it('应该处理文档末尾的格式化', () => {
      const content = 'start text';
      const selection = TextSelection.create(6, 10, 'text');
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('start **text**');
    });

    it('应该处理包含链接的文本', () => {
      const content = 'check [link](url)';
      const selection = TextSelection.create(6, 17, '[link](url)');
      const result = service.applyBold(content, selection);

      expect(result.formattedContent).toBe('check **[link](url)**');
    });
  });
});
