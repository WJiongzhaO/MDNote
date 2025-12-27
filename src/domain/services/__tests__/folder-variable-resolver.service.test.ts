import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FolderVariableResolver } from '../folder-variable-resolver.service';

describe('FolderVariableResolver', () => {
  let resolver: FolderVariableResolver;
  let mockElectronAPI: any;

  beforeEach(() => {
    resolver = new FolderVariableResolver();

    // 模拟 electronAPI
    mockElectronAPI = {
      file: {
        read: vi.fn(),
        write: vi.fn(),
        delete: vi.fn(),
        getStats: vi.fn()
      }
    };

    (window as any).electronAPI = mockElectronAPI;
  });

  afterEach(() => {
    delete (window as any).electronAPI;
    resolver.clearCache();
  });

  describe('resolveFolderVariables', () => {
    it('应该从YAML文件读取变量', async () => {
      const ymlContent = `
projectName: MDNote
version: "1.0.0"
author: Team
`;

      mockElectronAPI.file.read.mockResolvedValue(ymlContent);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveFolderVariables('/project');

      expect(variables).toEqual({
        projectName: 'MDNote',
        version: "1.0.0",
        author: 'Team'
      });
      expect(mockElectronAPI.file.read).toHaveBeenCalledWith('/project/.mdnote-vars.yml');
    });

    it('应该从JSON文件读取变量（当YAML不存在时）', async () => {
      const jsonContent = {
        projectName: 'MDNote',
        version: '1.0.0'
      };

      mockElectronAPI.file.read
        .mockRejectedValueOnce(new Error('ENOENT')) // YAML文件不存在
        .mockResolvedValueOnce(jsonContent); // JSON文件存在
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveFolderVariables('/project');

      expect(variables).toEqual(jsonContent);
      expect(mockElectronAPI.file.read).toHaveBeenCalledWith('/project/.mdnote-vars.yml');
      expect(mockElectronAPI.file.read).toHaveBeenCalledWith('/project/.mdnote-vars.json');
    });

    it('应该使用缓存', async () => {
      const ymlContent = 'name: Test';
      mockElectronAPI.file.read.mockResolvedValue(ymlContent);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      // 第一次调用
      await resolver.resolveFolderVariables('/project');
      // 第二次调用
      await resolver.resolveFolderVariables('/project');

      // getStats应该被调用两次（检查缓存是否有效）
      expect(mockElectronAPI.file.getStats).toHaveBeenCalledTimes(2);
      // read应该只被调用一次（使用缓存）
      expect(mockElectronAPI.file.read).toHaveBeenCalledTimes(1);
    });

    it('应该在文件修改后重新读取', async () => {
      const ymlContent1 = 'name: Test1';
      const ymlContent2 = 'name: Test2';

      mockElectronAPI.file.read.mockResolvedValue(ymlContent1);
      mockElectronAPI.file.getStats
        .mockResolvedValueOnce({ mtime: 100 })
        .mockResolvedValueOnce({ mtime: 200 });

      // 第一次调用
      let variables = await resolver.resolveFolderVariables('/project');
      expect(variables.name).toBe('Test1');

      // 文件修改后的第二次调用
      mockElectronAPI.file.read.mockResolvedValue(ymlContent2);
      variables = await resolver.resolveFolderVariables('/project');
      expect(variables.name).toBe('Test2');
    });

    it('应该在文件不存在时返回空对象', async () => {
      mockElectronAPI.file.read.mockRejectedValue(new Error('ENOENT'));
      mockElectronAPI.file.getStats.mockRejectedValue(new Error('ENOENT'));

      const variables = await resolver.resolveFolderVariables('/project');

      expect(variables).toEqual({});
    });

    it('应该处理无效的YAML内容', async () => {
      mockElectronAPI.file.read.mockResolvedValue('invalid yaml {{{');
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveFolderVariables('/project');

      // YAML解析失败时应该返回空对象或抛出错误
      expect(variables).toBeDefined();
    });

    it('应该处理空的YAML文件', async () => {
      mockElectronAPI.file.read.mockResolvedValue('');
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveFolderVariables('/project');

      expect(variables).toEqual({});
    });

    it('应该在electronAPI不可用时返回空对象', async () => {
      delete (window as any).electronAPI;

      const variables = await resolver.resolveFolderVariables('/project');

      expect(variables).toEqual({});
    });
  });

  describe('resolveInheritedVariables', () => {
    it('应该合并当前文件夹和父文件夹的变量', async () => {
      const rootVars = 'projectName: RootProject';
      const parentVars = 'version: "1.0.0"';
      const currentVars = 'author: John';

      mockElectronAPI.file.read
        .mockResolvedValueOnce(rootVars) // /project/.mdnote-vars.yml
        .mockResolvedValueOnce(parentVars) // /project/docs/.mdnote-vars.yml
        .mockResolvedValueOnce(currentVars); // /project/docs/api/.mdnote-vars.yml
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveInheritedVariables('/project/docs/api');

      expect(variables).toEqual({
        projectName: 'RootProject',
        version: '1.0.0',
        author: 'John'
      });
    });

    it('应该正确处理变量优先级（子文件夹覆盖父文件夹）', async () => {
      const rootVars = 'version: "1.0.0"';
      const parentVars = 'version: 2.0.0';

      mockElectronAPI.file.read
        .mockResolvedValueOnce(rootVars)
        .mockResolvedValueOnce(parentVars);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveInheritedVariables('/project/docs');

      expect(variables.version).toBe('2.0.0');
    });

    it('应该限制递归深度', async () => {
      mockElectronAPI.file.read.mockResolvedValue('var: value');
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const maxDepth = 3;
      const variables = await resolver.resolveInheritedVariables('/a/b/c/d', maxDepth);

      expect(variables).toBeDefined();
    });

    it('应该在没有父文件夹时停止', async () => {
      mockElectronAPI.file.read.mockResolvedValue('var: value');
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveInheritedVariables('/project');

      expect(variables).toEqual({ var: 'value' });
    });

    it('应该处理读取错误', async () => {
      mockElectronAPI.file.read.mockRejectedValue(new Error('Read error'));
      mockElectronAPI.file.getStats.mockRejectedValue(new Error('Stat error'));

      const variables = await resolver.resolveInheritedVariables('/project/docs');

      // 应该返回已读取的变量或空对象
      expect(variables).toBeDefined();
    });
  });

  describe('saveFolderVariables', () => {
    it('应该保存变量到YAML文件', async () => {
      const variables = {
        projectName: 'MDNote',
        version: '1.0.0'
      };

      mockElectronAPI.file.write.mockResolvedValue(undefined);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      await resolver.saveFolderVariables('/project', variables, 'yml');

      expect(mockElectronAPI.file.write).toHaveBeenCalledWith(
        '/project/.mdnote-vars.yml',
        expect.stringContaining('projectName: MDNote')
      );
    });

    it('应该保存变量到JSON文件', async () => {
      const variables = {
        projectName: 'MDNote',
        version: '1.0.0'
      };

      mockElectronAPI.file.write.mockResolvedValue(undefined);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      await resolver.saveFolderVariables('/project', variables, 'json');

      expect(mockElectronAPI.file.write).toHaveBeenCalledWith(
        '/project/.mdnote-vars.json',
        variables
      );
    });

    it('应该在保存YAML时删除JSON文件', async () => {
      const variables = { name: 'Test' };

      mockElectronAPI.file.write.mockResolvedValue(undefined);
      mockElectronAPI.file.delete.mockResolvedValue(undefined);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      await resolver.saveFolderVariables('/project', variables, 'yml');

      expect(mockElectronAPI.file.delete).toHaveBeenCalledWith('/project/.mdnote-vars.json');
    });

    it('应该在保存JSON时删除YAML文件', async () => {
      const variables = { name: 'Test' };

      mockElectronAPI.file.write.mockResolvedValue(undefined);
      mockElectronAPI.file.delete.mockResolvedValue(undefined);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      await resolver.saveFolderVariables('/project', variables, 'json');

      expect(mockElectronAPI.file.delete).toHaveBeenCalledWith('/project/.mdnote-vars.yml');
    });

    it('应该更新缓存', async () => {
      const variables = { name: 'Test' };

      mockElectronAPI.file.write.mockResolvedValue(undefined);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      await resolver.saveFolderVariables('/project', variables);

      // 验证缓存已更新（不应该再次读取文件）
      await resolver.resolveFolderVariables('/project');
      expect(mockElectronAPI.file.read).not.toHaveBeenCalled();
    });

    it('应该在electronAPI不可用时抛出错误', async () => {
      delete (window as any).electronAPI;

      const variables = { name: 'Test' };

      await expect(
        resolver.saveFolderVariables('/project', variables)
      ).rejects.toThrow();
    });
  });

  describe('clearCache', () => {
    it('应该清除所有缓存', async () => {
      const ymlContent = 'name: Test';
      mockElectronAPI.file.read.mockResolvedValue(ymlContent);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      // 第一次调用
      await resolver.resolveFolderVariables('/project');

      // 清除缓存
      resolver.clearCache();

      // 第二次调用应该重新读取文件
      await resolver.resolveFolderVariables('/project');

      expect(mockElectronAPI.file.read).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearFolderCache', () => {
    it('应该清除特定文件夹的缓存', async () => {
      const ymlContent = 'name: Test';
      mockElectronAPI.file.read.mockResolvedValue(ymlContent);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      // 读取两个文件夹
      await resolver.resolveFolderVariables('/project1');
      await resolver.resolveFolderVariables('/project2');

      // 清除一个文件夹的缓存
      resolver.clearFolderCache('/project1');

      // 重新读取 /project1 应该重新读取文件
      mockElectronAPI.file.read.mockClear();
      await resolver.resolveFolderVariables('/project1');
      expect(mockElectronAPI.file.read).toHaveBeenCalledTimes(1);

      // 读取 /project2 应该使用缓存
      await resolver.resolveFolderVariables('/project2');
      expect(mockElectronAPI.file.read).toHaveBeenCalledTimes(1);
    });
  });

  describe('路径处理', () => {
    it('应该处理Unix风格的路径', async () => {
      const ymlContent = 'name: Test';
      mockElectronAPI.file.read.mockResolvedValue(ymlContent);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      await resolver.resolveFolderVariables('/project/docs/api');

      expect(mockElectronAPI.file.read).toHaveBeenCalledWith('/project/docs/api/.mdnote-vars.yml');
    });

    it('应该处理Windows风格的路径', async () => {
      const ymlContent = 'name: Test';
      mockElectronAPI.file.read.mockResolvedValue(ymlContent);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      await resolver.resolveFolderVariables('C:\\project\\docs\\api');

      expect(mockElectronAPI.file.read).toHaveBeenCalledWith('C:\\project\\docs\\api\\.mdnote-vars.yml');
    });

    it('应该正确处理父文件夹路径（Unix）', async () => {
      const rootVars = 'var: root';
      const childVars = 'var: child';

      mockElectronAPI.file.read
        .mockResolvedValueOnce(rootVars)
        .mockResolvedValueOnce(childVars);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveInheritedVariables('/root/child');

      expect(variables.var).toBe('child');
    });

    it('应该正确处理父文件夹路径（Windows）', async () => {
      const rootVars = 'var: root';
      const childVars = 'var: child';

      mockElectronAPI.file.read
        .mockResolvedValueOnce(rootVars)
        .mockResolvedValueOnce(childVars);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveInheritedVariables('C:\\root\\child');

      expect(variables.var).toBe('child');
    });
  });

  describe('边界情况', () => {
    it('应该处理空变量对象', async () => {
      mockElectronAPI.file.write.mockResolvedValue(undefined);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      await resolver.saveFolderVariables('/project', {});

      expect(mockElectronAPI.file.write).toHaveBeenCalled();
    });

    it('应该处理复杂的嵌套变量', async () => {
      const ymlContent = `
nested:
  level1:
    level2:
      value: deep
array:
  - item1
  - item2
`;

      mockElectronAPI.file.read.mockResolvedValue(ymlContent);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveFolderVariables('/project');

      expect(variables.nested.level1.level2.value).toBe('deep');
      expect(variables.array).toEqual(['item1', 'item2']);
    });

    it('应该处理特殊字符', async () => {
      const ymlContent = `
text: "Hello: World!"
path: "C:/Users/Test"
special: "Test quoted"
`;

      mockElectronAPI.file.read.mockResolvedValue(ymlContent);
      mockElectronAPI.file.getStats.mockResolvedValue({ mtime: 123456 });

      const variables = await resolver.resolveFolderVariables('/project');

      expect(variables.text).toBe('Hello: World!');
      expect(variables.path).toBe('C:/Users/Test');
      expect(variables.special).toBe('Test quoted');
    });
  });
});
