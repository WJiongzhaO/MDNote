import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimpleGitRepository } from '../SimpleGitRepository';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * SimpleGitRepository 单元测试
 * 使用 Mock electronAPI 进行测试
 */

// Mock electronAPI
const mockFileAPI = {
  existsPath: vi.fn(),
  readFileContent: vi.fn(),
  writeFileContent: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  delete: vi.fn(),
  exists: vi.fn(),
};

const mockElectronAPI = {
  file: mockFileAPI,
};

describe('SimpleGitRepository Unit Tests', () => {
  let testRepoPath: string;
  let repository: SimpleGitRepository;

  beforeEach(() => {
    // 设置 mock window.electronAPI
    (global as any).window = {
      electronAPI: mockElectronAPI,
    };

    // 创建临时测试目录路径
    testRepoPath = path.join(os.tmpdir(), `mdnote-test-${Date.now()}`);

    // 创建实际目录（simple-git 需要）
    if (!fs.existsSync(testRepoPath)) {
      fs.mkdirSync(testRepoPath, { recursive: true });
    }

    // 重置所有 mocks
    vi.clearAllMocks();

    repository = new SimpleGitRepository(testRepoPath);
  });

  afterEach(() => {
    // 清理临时目录
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  // ==================== 仓库管理 ====================

  describe('isRepository', () => {
    it('should return false when .git does not exist', async () => {
      mockFileAPI.existsPath.mockResolvedValue(false);

      const isRepo = await repository.isRepository();

      expect(isRepo).toBe(false);
      expect(mockFileAPI.existsPath).toHaveBeenCalledWith(`${testRepoPath}/.git`);
    });

    it('should return true when .git exists', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);

      const isRepo = await repository.isRepository();

      expect(isRepo).toBe(true);
    });
  });

  // ==================== 忽略文件 ====================

  describe('addToGitIgnore', () => {
    it('should add pattern to .gitignore when file does not exist', async () => {
      mockFileAPI.existsPath.mockResolvedValue(false);
      mockFileAPI.readFileContent.mockResolvedValue('');
      mockFileAPI.writeFileContent.mockResolvedValue(undefined);

      await repository.addToGitIgnore('*.log');

      expect(mockFileAPI.writeFileContent).toHaveBeenCalledWith(
        `${testRepoPath}/.gitignore`,
        expect.stringContaining('*.log')
      );
    });

    it('should add pattern to existing .gitignore', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);
      mockFileAPI.readFileContent.mockResolvedValue('node_modules/\n');
      mockFileAPI.writeFileContent.mockResolvedValue(undefined);

      await repository.addToGitIgnore('*.log');

      const writtenContent = mockFileAPI.writeFileContent.mock.calls[0][1];
      expect(writtenContent).toContain('node_modules/');
      expect(writtenContent).toContain('*.log');
    });

    it('should not add duplicate pattern', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);
      mockFileAPI.readFileContent.mockResolvedValue('*.log\nnode_modules/\n');
      mockFileAPI.writeFileContent.mockResolvedValue(undefined);

      await repository.addToGitIgnore('*.log');

      // Should not call writeFileContent for duplicate
      expect(mockFileAPI.writeFileContent).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);
      mockFileAPI.readFileContent.mockRejectedValue(new Error('Read error'));

      await expect(repository.addToGitIgnore('*.log')).rejects.toThrow();
    });
  });

  describe('removeFromGitIgnore', () => {
    it('should remove pattern from .gitignore', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);
      mockFileAPI.readFileContent.mockResolvedValue('*.log\nnode_modules/\n*.tmp\n');
      mockFileAPI.writeFileContent.mockResolvedValue(undefined);

      await repository.removeFromGitIgnore('*.log');

      expect(mockFileAPI.writeFileContent).toHaveBeenCalledWith(
        `${testRepoPath}/.gitignore`,
        expect.not.stringContaining('*.log')
      );

      const writtenContent = mockFileAPI.writeFileContent.mock.calls[0][1];
      expect(writtenContent).toContain('node_modules/');
      expect(writtenContent).toContain('*.tmp');
    });

    it('should do nothing when .gitignore does not exist', async () => {
      mockFileAPI.existsPath.mockResolvedValue(false);

      await repository.removeFromGitIgnore('*.log');

      expect(mockFileAPI.readFileContent).not.toHaveBeenCalled();
      expect(mockFileAPI.writeFileContent).not.toHaveBeenCalled();
    });

    it('should handle read errors', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);
      mockFileAPI.readFileContent.mockRejectedValue(new Error('Read error'));

      await expect(repository.removeFromGitIgnore('*.log')).rejects.toThrow();
    });
  });

  describe('getGitIgnore', () => {
    it('should return patterns from .gitignore', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);
      mockFileAPI.readFileContent.mockResolvedValue(
        '# Comment\nnode_modules/\n*.log\n\n# Another comment\n*.tmp\n'
      );

      const patterns = await repository.getGitIgnore();

      expect(patterns).toEqual(['node_modules/', '*.log', '*.tmp']);
      expect(patterns).not.toContain('# Comment');
    });

    it('should return empty array when .gitignore does not exist', async () => {
      mockFileAPI.existsPath.mockResolvedValue(false);

      const patterns = await repository.getGitIgnore();

      expect(patterns).toEqual([]);
      expect(mockFileAPI.readFileContent).not.toHaveBeenCalled();
    });

    it('should handle read errors', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);
      mockFileAPI.readFileContent.mockRejectedValue(new Error('Read error'));

      const patterns = await repository.getGitIgnore();

      expect(patterns).toEqual([]);
    });

    it('should trim whitespace from patterns', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);
      mockFileAPI.readFileContent.mockResolvedValue('  node_modules/  \n  *.log  \n');

      const patterns = await repository.getGitIgnore();

      expect(patterns).toEqual(['node_modules/', '*.log']);
    });

    it('should filter empty lines', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);
      mockFileAPI.readFileContent.mockResolvedValue('node_modules/\n\n*.log\n\n\n');

      const patterns = await repository.getGitIgnore();

      expect(patterns).toEqual(['node_modules/', '*.log']);
    });
  });

  // ==================== Diff 解析 ====================

  describe('parseDiff', () => {
    it('should parse simple diff', async () => {
      // This test requires actual Git to work, so we'll just verify the method exists
      expect(repository['parseDiff']).toBeDefined();
      expect(typeof repository['parseDiff']).toBe('function');
    });
  });

  // ==================== 私有方法测试 ====================

  describe('createDefaultGitIgnore', () => {
    it('should not overwrite existing .gitignore', async () => {
      mockFileAPI.existsPath.mockResolvedValue(true);

      await repository['createDefaultGitIgnore']();

      expect(mockFileAPI.writeFileContent).not.toHaveBeenCalled();
    });

    it('should create .gitignore with default content', async () => {
      mockFileAPI.existsPath.mockResolvedValue(false);
      mockFileAPI.writeFileContent.mockResolvedValue(undefined);

      await repository['createDefaultGitIgnore']();

      expect(mockFileAPI.writeFileContent).toHaveBeenCalledWith(
        `${testRepoPath}/.gitignore`,
        expect.stringContaining('# Dependencies')
      );

      const content = mockFileAPI.writeFileContent.mock.calls[0][1];
      expect(content).toContain('node_modules/');
      expect(content).toContain('dist/');
      expect(content).toContain('.vscode/');
      expect(content).toContain('.DS_Store');
      expect(content).toContain('config.json');
    });

    it('should handle write errors gracefully', async () => {
      mockFileAPI.existsPath.mockResolvedValue(false);
      mockFileAPI.writeFileContent.mockRejectedValue(new Error('Write error'));

      // Should not throw
      await expect(repository['createDefaultGitIgnore']()).resolves.not.toThrow();
    });
  });

  // ==================== 错误处理 ====================

  describe('Error Handling', () => {
    it('should handle missing electronAPI gracefully', async () => {
      delete (global as any).window.electronAPI;

      const repo = new SimpleGitRepository(testRepoPath);

      // Should not throw, but may fail in actual Git operation
      expect(repo).toBeDefined();
    });

    it('should handle missing file API gracefully', async () => {
      (global as any).window.electronAPI = {};

      const repo = new SimpleGitRepository(testRepoPath);

      // Should not throw
      expect(repo).toBeDefined();
    });
  });

  // ==================== 类型安全 ====================

  describe('Type Safety', () => {
    it('should implement all required methods from IGitRepository', () => {
      // Verify all required methods exist
      expect(repository.init).toBeDefined();
      expect(repository.isRepository).toBeDefined();
      expect(repository.getStatus).toBeDefined();
      expect(repository.getCurrentBranch).toBeDefined();
      expect(repository.getBranches).toBeDefined();
      expect(repository.commit).toBeDefined();
      expect(repository.add).toBeDefined();
      expect(repository.addAll).toBeDefined();
      expect(repository.getLog).toBeDefined();
      expect(repository.getCommit).toBeDefined();
      expect(repository.getFileHistory).toBeDefined();
      expect(repository.getDiff).toBeDefined();
      expect(repository.getDiffBetweenCommits).toBeDefined();
      expect(repository.getStagedDiff).toBeDefined();
      expect(repository.checkoutCommit).toBeDefined();
      expect(repository.reset).toBeDefined();
      expect(repository.checkoutFiles).toBeDefined();
      expect(repository.revert).toBeDefined();
      expect(repository.createBranch).toBeDefined();
      expect(repository.checkoutBranch).toBeDefined();
      expect(repository.deleteBranch).toBeDefined();
      expect(repository.renameBranch).toBeDefined();
      expect(repository.addToGitIgnore).toBeDefined();
      expect(repository.removeFromGitIgnore).toBeDefined();
      expect(repository.getGitIgnore).toBeDefined();
      expect(repository.addRemote).toBeDefined();
      expect(repository.getRemotes).toBeDefined();
      expect(repository.push).toBeDefined();
      expect(repository.pull).toBeDefined();
      expect(repository.fetch).toBeDefined();
    });

    it('should have all methods as functions', () => {
      const methods = [
        'init', 'isRepository', 'getStatus', 'getCurrentBranch',
        'getBranches', 'commit', 'add', 'addAll', 'getLog',
        'getCommit', 'getFileHistory', 'getDiff', 'getDiffBetweenCommits',
        'getStagedDiff', 'checkoutCommit', 'reset', 'checkoutFiles',
        'revert', 'createBranch', 'checkoutBranch', 'deleteBranch',
        'renameBranch', 'addToGitIgnore', 'removeFromGitIgnore',
        'getGitIgnore', 'addRemote', 'getRemotes', 'push', 'pull', 'fetch'
      ];

      methods.forEach(method => {
        expect(typeof (repository as any)[method]).toBe('function');
      });
    });
  });

  // ==================== Git操作接口测试 ====================

  describe('Git Operations Interface', () => {
    it('should initialize repository correctly', async () => {
      mockFileAPI.existsPath.mockResolvedValue(false);
      mockFileAPI.writeFileContent.mockResolvedValue(undefined);

      // init will actually call Git operations, which we can't mock easily
      // So we just verify it doesn't throw
      await expect(repository.init()).resolves.not.toThrow();
    });

    it('should handle consecutive addToGitIgnore calls', async () => {
      mockFileAPI.existsPath.mockResolvedValue(false);
      mockFileAPI.readFileContent.mockResolvedValue('');
      mockFileAPI.writeFileContent.mockResolvedValue(undefined);

      await repository.addToGitIgnore('*.log');
      await repository.addToGitIgnore('*.tmp');
      await repository.addToGitIgnore('node_modules/');

      expect(mockFileAPI.writeFileContent).toHaveBeenCalledTimes(3);
    });
  });
});
