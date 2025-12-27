import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VariableMerger } from '../variable-merger.service';
import { FrontmatterParser } from '../frontmatter-parser.service';
import { FolderVariableResolver } from '../folder-variable-resolver.service';

describe('VariableMerger', () => {
  let merger: VariableMerger;
  let frontmatterParser: FrontmatterParser;
  let folderResolver: FolderVariableResolver;

  beforeEach(() => {
    vi.useFakeTimers();
    frontmatterParser = new FrontmatterParser();
    folderResolver = new FolderVariableResolver();
    merger = new VariableMerger(frontmatterParser, folderResolver);

    // 模拟 electronAPI
    const mockElectronAPI = {
      file: {
        read: vi.fn(),
        write: vi.fn(),
        delete: vi.fn(),
        getStats: vi.fn()
      }
    };
    (window as any).electronAPI = mockElectronAPI;
  });

  describe('mergeVariables', () => {
    it('应该合并全局变量、文件夹变量和文档变量', async () => {
      const context = {
        globalVariables: { globalVar: 'global' },
        documentPath: '/project',
        documentContent: `---
variables:
  docVar: document
---

Content`
      };

      // 模拟文件夹变量
      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        folderVar: 'folder'
      });

      const result = await merger.mergeVariables(context);

      expect(result).toEqual({
        globalVar: 'global',
        folderVar: 'folder',
        docVar: 'document'
      });
    });

    it('应该正确处理变量优先级', async () => {
      const context = {
        globalVariables: { name: 'global', value: '1' },
        documentPath: '/project',
        documentContent: `---
variables:
  name: document
  value: 2
---

Content`
      };

      // 文件夹变量
      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        name: 'folder',
        value: '1.5'
      });

      const result = await merger.mergeVariables(context);

      // 文档变量优先级最高
      expect(result.name).toBe('document');
      expect(result.value).toBe(2);
    });

    it('应该让运行时变量覆盖所有其他变量', async () => {
      const context = {
        globalVariables: { name: 'global' },
        documentPath: '/project',
        documentContent: `---
variables:
  name: document
---

Content`,
        runtimeVariables: { name: 'runtime' }
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        name: 'folder'
      });

      const result = await merger.mergeVariables(context);

      expect(result.name).toBe('runtime');
    });

    it('应该使用缓存', async () => {
      const context = {
        documentPath: '/project',
        documentContent: `---
variables:
  name: test
---

Content`
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        folderVar: 'folder'
      });

      // 第一次调用
      const result1 = await merger.mergeVariables(context);
      // 第二次调用
      const result2 = await merger.mergeVariables(context);

      expect(result1).toEqual(result2);
      // folderResolver应该只被调用一次（缓存生效）
      expect(folderResolver.resolveInheritedVariables).toHaveBeenCalledTimes(1);
    });

    it('应该在缓存过期后重新计算', async () => {
      const context = {
        documentPath: '/project',
        documentContent: `---
variables:
  name: test
---

Content`
      };

      const resolveSpy = vi.spyOn(folderResolver, 'resolveInheritedVariables')
        .mockResolvedValueOnce({ folderVar: 'folder1' })
        .mockResolvedValueOnce({ folderVar: 'folder2' });

      // 第一次调用
      const result1 = await merger.mergeVariables(context);

      // 等待缓存过期（模拟时间流逝）
      vi.advanceTimersByTime(61000);

      // 第二次调用
      const result2 = await merger.mergeVariables(context);

      expect(result1.folderVar).toBe('folder1');
      expect(result2.folderVar).toBe('folder2');
    });

    it('应该处理空上下文', async () => {
      const context = {};

      const result = await merger.mergeVariables(context);

      expect(result).toEqual({});
    });

    it('应该处理只有全局变量的情况', async () => {
      const context = {
        globalVariables: { name: 'global', version: '1.0.0' }
      };

      const result = await merger.mergeVariables(context);

      expect(result).toEqual({
        name: 'global',
        version: '1.0.0'
      });
    });

    it('应该处理只有文档变量的情况', async () => {
      const context = {
        documentContent: `---
variables:
  name: document
---

Content`
      };

      const result = await merger.mergeVariables(context);

      expect(result).toEqual({ name: 'document' });
    });

    it('应该处理只有文件夹变量的情况', async () => {
      const context = {
        documentPath: '/project'
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        folderVar: 'folder'
      });

      const result = await merger.mergeVariables(context);

      expect(result).toEqual({ folderVar: 'folder' });
    });

    it('应该优雅处理错误', async () => {
      const context = {
        documentPath: '/project',
        documentContent: `---
variables:
  name: test
---

Content`
      };

      // 模拟文件夹变量解析失败
      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockRejectedValue(
        new Error('Read error')
      );

      const result = await merger.mergeVariables(context);

      // 应该仍然返回文档变量
      expect(result.name).toBe('test');
    });
  });

  describe('clearCache', () => {
    it('应该清除所有缓存', async () => {
      const context = {
        documentPath: '/project',
        documentContent: `---
variables:
  name: test
---

Content`
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        folderVar: 'folder'
      });

      // 第一次调用
      await merger.mergeVariables(context);

      // 清除缓存
      merger.clearCache();

      // 第二次调用应该重新计算
      await merger.mergeVariables(context);

      expect(folderResolver.resolveInheritedVariables).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearExpiredCache', () => {
    it('应该只清除过期的缓存', async () => {
      const context = {
        documentPath: '/project',
        documentContent: `---
variables:
  name: test
---

Content`
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        folderVar: 'folder'
      });

      // 第一次调用
      await merger.mergeVariables(context);

      // 清除过期缓存（应该没有过期的）
      merger.clearExpiredCache();

      // 第二次调用应该使用缓存
      await merger.mergeVariables(context);

      expect(folderResolver.resolveInheritedVariables).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVariableSources', () => {
    it('应该返回所有变量来源', async () => {
      const context = {
        globalVariables: { globalVar: 'global' },
        documentPath: '/project',
        documentContent: `---
variables:
  docVar: document
---

Content`
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        folderVar: 'folder'
      });

      const sources = await merger.getVariableSources(context);

      expect(sources.global).toEqual({ globalVar: 'global' });
      expect(sources.folder).toEqual({ folderVar: 'folder' });
      expect(sources.document).toEqual({ docVar: 'document' });
      expect(sources.runtime).toEqual({});
    });

    it('应该包含运行时变量', async () => {
      const context = {
        runtimeVariables: { runtimeVar: 'runtime' }
      };

      const sources = await merger.getVariableSources(context);

      expect(sources.runtime).toEqual({ runtimeVar: 'runtime' });
    });

    it('应该优雅处理错误', async () => {
      const context = {
        documentPath: '/project',
        documentContent: 'invalid content'
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockRejectedValue(
        new Error('Error')
      );

      const sources = await merger.getVariableSources(context);

      expect(sources.document).toBeDefined();
      expect(sources.folder).toBeDefined();
    });
  });

  describe('getVariableOrigin', () => {
    it('应该识别运行时变量', async () => {
      const context = {
        runtimeVariables: { name: 'runtime' }
      };

      const origin = await merger.getVariableOrigin(context, 'name');

      expect(origin).toBe('runtime');
    });

    it('应该识别文档变量', async () => {
      const context = {
        documentContent: `---
variables:
  name: document
---

Content`
      };

      const origin = await merger.getVariableOrigin(context, 'name');

      expect(origin).toBe('document');
    });

    it('应该识别文件夹变量', async () => {
      const context = {
        documentPath: '/project'
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        name: 'folder'
      });

      const origin = await merger.getVariableOrigin(context, 'name');

      expect(origin).toBe('folder');
    });

    it('应该识别全局变量', async () => {
      const context = {
        globalVariables: { name: 'global' }
      };

      const origin = await merger.getVariableOrigin(context, 'name');

      expect(origin).toBe('global');
    });

    it('应该返回undefined对于未定义的变量', async () => {
      const context = {};

      const origin = await merger.getVariableOrigin(context, 'nonexistent');

      expect(origin).toBe('undefined');
    });

    it('应该正确处理优先级', async () => {
      const context = {
        globalVariables: { name: 'global' },
        documentPath: '/project',
        documentContent: `---
variables:
  name: document
---

Content`,
        runtimeVariables: { name: 'runtime' }
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        name: 'folder'
      });

      const origin = await merger.getVariableOrigin(context, 'name');

      expect(origin).toBe('runtime');
    });
  });

  describe('边界情况', () => {
    it('应该处理复杂的嵌套变量', async () => {
      const context = {
        globalVariables: {
          nested: { level1: 'global' }
        },
        documentContent: `---
variables:
  nested:
    level1: document
    level2: value
---

Content`
      };

      const result = await merger.mergeVariables(context);

      expect(result.nested.level1).toBe('document');
      expect(result.nested.level2).toBe('value');
    });

    it('应该处理数组类型的变量', async () => {
      const context = {
        globalVariables: {
          tags: ['global1', 'global2']
        },
        documentContent: `---
variables:
  tags:
    - doc1
    - doc2
---

Content`
      };

      const result = await merger.mergeVariables(context);

      expect(result.tags).toEqual(['doc1', 'doc2']);
    });

    it('应该处理不同类型的变量值', async () => {
      const context = {
        documentContent: `---
variables:
  stringVar: text
  numberVar: 42
  boolVar: true
  nullVar: null
---

Content`
      };

      const result = await merger.mergeVariables(context);

      expect(result.stringVar).toBe('text');
      expect(result.numberVar).toBe(42);
      expect(result.boolVar).toBe(true);
      expect(result.nullVar).toBe(null);
    });

    it('应该处理大量的变量', async () => {
      const manyVars = {};
      for (let i = 0; i < 100; i++) {
        manyVars[`var${i}`] = `value${i}`;
      }

      const context = {
        globalVariables: manyVars,
        documentContent: `---
variables:
  var0: override
---

Content`
      };

      const result = await merger.mergeVariables(context);

      expect(result.var0).toBe('override');
      expect(result.var99).toBe('value99');
      expect(Object.keys(result).length).toBe(100);
    });

    it('应该处理特殊字符的变量名', async () => {
      const context = {
        documentContent: `---
variables:
  user_name: John
  test_123: value
---

Content`
      };

      const result = await merger.mergeVariables(context);

      expect(result.user_name).toBe('John');
      expect(result.test_123).toBe('value');
    });

    it('应该处理空字符串变量值', async () => {
      const context = {
        globalVariables: { name: '' },
        documentContent: `---
variables:
  name: ''
  empty: ''
---

Content`
      };

      const result = await merger.mergeVariables(context);

      expect(result.name).toBe('');
      expect(result.empty).toBe('');
    });
  });

  describe('缓存行为', () => {
    it('应该为不同的上下文创建不同的缓存', async () => {
      const context1 = {
        documentPath: '/project1',
        documentContent: `---
variables:
  name: project1
---

Content`
      };

      const context2 = {
        documentPath: '/project2',
        documentContent: `---
variables:
  name: project2
---

Content`
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables')
        .mockResolvedValueOnce({ folderVar: 'folder1' })
        .mockResolvedValueOnce({ folderVar: 'folder2' });

      const result1 = await merger.mergeVariables(context1);
      const result2 = await merger.mergeVariables(context2);

      expect(result1.name).toBe('project1');
      expect(result2.name).toBe('project2');
      expect(folderResolver.resolveInheritedVariables).toHaveBeenCalledTimes(2);
    });

    it('应该忽略运行时变量在缓存键中', async () => {
      const context1 = {
        documentPath: '/project',
        documentContent: `---
variables:
  name: test
---

Content`,
        runtimeVariables: { temp: 'value1' }
      };

      const context2 = {
        documentPath: '/project',
        documentContent: `---
variables:
  name: test
---

Content`,
        runtimeVariables: { temp: 'value2' }
      };

      vi.spyOn(folderResolver, 'resolveInheritedVariables').mockResolvedValue({
        folderVar: 'folder'
      });

      await merger.mergeVariables(context1);
      await merger.mergeVariables(context2);

      // 应该使用缓存，因为文档路径和内容相同
      expect(folderResolver.resolveInheritedVariables).toHaveBeenCalledTimes(1);
    });
  });
});
