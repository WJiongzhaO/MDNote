import { describe, it, expect, beforeEach } from 'vitest';
import { InsertContentService } from '../insert-content.service';
import { TextSelection } from '../text-selection.vo';

describe('InsertContentService', () => {
  let service: InsertContentService;

  beforeEach(() => {
    service = new InsertContentService();
  });

  describe('insertLink', () => {
    it('应该插入基础链接', () => {
      const content = 'visit example';
      const selection = TextSelection.create(0, 7, 'visit example');
      const result = service.insertLink(content, selection, 'https://example.com', 'Example');

      expect(result.formattedContent).toBe('[Example](https://example.com)');
      expect(result.cursorPosition).toBe(26);
    });

    it('应该使用选中文本作为链接文本', () => {
      const content = 'click here';
      const selection = TextSelection.create(6, 10, 'here');
      const result = service.insertLink(content, selection, 'https://test.com');

      expect(result.formattedContent).toBe('click [here](https://test.com)');
      expect(result.cursorPosition).toBe(25);
    });

    it('应该处理空选区', () => {
      const content = 'hello world';
      const selection = TextSelection.collapsed(5);
      const result = service.insertLink(content, selection);

      expect(result.formattedContent).toBe('hello[链接文本](https://) world');
    });

    it('应该使用默认URL', () => {
      const content = 'link';
      const selection = TextSelection.create(0, 4, 'link');
      const result = service.insertLink(content, selection);

      expect(result.formattedContent).toBe('[link](https://)');
    });

    it('应该处理包含空格的URL', () => {
      const content = 'text';
      const selection = TextSelection.create(0, 4, 'text');
      const result = service.insertLink(content, selection, 'https://example.com/test path', 'Test');

      expect(result.formattedContent).toBe('[Test](https://example.com/test path)');
    });

    it('应该处理特殊字符的URL', () => {
      const content = 'link';
      const selection = TextSelection.create(0, 4, 'link');
      const result = service.insertLink(content, selection, 'https://example.com?param=value&other=123', 'Search');

      expect(result.formattedContent).toBe('[Search](https://example.com?param=value&other=123)');
    });
  });

  describe('insertImage', () => {
    it('应该插入基础图片', () => {
      const content = 'check image';
      const selection = TextSelection.create(0, 11, 'check image');
      const result = service.insertImage(content, selection, 'https://example.com/img.png', 'Example Image');

      expect(result.formattedContent).toBe('\n![Example Image](https://example.com/img.png)\n');
      expect(result.cursorPosition).toBe(40);
    });

    it('应该使用默认图片描述', () => {
      const content = 'hello world';
      const selection = TextSelection.collapsed(5);
      const result = service.insertImage(content, selection, 'https://example.com/pic.jpg');

      expect(result.formattedContent).toBe('hello\n![图片描述](https://example.com/pic.jpg)\n world');
    });

    it('应该使用默认URL', () => {
      const content = 'text';
      const selection = TextSelection.create(0, 4, 'text');
      const result = service.insertImage(content, selection);

      expect(result.formattedContent).toBe('\n![图片描述](https://)\n');
    });

    it('应该处理相对路径', () => {
      const content = 'image';
      const selection = TextSelection.create(0, 5, 'image');
      const result = service.insertImage(content, selection, './images/pic.png', 'My Image');

      expect(result.formattedContent).toBe('\n![My Image](./images/pic.png)\n');
    });

    it('应该处理包含空格的Alt文本', () => {
      const content = 'text';
      const selection = TextSelection.create(0, 4, 'text');
      const result = service.insertImage(content, selection, 'url', 'A beautiful sunset');

      expect(result.formattedContent).toBe('\n![A beautiful sunset](url)\n');
    });
  });

  describe('insertTable', () => {
    it('应该插入默认3列2行的表格', () => {
      const content = 'insert table';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTable(content, selection);

      expect(result.formattedContent).toContain('| 列1 | 列2 | 列3 |');
      expect(result.formattedContent).toContain('|-----|-----|-----|');
      expect(result.formattedContent).toContain('|     |     |     |');
      expect(result.formattedContent).toMatch(/\|.*\|/);
    });

    it('应该插入自定义列数的表格', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTable(content, selection, 5);

      const lines = result.formattedContent.split('\n');
      expect(lines[1]).toContain('| 列1 | 列2 | 列3 | 列4 | 列5 |');
    });

    it('应该插入自定义行数的表格', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTable(content, selection, 3, 5);

      const lines = result.formattedContent.split('\n');
      // 表头 + 分隔线 + 5行数据 = 7行
      expect(lines.length).toBe(7);
    });

    it('应该处理单列表格', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTable(content, selection, 1);

      expect(result.formattedContent).toContain('| 列1 |');
      expect(result.formattedContent).toContain('|-----|');
    });

    it('应该处理大表格', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTable(content, selection, 10, 20);

      const lines = result.formattedContent.split('\n');
      expect(lines.length).toBe(22); // 表头 + 分隔线 + 20行
    });
  });

  describe('insertUnorderedList', () => {
    it('应该插入无序列表', () => {
      const content = 'items';
      const selection = TextSelection.create(0, 5, 'items');
      const result = service.insertUnorderedList(content, selection);

      expect(result.formattedContent).toBe('\n- items\n');
    });

    it('应该为多行文本的每行添加列表标记', () => {
      const content = 'item1\nitem2\nitem3';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.insertUnorderedList(content, selection);

      expect(result.formattedContent).toBe('\n- item1\n- item2\n- item3\n');
    });

    it('应该处理空选区', () => {
      const content = 'hello world';
      const selection = TextSelection.collapsed(5);
      const result = service.insertUnorderedList(content, selection);

      expect(result.formattedContent).toBe('hello\n- 列表项\n world');
    });

    it('应该处理包含空行的多行文本', () => {
      const content = 'item1\n\nitem3';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.insertUnorderedList(content, selection);

      expect(result.formattedContent).toBe('\n- item1\n- \n- item3\n');
    });

    it('应该正确计算新光标位置', () => {
      const content = 'item';
      const selection = TextSelection.create(0, 4, 'item');
      const result = service.insertUnorderedList(content, selection);

      expect(result.cursorPosition).toBe(8); // \n- item\n 的长度
    });
  });

  describe('insertOrderedList', () => {
    it('应该插入有序列表', () => {
      const content = 'items';
      const selection = TextSelection.create(0, 5, 'items');
      const result = service.insertOrderedList(content, selection);

      expect(result.formattedContent).toBe('\n1. items\n');
    });

    it('应该为多行文本添加编号', () => {
      const content = 'first\nsecond\nthird';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.insertOrderedList(content, selection);

      expect(result.formattedContent).toBe('\n1. first\n2. second\n3. third\n');
    });

    it('应该处理空选区', () => {
      const content = 'hello world';
      const selection = TextSelection.collapsed(5);
      const result = service.insertOrderedList(content, selection);

      expect(result.formattedContent).toBe('hello\n1. 列表项\n world');
    });

    it('应该正确编号超过10项', () => {
      const items = Array.from({ length: 15 }, (_, i) => `item${i + 1}`).join('\n');
      const content = items;
      const selection = TextSelection.create(0, content.length, content);
      const result = service.insertOrderedList(content, selection);

      expect(result.formattedContent).toContain('10. item10');
      expect(result.formattedContent).toContain('11. item11');
      expect(result.formattedContent).toContain('15. item15');
    });

    it('应该处理包含空行的多行文本', () => {
      const content = 'item1\n\nitem3';
      const selection = TextSelection.create(0, content.length, content);
      const result = service.insertOrderedList(content, selection);

      expect(result.formattedContent).toBe('\n1. item1\n2. \n3. item3\n');
    });
  });

  describe('insertTaskList', () => {
    it('应该插入默认任务列表', () => {
      const content = 'tasks';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTaskList(content, selection);

      expect(result.formattedContent).toBe('\n- [ ] 任务1\n- [ ] 任务2\n');
    });

    it('应该插入自定义任务列表', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTaskList(content, selection, ['Buy milk', 'Walk dog', 'Code']);

      expect(result.formattedContent).toBe('\n- [ ] Buy milk\n- [ ] Walk dog\n- [ ] Code\n');
    });

    it('应该处理单个任务', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTaskList(content, selection, ['Only task']);

      expect(result.formattedContent).toBe('\n- [ ] Only task\n');
    });

    it('应该处理空任务数组', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTaskList(content, selection, []);

      expect(result.formattedContent).toBe('\n\n');
    });

    it('应该处理包含特殊字符的任务', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(0);
      const result = service.insertTaskList(content, selection, ['Task with *asterisk*', 'Task with _underscore_']);

      expect(result.formattedContent).toBe('\n- [ ] Task with *asterisk*\n- [ ] Task with _underscore_\n');
    });
  });

  describe('insertHorizontalRule', () => {
    it('应该插入水平分隔线', () => {
      const content = 'above below';
      const selection = TextSelection.collapsed(5);
      const result = service.insertHorizontalRule(content, selection);

      expect(result.formattedContent).toBe('above\n---\n below');
      expect(result.cursorPosition).toBe(10);
    });

    it('应该在开头插入分隔线', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(0);
      const result = service.insertHorizontalRule(content, selection);

      expect(result.formattedContent).toBe('\n---\ntext');
    });

    it('应该在末尾插入分隔线', () => {
      const content = 'text';
      const selection = TextSelection.collapsed(4);
      const result = service.insertHorizontalRule(content, selection);

      expect(result.formattedContent).toBe('text\n---\n');
    });

    it('应该处理空内容', () => {
      const content = '';
      const selection = TextSelection.collapsed(0);
      const result = service.insertHorizontalRule(content, selection);

      expect(result.formattedContent).toBe('\n---\n');
    });

    it('应该处理多行内容', () => {
      const content = 'line1\nline2';
      const selection = TextSelection.collapsed(6);
      const result = service.insertHorizontalRule(content, selection);

      expect(result.formattedContent).toBe('line1\n---\nline2');
    });
  });

  describe('edge cases', () => {
    it('应该处理空内容', () => {
      const content = '';
      const selection = TextSelection.collapsed(0);
      const result = service.insertLink(content, selection);

      expect(result.formattedContent).toBe('[链接文本](https://)');
    });

    it('应该处理Unicode字符', () => {
      const content = '你好世界';
      const selection = TextSelection.create(0, 4, '你好世界');
      const result = service.insertLink(content, selection, 'https://example.com', '测试');

      expect(result.formattedContent).toBe('[测试](https://example.com)');
    });

    it('应该处理包含emoji的内容', () => {
      const content = '🌍🌎🌏';
      const selection = TextSelection.create(0, 3, '🌍🌎🌏');
      const result = service.insertUnorderedList(content, selection);

      expect(result.formattedContent).toBe('\n- 🌍🌎🌏\n');
    });

    it('应该处理超长文本', () => {
      const longText = 'a'.repeat(10000);
      const content = longText;
      const selection = TextSelection.create(0, longText.length, longText);
      const result = service.insertLink(content, selection, 'url', 'link');

      expect(result.formattedContent).toBe('[link](url)');
    });
  });

  describe('complex scenarios', () => {
    it('应该在文档中间插入链接', () => {
      const content = 'start and end';
      const selection = TextSelection.create(6, 9, 'and');
      const result = service.insertLink(content, selection, 'https://example.com');

      expect(result.formattedContent).toBe('start [and](https://example.com) end');
    });

    it('应该连续插入多个列表', () => {
      let content = '';
      let selection = TextSelection.collapsed(0);

      // 插入第一个列表
      let result = service.insertUnorderedList(content, selection);
      content = result.formattedContent;

      // 在末尾插入第二个列表
      selection = TextSelection.collapsed(content.length);
      result = service.insertUnorderedList(content, selection);

      expect(result.formattedContent).toContain('- 列表项');
      expect(result.formattedContent.split('- 列表项').length).toBe(3); // 两个列表
    });

    it('应该处理已有链接的内容', () => {
      const content = 'Text with [existing](link)';
      const selection = TextSelection.create(9, 24, '[existing](link)');
      const result = service.insertLink(content, selection, 'https://new.com', 'new');

      expect(result.formattedContent).toBe('Text with [new](https://new.com)(link)');
    });
  });
});
