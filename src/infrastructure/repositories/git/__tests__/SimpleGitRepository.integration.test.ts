import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { SimpleGitRepository } from '../SimpleGitRepository';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * SimpleGitRepository 集成测试
 * 这些测试需要真实的 Git 环境和文件系统
 */

describe('SimpleGitRepository Integration Tests', () => {
  let testRepoPath: string;
  let repository: SimpleGitRepository;

  beforeAll(() => {
    // 创建临时测试目录
    const tmpDir = os.tmpdir();
    testRepoPath = path.join(tmpDir, `mdnote-git-test-${Date.now()}`);

    // 确保目录存在
    if (!fs.existsSync(testRepoPath)) {
      fs.mkdirSync(testRepoPath, { recursive: true });
    }

    console.log(`Test repository path: ${testRepoPath}`);
  });

  afterAll(() => {
    // 清理临时目录
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    repository = new SimpleGitRepository(testRepoPath);
  });

  afterEach(async () => {
    // 每个 test 后清理
    // 不删除目录，只清理 Git 内容
  });

  // ==================== 仓库管理 ====================

  describe('init', () => {
    it('should initialize a new git repository', async () => {
      await repository.init();

      const isRepo = await repository.isRepository();
      expect(isRepo).toBe(true);

      const gitDir = path.join(testRepoPath, '.git');
      expect(fs.existsSync(gitDir)).toBe(true);
    });

    it('should create .gitignore file', async () => {
      await repository.init();

      const gitignorePath = path.join(testRepoPath, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
    });

    it('should not overwrite existing .gitignore', async () => {
      // 先创建自定义 .gitignore
      const gitignorePath = path.join(testRepoPath, '.gitignore');
      fs.writeFileSync(gitignorePath, 'custom-pattern\n', 'utf-8');

      await repository.init();

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('custom-pattern');
    });
  });

  describe('isRepository', () => {
    it('should return false for uninitialized directory', async () => {
      const isRepo = await repository.isRepository();
      expect(isRepo).toBe(false);
    });

    it('should return true after initialization', async () => {
      await repository.init();
      const isRepo = await repository.isRepository();
      expect(isRepo).toBe(true);
    });
  });

  // ==================== 状态查询 ====================

  describe('getStatus', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should return empty status for clean repository', async () => {
      const status = await repository.getStatus();

      expect(status.modified).toEqual([]);
      expect(status.added).toEqual([]);
      expect(status.deleted).toEqual([]);
      expect(status.untracked).toEqual([]);
    });

    it('should detect modified files', async () => {
      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'initial content', 'utf-8');

      await repository.add(['test.txt']);
      await repository.commit('Initial commit');

      // 修改文件
      fs.writeFileSync(testFile, 'modified content', 'utf-8');

      const status = await repository.getStatus();
      expect(status.modified).toContain('test.txt');
    });

    it('should detect untracked files', async () => {
      const testFile = path.join(testRepoPath, 'untracked.txt');
      fs.writeFileSync(testFile, 'content', 'utf-8');

      const status = await repository.getStatus();
      expect(status.untracked).toContain('untracked.txt');
    });

    it('should detect new files', async () => {
      const testFile = path.join(testRepoPath, 'new.txt');
      fs.writeFileSync(testFile, 'content', 'utf-8');

      await repository.add(['new.txt']);

      const status = await repository.getStatus();
      expect(status.staged).toContain('new.txt');
    });
  });

  describe('getCurrentBranch', () => {
    it('should return main branch after init', async () => {
      await repository.init();

      const branch = await repository.getCurrentBranch();
      expect(branch).toBe('main');
    });

    it('should return current branch name after switching', async () => {
      await repository.init();
      await repository.createBranch('develop');
      await repository.checkoutBranch('develop');

      const branch = await repository.getCurrentBranch();
      expect(branch).toBe('develop');
    });
  });

  describe('getBranches', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should return list of branches', async () => {
      const branches = await repository.getBranches();

      expect(branches.length).toBeGreaterThanOrEqual(1);
      expect(branches[0].name).toBe('main');
      expect(branches[0].isCurrent).toBe(true);
    });

    it('should include new branches', async () => {
      await repository.createBranch('feature');

      const branches = await repository.getBranches();
      const featureBranch = branches.find(b => b.name === 'feature');

      expect(featureBranch).toBeDefined();
      expect(featureBranch?.isCurrent).toBe(false);
    });
  });

  // ==================== 提交操作 ====================

  describe('commit', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should commit changes', async () => {
      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'Hello, Git!', 'utf-8');

      const hash = await repository.commit('Initial commit');

      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThanOrEqual(40); // Git hash length

      const logs = await repository.getLog();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Initial commit');
    });

    it('should commit all changes when no files specified', async () => {
      const file1 = path.join(testRepoPath, 'file1.txt');
      const file2 = path.join(testRepoPath, 'file2.txt');

      fs.writeFileSync(file1, 'content1', 'utf-8');
      fs.writeFileSync(file2, 'content2', 'utf-8');

      await repository.commit('Add two files');

      const status = await repository.getStatus();
      expect(status.modified).toEqual([]);
    });

    it('should commit specific files', async () => {
      const file1 = path.join(testRepoPath, 'file1.txt');
      const file2 = path.join(testRepoPath, 'file2.txt');

      fs.writeFileSync(file1, 'content1', 'utf-8');
      fs.writeFileSync(file2, 'content2', 'utf-8');

      await repository.commit('Add file1', ['file1.txt']);

      const status = await repository.getStatus();
      expect(status.modified).toContain('file2.txt');
    });

    it('should store commit metadata correctly', async () => {
      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'content', 'utf-8');

      await repository.commit('Test commit');

      const logs = await repository.getLog();
      const commit = logs[0];

      expect(commit.author).toBeTruthy();
      expect(commit.message).toBe('Test commit');
      expect(commit.date).toBeInstanceOf(Date);
      expect(commit.files).toContain('test.txt');
    });
  });

  describe('add', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should add files to staging area', async () => {
      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'content', 'utf-8');

      await repository.add(['test.txt']);

      const status = await repository.getStatus();
      expect(status.staged).toContain('test.txt');
    });
  });

  describe('addAll', () => {
    it('should stage all changes', async () => {
      await repository.init();

      const file1 = path.join(testRepoPath, 'file1.txt');
      const file2 = path.join(testRepoPath, 'file2.txt');

      fs.writeFileSync(file1, 'content1', 'utf-8');
      fs.writeFileSync(file2, 'content2', 'utf-8');

      await repository.addAll();

      const status = await repository.getStatus();
      expect(status.staged.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==================== 历史记录 ====================

  describe('getLog', () => {
    beforeEach(async () => {
      await repository.init();

      // 创建多个提交
      for (let i = 1; i <= 5; i++) {
        const file = path.join(testRepoPath, `file${i}.txt`);
        fs.writeFileSync(file, `content${i}`, 'utf-8');
        await repository.commit(`Commit ${i}`);
      }
    });

    it('should return commit history in reverse order', async () => {
      const logs = await repository.getLog();

      expect(logs.length).toBe(5);
      expect(logs[0].message).toBe('Commit 5');
      expect(logs[4].message).toBe('Commit 1');
    });

    it('should respect limit parameter', async () => {
      const logs = await repository.getLog(3);

      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe('Commit 5');
      expect(logs[2].message).toBe('Commit 3');
    });

    it('should respect skip parameter', async () => {
      const logs = await repository.getLog(10, 2);

      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe('Commit 3');
    });
  });

  describe('getCommit', () => {
    it('should retrieve specific commit', async () => {
      await repository.init();

      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'content', 'utf-8');
      const hash = await repository.commit('Test commit');

      const commit = await repository.getCommit(hash);

      expect(commit.hash).toBe(hash);
      expect(commit.message).toBe('Test commit');
      expect(commit.shortHash).toBe(hash.substring(0, 7));
    });

    it('should throw error for non-existent commit', async () => {
      await repository.init();

      await expect(repository.getCommit('nonexistent')).rejects.toThrow();
    });
  });

  describe('getFileHistory', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should return commits that modified the file', async () => {
      const testFile = path.join(testRepoPath, 'test.txt');

      fs.writeFileSync(testFile, 'v1', 'utf-8');
      await repository.commit('First version');

      fs.writeFileSync(testFile, 'v2', 'utf-8');
      await repository.commit('Second version');

      const history = await repository.getFileHistory('test.txt');

      expect(history.length).toBe(2);
      expect(history[0].message).toBe('Second version');
    });

    it('should return empty array for untracked file', async () => {
      const history = await repository.getFileHistory('nonexistent.txt');

      expect(history).toEqual([]);
    });
  });

  // ==================== 分支管理 ====================

  describe('createBranch', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should create new branch', async () => {
      await repository.createBranch('feature');

      const branches = await repository.getBranches();
      const featureBranch = branches.find(b => b.name === 'feature');

      expect(featureBranch).toBeDefined();
    });

    it('should not switch to new branch', async () => {
      await repository.createBranch('new-branch');

      const currentBranch = await repository.getCurrentBranch();
      expect(currentBranch).toBe('main');
    });
  });

  describe('checkoutBranch', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should switch to existing branch', async () => {
      await repository.createBranch('develop');
      await repository.checkoutBranch('develop');

      const currentBranch = await repository.getCurrentBranch();
      expect(currentBranch).toBe('develop');
    });

    it('should mark branch as current', async () => {
      await repository.createBranch('test');
      await repository.checkoutBranch('test');

      const branches = await repository.getBranches();
      const testBranch = branches.find(b => b.name === 'test');
      const mainBranch = branches.find(b => b.name === 'main');

      expect(testBranch?.isCurrent).toBe(true);
      expect(mainBranch?.isCurrent).toBe(false);
    });
  });

  describe('deleteBranch', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should delete branch', async () => {
      await repository.createBranch('to-delete');
      await repository.checkoutBranch('main'); // Switch away from main

      await repository.deleteBranch('to-delete');

      const branches = await repository.getBranches();
      const deleted = branches.find(b => b.name === 'to-delete');
      expect(deleted).toBeUndefined();
    });
  });

  describe('renameBranch', () => {
    it('should rename branch', async () => {
      await repository.init();
      await repository.createBranch('old-name');
      await repository.checkoutBranch('old-name');

      await repository.renameBranch('old-name', 'new-name');

      const currentBranch = await repository.getCurrentBranch();
      expect(currentBranch).toBe('new-name');

      const branches = await repository.getBranches();
      expect(branches.find(b => b.name === 'old-name')).toBeUndefined();
      expect(branches.find(b => b.name === 'new-name')).toBeDefined();
    });
  });

  // ==================== 忽略文件 ====================

  describe('addToGitIgnore', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should add pattern to .gitignore', async () => {
      await repository.addToGitIgnore('*.log');

      const patterns = await repository.getGitIgnore();
      expect(patterns).toContain('*.log');
    });

    it('should not add duplicate pattern', async () => {
      await repository.addToGitIgnore('node_modules/');
      await repository.addToGitIgnore('node_modules/');

      const patterns = await repository.getGitIgnore();
      const count = patterns.filter(p => p === 'node_modules/').length;
      expect(count).toBe(1);
    });

    it('should handle multiple patterns', async () => {
      await repository.addToGitIgnore('*.tmp');
      await repository.addToGitIgnore('*.bak');

      const patterns = await repository.getGitIgnore();
      expect(patterns).toContain('*.tmp');
      expect(patterns).toContain('*.bak');
    });
  });

  describe('removeFromGitIgnore', () => {
    it('should remove pattern from .gitignore', async () => {
      await repository.init();
      await repository.addToGitIgnore('test-pattern');

      await repository.removeFromGitIgnore('test-pattern');

      const patterns = await repository.getGitIgnore();
      expect(patterns).not.toContain('test-pattern');
    });
  });

  describe('getGitIgnore', () => {
    it('should return all ignore patterns', async () => {
      await repository.init();

      const patterns = await repository.getGitIgnore();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('node_modules/');
    });
  });

  // ==================== 远程仓库 ====================

  describe('addRemote', () => {
    beforeEach(async () => {
      await repository.init();
    });

    it('should add remote repository', async () => {
      await repository.addRemote('origin', 'https://github.com/user/repo.git');

      const remotes = await repository.getRemotes();
      expect(remotes).toHaveLength(1);
      expect(remotes[0].name).toBe('origin');
      expect(remotes[0].url).toBe('https://github.com/user/repo.git');
    });

    it('should add multiple remotes', async () => {
      await repository.addRemote('origin', 'url1');
      await repository.addRemote('upstream', 'url2');

      const remotes = await repository.getRemotes();
      expect(remotes.length).toBe(2);
    });
  });

  describe('getRemotes', () => {
    it('should return list of remotes', async () => {
      await repository.init();
      await repository.addRemote('origin', 'https://github.com/user/repo.git');

      const remotes = await repository.getRemotes();
      expect(remotes.length).toBe(1);
      expect(remotes[0].name).toBe('origin');
    });
  });

  // ==================== 回滚操作 ====================

  describe('checkoutCommit', () => {
    it('should checkout to specific commit', async () => {
      await repository.init();

      const file = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(file, 'v1', 'utf-8');
      const hash = await repository.commit('Commit 1');

      fs.writeFileSync(file, 'v2', 'utf-8');
      await repository.commit('Commit 2');

      await repository.checkoutCommit(hash);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toBe('v1');
    });
  });

  describe('reset', () => {
    it('should reset to specific commit in soft mode', async () => {
      await repository.init();

      const file = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(file, 'v1', 'utf-8');
      const hash1 = await repository.commit('Commit 1');

      fs.writeFileSync(file, 'v2', 'utf-8');
      await repository.commit('Commit 2');

      // Make a change
      fs.writeFileSync(file, 'v3', 'utf-8');

      await repository.reset(hash1, 'soft');

      // Changes should still be there in soft mode
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  describe('checkoutFiles', () => {
    it('should discard changes to files', async () => {
      await repository.init();

      const file = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(file, 'original', 'utf-8');
      await repository.commit('Initial');

      fs.writeFileSync(file, 'modified', 'utf-8');

      await repository.checkoutFiles(['test.txt']);

      const content = fs.readFileSync(file, 'utf-8');
      expect(content).toBe('original');
    });
  });
});
