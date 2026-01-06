import { describe, it, expect } from 'vitest';
import { TextSelection } from '../text-selection.vo';

describe('TextSelection Value Object', () => {
  describe('create', () => {
    it('应该创建有效的文本选区', () => {
      const selection = TextSelection.create(0, 5, 'hello');

      expect(selection.start).toBe(0);
      expect(selection.end).toBe(5);
      expect(selection.text).toBe('hello');
    });

    it('应该创建折叠的选区（光标位置）', () => {
      const selection = TextSelection.collapsed(10);

      expect(selection.start).toBe(10);
      expect(selection.end).toBe(10);
      expect(selection.text).toBe('');
    });

    it('应该处理空文本', () => {
      const selection = TextSelection.create(5, 5, '');

      expect(selection.start).toBe(5);
      expect(selection.end).toBe(5);
      expect(selection.text).toBe('');
    });

    it('应该处理多行文本', () => {
      const multiLineText = 'line1\nline2\nline3';
      const selection = TextSelection.create(0, multiLineText.length, multiLineText);

      expect(selection.text).toBe(multiLineText);
      expect(selection.start).toBe(0);
      expect(selection.end).toBe(multiLineText.length);
    });
  });

  describe('contains', () => {
    it('应该判断位置在选区内', () => {
      const selection = TextSelection.create(5, 10, 'hello');

      expect(selection.contains(7)).toBe(true);
    });

    it('应该判断位置在选区外（左侧）', () => {
      const selection = TextSelection.create(5, 10, 'hello');

      expect(selection.contains(3)).toBe(false);
    });

    it('应该判断位置在选区外（右侧）', () => {
      const selection = TextSelection.create(5, 10, 'hello');

      expect(selection.contains(15)).toBe(false);
    });

    it('应该包含选区起始位置', () => {
      const selection = TextSelection.create(5, 10, 'hello');

      expect(selection.contains(5)).toBe(true);
    });

    it('应该包含选区结束位置', () => {
      const selection = TextSelection.create(5, 10, 'hello');

      expect(selection.contains(10)).toBe(true);
    });

    it('折叠选区应该只包含光标位置', () => {
      const selection = TextSelection.collapsed(5);

      expect(selection.contains(5)).toBe(true);
      expect(selection.contains(4)).toBe(false);
      expect(selection.contains(6)).toBe(false);
    });
  });

  describe('move', () => {
    it('应该向右移动选区', () => {
      const selection = TextSelection.create(5, 10, 'hello');
      const moved = selection.move(3);

      expect(moved.start).toBe(8);
      expect(moved.end).toBe(13);
      expect(moved.text).toBe('hello');
    });

    it('应该向左移动选区', () => {
      const selection = TextSelection.create(5, 10, 'hello');
      const moved = selection.move(-2);

      expect(moved.start).toBe(3);
      expect(moved.end).toBe(8);
      expect(moved.text).toBe('hello');
    });

    it('应该保持原选区不变（不可变性）', () => {
      const original = TextSelection.create(5, 10, 'hello');
      const moved = original.move(3);

      expect(original.start).toBe(5);
      expect(original.end).toBe(10);
    });

    it('移动后不应小于0', () => {
      const selection = TextSelection.create(5, 10, 'hello');
      const moved = selection.move(-10);

      expect(moved.start).toBe(0);
      expect(moved.end).toBe(0);
    });
  });

  describe('expand', () => {
    it('应该向右扩展选区', () => {
      const selection = TextSelection.create(5, 10, 'hello');
      const expanded = selection.expand(5);

      expect(expanded.start).toBe(5);
      expect(expanded.end).toBe(15);
      expect(expanded.text).toBe('hello');
    });

    it('应该向左扩展选区', () => {
      const selection = TextSelection.create(5, 10, 'hello');
      const expanded = selection.expand(-3);

      expect(expanded.start).toBe(2);
      expect(expanded.end).toBe(10);
      expect(expanded.text).toBe('hello');
    });

    it('应该保持原选区不变（不可变性）', () => {
      const original = TextSelection.create(5, 10, 'hello');
      const expanded = original.expand(5);

      expect(original.start).toBe(5);
      expect(original.end).toBe(10);
    });

    it('扩展后起始位置不应小于0', () => {
      const selection = TextSelection.create(5, 10, 'hello');
      const expanded = selection.expand(-10);

      expect(expanded.start).toBe(0);
      expect(expanded.end).toBe(10);
    });
  });

  describe('collapse', () => {
    it('应该折叠到起始位置', () => {
      const selection = TextSelection.create(5, 10, 'hello');
      const collapsed = selection.collapseToStart();

      expect(collapsed.start).toBe(5);
      expect(collapsed.end).toBe(5);
      expect(collapsed.text).toBe('');
    });

    it('应该折叠到结束位置', () => {
      const selection = TextSelection.create(5, 10, 'hello');
      const collapsed = selection.collapseToEnd();

      expect(collapsed.start).toBe(10);
      expect(collapsed.end).toBe(10);
      expect(collapsed.text).toBe('');
    });

    it('应该保持原选区不变（不可变性）', () => {
      const original = TextSelection.create(5, 10, 'hello');
      original.collapseToStart();

      expect(original.start).toBe(5);
      expect(original.end).toBe(10);
      expect(original.text).toBe('hello');
    });
  });

  describe('isEmpty', () => {
    it('折叠选区应该是空的', () => {
      const selection = TextSelection.collapsed(5);

      expect(selection.isEmpty()).toBe(true);
    });

    it('有文本的选区不应该为空', () => {
      const selection = TextSelection.create(5, 10, 'hello');

      expect(selection.isEmpty()).toBe(false);
    });

    it('长度为0的选区应该是空的', () => {
      const selection = TextSelection.create(5, 5, '');

      expect(selection.isEmpty()).toBe(true);
    });
  });

  describe('length', () => {
    it('应该正确计算选区长度', () => {
      const selection = TextSelection.create(5, 10, 'hello');

      expect(selection.length).toBe(5);
    });

    it('折叠选区长度应该为0', () => {
      const selection = TextSelection.collapsed(5);

      expect(selection.length).toBe(0);
    });
  });

  describe('equals', () => {
    it('应该判断相同的选区相等', () => {
      const selection1 = TextSelection.create(5, 10, 'hello');
      const selection2 = TextSelection.create(5, 10, 'hello');

      expect(selection1.equals(selection2)).toBe(true);
    });

    it('应该判断不同起始位置的选区不相等', () => {
      const selection1 = TextSelection.create(5, 10, 'hello');
      const selection2 = TextSelection.create(6, 10, 'hello');

      expect(selection1.equals(selection2)).toBe(false);
    });

    it('应该判断不同结束位置的选区不相等', () => {
      const selection1 = TextSelection.create(5, 10, 'hello');
      const selection2 = TextSelection.create(5, 11, 'hello');

      expect(selection1.equals(selection2)).toBe(false);
    });

    it('应该判断不同文本的选区不相等', () => {
      const selection1 = TextSelection.create(5, 10, 'hello');
      const selection2 = TextSelection.create(5, 10, 'world');

      expect(selection1.equals(selection2)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('应该处理负数位置', () => {
      const selection = TextSelection.create(-5, 10, 'hello');

      expect(selection.start).toBe(-5);
      expect(selection.end).toBe(10);
    });

    it('应该处理结束位置小于起始位置', () => {
      const selection = TextSelection.create(10, 5, 'hello');

      expect(selection.start).toBe(10);
      expect(selection.end).toBe(5);
    });

    it('应该处理包含特殊字符的文本', () => {
      const specialText = 'hello\n\t\rworld';
      const selection = TextSelection.create(0, specialText.length, specialText);

      expect(selection.text).toBe(specialText);
    });

    it('应该处理包含Unicode字符的文本', () => {
      const unicodeText = '你好世界🌍hello';
      const selection = TextSelection.create(0, unicodeText.length, unicodeText);

      expect(selection.text).toBe(unicodeText);
    });

    it('应该处理超长文本', () => {
      const longText = 'a'.repeat(10000);
      const selection = TextSelection.create(0, longText.length, longText);

      expect(selection.text).toBe(longText);
      expect(selection.length).toBe(10000);
    });
  });
});
