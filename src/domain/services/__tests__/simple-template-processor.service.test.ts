import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleTemplateProcessor } from '../simple-template-processor.service';
import type { VariableResolver } from '../markdown-processor.interface';

describe('SimpleTemplateProcessor', () => {
  let processor: SimpleTemplateProcessor;

  beforeEach(() => {
    processor = new SimpleTemplateProcessor();
  });

  describe('processTemplate', () => {
    it('应该替换单个变量', async () => {
      const content = 'Hello, {{name}}!';
      const variables = { name: 'World' };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('Hello, World!');
    });

    it('应该替换多个变量', async () => {
      const content = '{{projectName}} v{{version}} by {{author}}';
      const variables = {
        projectName: 'MDNote',
        version: '1.0.0',
        author: '张三'
      };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('MDNote v1.0.0 by 张三');
    });

    it('应该保持未定义的变量原样', async () => {
      const content = 'Hello, {{undefinedVar}}!';
      const variables = { name: 'World' };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('Hello, {{undefinedVar}}!');
    });

    it('应该处理空字符串变量', async () => {
      const content = 'Value: {{value}}';
      const variables = { value: '' };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('Value: ');
    });

    it('应该处理数字变量', async () => {
      const content = 'Count: {{count}}';
      const variables = { count: 42 };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('Count: 42');
    });

    it('应该处理布尔变量', async () => {
      const content = 'Enabled: {{enabled}}';
      const variables = { enabled: true };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('Enabled: true');
    });

    it('应该处理null和undefined变量', async () => {
      const content = '{{nullVar}} and {{undefinedVar}}';
      const variables = {
        nullVar: null,
        undefinedVar: undefined
      };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('{{nullVar}} and {{undefinedVar}}');
    });

    it('应该处理多行文本中的变量', async () => {
      const content = `# {{title}}

Author: {{author}}
Date: {{date}}

## Content

This is a {{type}} document.`;
      const variables = {
        title: 'Test Document',
        author: 'John Doe',
        date: '2025-12-27',
        type: 'markdown'
      };
      const result = await processor.processTemplate(content, variables);
      expect(result).toContain('# Test Document');
      expect(result).toContain('Author: John Doe');
      expect(result).toContain('Date: 2025-12-27');
      expect(result).toContain('This is a markdown document.');
    });

    it('应该处理重复的变量引用', async () => {
      const content = '{{name}} says: Hello, {{name}}!';
      const variables = { name: 'Alice' };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('Alice says: Hello, Alice!');
    });

    it('应该处理包含下划线的变量名', async () => {
      const content = '{{user_name}} and {{first_name}}';
      const variables = {
        user_name: 'john_doe',
        first_name: 'John'
      };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('john_doe and John');
    });

    it('应该处理包含数字的变量名', async () => {
      const content = '{{var1}} and {{var2}}';
      const variables = {
        var1: 'value1',
        var2: 'value2'
      };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('value1 and value2');
    });

    it('应该拒绝包含连字符的变量名', async () => {
      const content = 'Value: {{user-name}}';
      const variables = { 'user-name': 'test' };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('Value: {{user-name}}');
    });

    it('应该拒绝包含空格的变量名', async () => {
      const content = 'Value: {{user name}}';
      const variables = { 'user name': 'test' };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('Value: {{user name}}');
    });

    it('应该拒绝以数字开头的变量名', async () => {
      const content = 'Value: {{1var}}';
      const variables = { '1var': 'test' };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('Value: {{1var}}');
    });

    it('应该使用自定义变量解析器', async () => {
      const content = 'Date: {{currentDate}}';
      const variables = {};

      const mockResolver: VariableResolver = {
        resolve: vi.fn().mockResolvedValue('2025-12-27')
      };

      processor.registerVariableResolver('currentDate', mockResolver);
      const result = await processor.processTemplate(content, variables);

      expect(result).toBe('Date: 2025-12-27');
      expect(mockResolver.resolve).toHaveBeenCalledWith('currentDate', variables);
    });

    it('应该在变量解析器出错时保持原样', async () => {
      const content = 'Value: {{errorVar}}';
      const variables = {};

      const mockResolver: VariableResolver = {
        resolve: vi.fn().mockRejectedValue(new Error('Resolver error'))
      };

      processor.registerVariableResolver('errorVar', mockResolver);
      const result = await processor.processTemplate(content, variables);

      expect(result).toBe('Value: {{errorVar}}');
    });

    it('应该优先使用本地变量而不是解析器', async () => {
      const content = 'Value: {{testVar}}';
      const variables = { testVar: 'local value' };

      const mockResolver: VariableResolver = {
        resolve: vi.fn().mockResolvedValue('resolver value')
      };

      processor.registerVariableResolver('testVar', mockResolver);
      const result = await processor.processTemplate(content, variables);

      expect(result).toBe('Value: local value');
      expect(mockResolver.resolve).not.toHaveBeenCalled();
    });

    it('应该处理空内容', async () => {
      const content = '';
      const variables = { name: 'test' };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe('');
    });

    it('应该处理没有变量的内容', async () => {
      const content = 'This is plain text without variables.';
      const variables = { name: 'test' };
      const result = await processor.processTemplate(content, variables);
      expect(result).toBe(content);
    });
  });

  describe('extractVariables', () => {
    it('应该提取单个变量', () => {
      const content = 'Hello, {{name}}!';
      const variables = processor.extractVariables(content);
      expect(variables).toEqual(['name']);
    });

    it('应该提取多个变量', () => {
      const content = '{{project}} v{{version}} by {{author}}';
      const variables = processor.extractVariables(content);
      expect(variables).toEqual(['project', 'version', 'author']);
    });

    it('应该去重变量名', () => {
      const content = '{{name}} says hello to {{name}}';
      const variables = processor.extractVariables(content);
      expect(variables).toEqual(['name']);
    });

    it('应该保持变量名的顺序', () => {
      const content = '{{a}} {{b}} {{c}} {{b}} {{a}}';
      const variables = processor.extractVariables(content);
      expect(variables).toEqual(['a', 'b', 'c']);
    });

    it('应该不提取无效的变量名', () => {
      const content = '{{valid}} and {{invalid-name}} and {{1invalid}}';
      const variables = processor.extractVariables(content);
      expect(variables).toEqual(['valid']);
    });

    it('应该提取带下划线和数字的变量名', () => {
      const content = '{{user_name}} {{var1}} {{test_2}}';
      const variables = processor.extractVariables(content);
      expect(variables).toEqual(['user_name', 'var1', 'test_2']);
    });

    it('应该处理空内容', () => {
      const content = '';
      const variables = processor.extractVariables(content);
      expect(variables).toEqual([]);
    });

    it('应该处理没有变量的内容', () => {
      const content = 'This is plain text.';
      const variables = processor.extractVariables(content);
      expect(variables).toEqual([]);
    });
  });

  describe('validateVariableName', () => {
    it('应该接受有效的变量名', () => {
      expect(processor.validateVariableName('name')).toBe(true);
      expect(processor.validateVariableName('user_name')).toBe(true);
      expect(processor.validateVariableName('var1')).toBe(true);
      expect(processor.validateVariableName('test_123')).toBe(true);
      expect(processor.validateVariableName('_private')).toBe(true);
    });

    it('应该拒绝无效的变量名', () => {
      expect(processor.validateVariableName('user-name')).toBe(false);
      expect(processor.validateVariableName('user name')).toBe(false);
      expect(processor.validateVariableName('1var')).toBe(false);
      expect(processor.validateVariableName('用户名')).toBe(false);
      expect(processor.validateVariableName('user@email')).toBe(false);
      expect(processor.validateVariableName('user.name')).toBe(false);
      expect(processor.validateVariableName('')).toBe(false);
    });
  });

  describe('registerVariableResolver', () => {
    it('应该注册变量解析器', () => {
      const mockResolver: VariableResolver = {
        resolve: vi.fn()
      };

      processor.registerVariableResolver('custom', mockResolver);
      // 通过 processTemplate 验证解析器已注册
      expect(async () => {
        await processor.processTemplate('{{custom}}', {});
      }).not.toThrow();
    });
  });

  describe('unregisterVariableResolver', () => {
    it('应该注销变量解析器', () => {
      const mockResolver: VariableResolver = {
        resolve: vi.fn().mockResolvedValue('value')
      };

      processor.registerVariableResolver('custom', mockResolver);
      processor.unregisterVariableResolver('custom');

      // 注销后，变量应该保持原样
      expect(async () => {
        const result = await processor.processTemplate('{{custom}}', {});
        expect(result).toBe('{{custom}}');
      });
    });
  });
});
