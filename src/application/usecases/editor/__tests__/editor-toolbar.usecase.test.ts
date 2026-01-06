import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorToolbarUseCase } from '../editor-toolbar.usecase';
import { FormatEditorService } from '@/domain/services/editor/format-editor.service';
import { InsertContentService } from '@/domain/services/editor/insert-content.service';
import type { FormatRequest, InsertRequest } from '../editor-toolbar.usecase';

describe('EditorToolbarUseCase', () => {
  let useCase: EditorToolbarUseCase;
  let formatService: FormatEditorService;
  let insertService: InsertContentService;

  beforeEach(() => {
    formatService = new FormatEditorService();
    insertService = new InsertContentService();
    useCase = new EditorToolbarUseCase(formatService, insertService);
  });

  describe('applyFormat - 加粗', () => {
    it('应该应用加粗格式', () => {
      const request: FormatRequest = {
        content: 'hello world',
        selection: {
          start: 0,
          end: 5,
          text: 'hello'
        }
      };

      const result = useCase.applyFormat(request, 'bold');

      expect(result.content).toBe('**hello** world');
      expect(result.newCursorPosition).toBeGreaterThan(0);
    });

    it('应该处理空选区', () => {
      const request: FormatRequest = {
        content: 'hello world',
        selection: {
          start: 5,
          end: 5,
          text: ''
        }
      };

      const result = useCase.applyFormat(request, 'bold');

      expect(result.content).toContain('**');
    });
  });

  describe('applyFormat - 斜体', () => {
    it('应该应用斜体格式', () => {
      const request: FormatRequest = {
        content: 'hello world',
        selection: {
          start: 0,
          end: 5,
          text: 'hello'
        }
      };

      const result = useCase.applyFormat(request, 'italic');

      expect(result.content).toBe('*hello* world');
    });
  });

  describe('applyFormat - 删除线', () => {
    it('应该应用删除线格式', () => {
      const request: FormatRequest = {
        content: 'hello world',
        selection: {
          start: 0,
          end: 5,
          text: 'hello'
        }
      };

      const result = useCase.applyFormat(request, 'strikethrough');

      expect(result.content).toBe('~~hello~~ world');
    });
  });

  describe('applyFormat - 行内代码', () => {
    it('应该应用行内代码格式', () => {
      const request: FormatRequest = {
        content: 'const x = 5',
        selection: {
          start: 6,
          end: 7,
          text: 'x'
        }
      };

      const result = useCase.applyFormat(request, 'code');

      expect(result.content).toBe('const `x` = 5');
    });
  });

  describe('applyFormat - 标题', () => {
    it('应该应用H1标题', () => {
      const request: FormatRequest = {
        content: 'hello world',
        selection: {
          start: 0,
          end: 11,
          text: 'hello world'
        },
        data: { level: 1 }
      };

      const result = useCase.applyFormat(request, 'heading');

      expect(result.content).toBe('# hello world');
    });

    it('应该应用H2标题', () => {
      const request: FormatRequest = {
        content: 'hello world',
        selection: {
          start: 0,
          end: 11,
          text: 'hello world'
        },
        data: { level: 2 }
      };

      const result = useCase.applyFormat(request, 'heading');

      expect(result.content).toBe('## hello world');
    });

    it('应该使用默认级别1', () => {
      const request: FormatRequest = {
        content: 'hello world',
        selection: {
          start: 0,
          end: 11,
          text: 'hello world'
        }
      };

      const result = useCase.applyFormat(request, 'heading');

      expect(result.content).toBe('# hello world');
    });
  });

  describe('applyFormat - 引用块', () => {
    it('应该插入引用块', () => {
      const request: FormatRequest = {
        content: 'hello world',
        selection: {
          start: 0,
          end: 11,
          text: 'hello world'
        }
      };

      const result = useCase.applyFormat(request, 'blockquote');

      expect(result.content).toBe('> hello world');
    });

    it('应该处理多行引用', () => {
      const request: FormatRequest = {
        content: 'line1\nline2',
        selection: {
          start: 0,
          end: 11,
          text: 'line1\nline2'
        }
      };

      const result = useCase.applyFormat(request, 'blockquote');

      expect(result.content).toBe('> line1\n> line2');
    });
  });

  describe('applyFormat - 代码块', () => {
    it('应该插入无语言标记的代码块', () => {
      const request: FormatRequest = {
        content: 'hello',
        selection: {
          start: 0,
          end: 5,
          text: 'hello'
        }
      };

      const result = useCase.applyFormat(request, 'codeblock');

      expect(result.content).toBe('```\nhello\n```');
    });

    it('应该插入带语言标记的代码块', () => {
      const request: FormatRequest = {
        content: 'const x = 5',
        selection: {
          start: 0,
          end: 11,
          text: 'const x = 5'
        },
        data: { language: 'javascript' }
      };

      const result = useCase.applyFormat(request, 'codeblock');

      expect(result.content).toBe('```javascript\nconst x = 5\n```');
    });

    it('应该使用空语言作为默认值', () => {
      const request: FormatRequest = {
        content: 'code',
        selection: {
          start: 0,
          end: 4,
          text: 'code'
        },
        data: { language: '' }
      };

      const result = useCase.applyFormat(request, 'codeblock');

      expect(result.content).toBe('```\ncode\n```');
    });
  });

  describe('applyFormat - 错误处理', () => {
    it('应该拒绝未知的格式类型', () => {
      const request: FormatRequest = {
        content: 'hello',
        selection: {
          start: 0,
          end: 5,
          text: 'hello'
        }
      };

      expect(() => useCase.applyFormat(request, 'unknown' as any)).toThrow('Unknown format type: unknown');
    });

    it('应该验证标题级别', () => {
      const request: FormatRequest = {
        content: 'hello',
        selection: {
          start: 0,
          end: 5,
          text: 'hello'
        },
        data: { level: 7 }
      };

      expect(() => useCase.applyFormat(request, 'heading')).toThrow();
    });
  });

  describe('insertContent - 链接', () => {
    it('应该插入链接', () => {
      const request: InsertRequest = {
        content: 'visit example',
        selection: {
          start: 0,
          end: 13,
          text: 'visit example'
        },
        data: {
          url: 'https://example.com',
          text: 'Example'
        }
      };

      const result = useCase.insertContent(request, 'link');

      expect(result.content).toBe('[Example](https://example.com)');
    });

    it('应该使用选中文本作为链接文本', () => {
      const request: InsertRequest = {
        content: 'click here',
        selection: {
          start: 6,
          end: 10,
          text: 'here'
        },
        data: {
          url: 'https://example.com'
        }
      };

      const result = useCase.insertContent(request, 'link');

      expect(result.content).toBe('click [here](https://example.com)');
    });

    it('应该使用默认值', () => {
      const request: InsertRequest = {
        content: 'text',
        selection: {
          start: 0,
          end: 4,
          text: 'text'
        }
      };

      const result = useCase.insertContent(request, 'link');

      expect(result.content).toBe('[text](https://)');
    });
  });

  describe('insertContent - 图片', () => {
    it('应该插入图片', () => {
      const request: InsertRequest = {
        content: 'image',
        selection: {
          start: 0,
          end: 5,
          text: 'image'
        },
        data: {
          url: 'https://example.com/pic.png',
          alt: 'Example Image'
        }
      };

      const result = useCase.insertContent(request, 'image');

      expect(result.content).toBe('\n![Example Image](https://example.com/pic.png)\n');
    });

    it('应该使用默认图片描述', () => {
      const request: InsertRequest = {
        content: 'text',
        selection: {
          start: 0,
          end: 4,
          text: 'text'
        },
        data: {
          url: 'https://example.com/pic.jpg'
        }
      };

      const result = useCase.insertContent(request, 'image');

      expect(result.content).toBe('\n![图片描述](https://example.com/pic.jpg)\n');
    });
  });

  describe('insertContent - 表格', () => {
    it('应该插入默认表格', () => {
      const request: InsertRequest = {
        content: 'table',
        selection: {
          start: 0,
          end: 5,
          text: 'table'
        }
      };

      const result = useCase.insertContent(request, 'table');

      expect(result.content).toContain('|');
      expect(result.content).toContain('列1');
    });

    it('应该插入自定义大小的表格', () => {
      const request: InsertRequest = {
        content: 'text',
        selection: {
          start: 0,
          end: 4,
          text: 'text'
        },
        data: {
          columns: 5,
          rows: 4
        }
      };

      const result = useCase.insertContent(request, 'table');

      expect(result.content).toContain('| 列1 | 列2 | 列3 | 列4 | 列5 |');
      const lines = result.content.split('\n');
      expect(lines.length).toBeGreaterThan(5); // 表头 + 分隔线 + 4行数据
    });
  });

  describe('insertContent - 无序列表', () => {
    it('应该插入无序列表', () => {
      const request: InsertRequest = {
        content: 'items',
        selection: {
          start: 0,
          end: 5,
          text: 'items'
        }
      };

      const result = useCase.insertContent(request, 'ul');

      expect(result.content).toBe('\n- items\n');
    });

    it('应该处理多行文本', () => {
      const request: InsertRequest = {
        content: 'item1\nitem2',
        selection: {
          start: 0,
          end: 11,
          text: 'item1\nitem2'
        }
      };

      const result = useCase.insertContent(request, 'ul');

      expect(result.content).toBe('\n- item1\n- item2\n');
    });
  });

  describe('insertContent - 有序列表', () => {
    it('应该插入有序列表', () => {
      const request: InsertRequest = {
        content: 'items',
        selection: {
          start: 0,
          end: 5,
          text: 'items'
        }
      };

      const result = useCase.insertContent(request, 'ol');

      expect(result.content).toBe('\n1. items\n');
    });

    it('应该为多行文本编号', () => {
      const request: InsertRequest = {
        content: 'first\nsecond\nthird',
        selection: {
          start: 0,
          end: 18,
          text: 'first\nsecond\nthird'
        }
      };

      const result = useCase.insertContent(request, 'ol');

      expect(result.content).toBe('\n1. first\n2. second\n3. third\n');
    });
  });

  describe('insertContent - 任务列表', () => {
    it('应该插入默认任务列表', () => {
      const request: InsertRequest = {
        content: 'tasks',
        selection: {
          start: 0,
          end: 5,
          text: 'tasks'
        }
      };

      const result = useCase.insertContent(request, 'tasklist');

      expect(result.content).toBe('\n- [ ] 任务1\n- [ ] 任务2\n');
    });

    it('应该插入自定义任务列表', () => {
      const request: InsertRequest = {
        content: 'text',
        selection: {
          start: 0,
          end: 4,
          text: 'text'
        },
        data: {
          items: ['Task 1', 'Task 2', 'Task 3']
        }
      };

      const result = useCase.insertContent(request, 'tasklist');

      expect(result.content).toBe('\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n');
    });
  });

  describe('insertContent - 水平分隔线', () => {
    it('应该插入水平分隔线', () => {
      const request: InsertRequest = {
        content: 'above below',
        selection: {
          start: 5,
          end: 5,
          text: ''
        }
      };

      const result = useCase.insertContent(request, 'hr');

      expect(result.content).toBe('above\n---\n below');
    });
  });

  describe('insertContent - 错误处理', () => {
    it('应该拒绝未知的插入类型', () => {
      const request: InsertRequest = {
        content: 'hello',
        selection: {
          start: 0,
          end: 5,
          text: 'hello'
        }
      };

      expect(() => useCase.insertContent(request, 'unknown' as any)).toThrow('Unknown insert type: unknown');
    });
  });

  describe('complex scenarios', () => {
    it('应该处理连续的格式操作', () => {
      let content = 'hello world';
      let request: FormatRequest = {
        content,
        selection: {
          start: 0,
          end: 5,
          text: 'hello'
        }
      };

      // 第一次加粗
      let result = useCase.applyFormat(request, 'bold');
      expect(result.content).toBe('**hello** world');

      // 第二次斜体（选中文本变化）
      content = result.content;
      request = {
        content,
        selection: {
          start: 0,
          end: 9,
          text: '**hello**'
        }
      };
      result = useCase.applyFormat(request, 'italic');

      expect(result.content).toBe('***hello*** world');
    });

    it('应该处理格式化和插入的组合', () => {
      let content = 'text';
      let request: FormatRequest = {
        content,
        selection: {
          start: 0,
          end: 4,
          text: 'text'
        }
      };

      // 先格式化
      let result = useCase.applyFormat(request, 'bold');
      content = result.content;

      // 再插入链接
      const insertRequest: InsertRequest = {
        content,
        selection: {
          start: content.length,
          end: content.length,
          text: ''
        },
        data: {
          url: 'https://example.com',
          text: 'link'
        }
      };
      result = useCase.insertContent(insertRequest, 'link');

      expect(result.content).toBe('**text**[link](https://example.com)');
    });

    it('应该正确计算光标位置', () => {
      const request: FormatRequest = {
        content: 'hello',
        selection: {
          start: 0,
          end: 5,
          text: 'hello'
        }
      };

      const result = useCase.applyFormat(request, 'bold');

      // 新光标位置应该是加粗文本之后
      expect(result.newCursorPosition).toBeGreaterThan(5);
      expect(result.newCursorPosition).toBe(result.content.length);
    });
  });

  describe('edge cases', () => {
    it('应该处理空内容', () => {
      const request: FormatRequest = {
        content: '',
        selection: {
          start: 0,
          end: 0,
          text: ''
        }
      };

      const result = useCase.applyFormat(request, 'bold');

      expect(result.content).toBe('**文本**');
    });

    it('应该处理超长内容', () => {
      const longText = 'a'.repeat(10000);
      const request: FormatRequest = {
        content: longText,
        selection: {
          start: 0,
          end: 10000,
          text: longText
        }
      };

      const result = useCase.applyFormat(request, 'bold');

      expect(result.content).toBe('**' + longText + '**');
    });

    it('应该处理特殊字符', () => {
      const request: FormatRequest = {
        content: '你好🌍世界',
        selection: {
          start: 0,
          end: 4,
          text: '你好🌍'
        }
      };

      const result = useCase.applyFormat(request, 'bold');

      expect(result.content).toBe('**你好🌍**世界');
    });
  });
});
