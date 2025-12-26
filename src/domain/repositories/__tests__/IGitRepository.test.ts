import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockGitRepository } from './MockGitRepository';
import type { GitCommit, GitStatus, GitDiff, GitBranch } from '../../entities/git/GitEntities';

describe('IGitRepository Interface', () => {
  let repo: MockGitRepository;

  beforeEach(() => {
    repo = new MockGitRepository();
  });

  // ==================== 仓库管理 ====================

  describe('init', () => {
    it('should initialize a new git repository', async () => {
      await repo.init();

      const isRepo = await repo.isRepository();
      expect(isRepo).toBe(true);
    });

    it('should create default branch on init', async () => {
      await repo.init();

      const branches = await repo.getBranches();
      expect(branches).toHaveLength(1);
      expect(branches[0].name).toBe('main');
      expect(branches[0].isCurrent).toBe(true);
    });
  });

  describe('isRepository', () => {
    it('should return false for uninitialized repository', async () => {
      const isRepo = await repo.isRepository();
      expect(isRepo).toBe(false);
    });

    it('should return true after initialization', async () => {
      await repo.init();
      const isRepo = await repo.isRepository();
      expect(isRepo).toBe(true);
    });
  });

  // ==================== 状态查询 ====================

  describe('getStatus', () => {
    it('should throw error if not initialized', async () => {
      await expect(repo.getStatus()).rejects.toThrow('Not a git repository');
    });

    it('should return empty status for clean repository', async () => {
      await repo.init();

      const status = await repo.getStatus();
      expect(status.modified).toEqual([]);
      expect(status.added).toEqual([]);
      expect(status.deleted).toEqual([]);
      expect(status.untracked).toEqual([]);
    });

    it('should return custom status when set', async () => {
      await repo.init();
      repo.setMockStatus({
        modified: ['file1.txt'],
        added: ['file2.txt']
      });

      const status = await repo.getStatus();
      expect(status.modified).toContain('file1.txt');
      expect(status.added).toContain('file2.txt');
    });
  });

  describe('getCurrentBranch', () => {
    it('should throw error if not initialized', async () => {
      await expect(repo.getCurrentBranch()).rejects.toThrow('Not a git repository');
    });

    it('should return main branch after init', async () => {
      await repo.init();

      const branch = await repo.getCurrentBranch();
      expect(branch).toBe('main');
    });

    it('should return current branch name after switching', async () => {
      await repo.init();
      await repo.createBranch('develop');
      await repo.checkoutBranch('develop');

      const branch = await repo.getCurrentBranch();
      expect(branch).toBe('develop');
    });
  });

  describe('getBranches', () => {
    it('should throw error if not initialized', async () => {
      await expect(repo.getBranches()).rejects.toThrow('Not a git repository');
    });

    it('should return list of branches', async () => {
      await repo.init();
      await repo.createBranch('feature');
      await repo.createBranch('bugfix');

      const branches = await repo.getBranches();
      expect(branches.length).toBeGreaterThanOrEqual(3); // main + feature + bugfix
    });
  });

  // ==================== 提交操作 ====================

  describe('commit', () => {
    it('should throw error if not initialized', async () => {
      await expect(repo.commit('test commit')).rejects.toThrow('Not a git repository');
    });

    it('should create a new commit', async () => {
      await repo.init();

      const hash = await repo.commit('Initial commit');
      expect(hash).toBeTruthy();
      expect(hash).toContain('commit-');
    });

    it('should store commit with correct message', async () => {
      await repo.init();

      await repo.commit('Test commit message');

      const commits = await repo.getLog();
      expect(commits).toHaveLength(1);
      expect(commits[0].message).toBe('Test commit message');
    });

    it('should clear status after commit', async () => {
      await repo.init();
      repo.setMockStatus({ modified: ['test.txt'] });

      await repo.commit('Update test.txt');

      const status = await repo.getStatus();
      expect(status.modified).toEqual([]);
    });

    it('should create multiple commits in correct order', async () => {
      await repo.init();

      await repo.commit('First commit');
      await repo.commit('Second commit');
      await repo.commit('Third commit');

      const commits = await repo.getLog();
      expect(commits).toHaveLength(3);
      expect(commits[0].message).toBe('Third commit'); // Most recent first
      expect(commits[2].message).toBe('First commit');
    });
  });

  describe('add', () => {
    it('should move untracked files to staged', async () => {
      await repo.init();
      repo.setMockStatus({ untracked: ['new.txt'] });

      await repo.add(['new.txt']);

      const status = await repo.getStatus();
      expect(status.untracked).not.toContain('new.txt');
      expect(status.staged).toContain('new.txt');
    });

    it('should move modified files to staged', async () => {
      await repo.init();
      repo.setMockStatus({ modified: ['changed.txt'] });

      await repo.add(['changed.txt']);

      const status = await repo.getStatus();
      expect(status.modified).not.toContain('changed.txt');
      expect(status.staged).toContain('changed.txt');
    });
  });

  describe('addAll', () => {
    it('should stage all changes', async () => {
      await repo.init();
      repo.setMockStatus({
        modified: ['a.txt'],
        added: ['b.txt'],
        untracked: ['c.txt']
      });

      await repo.addAll();

      const status = await repo.getStatus();
      expect(status.modified).toEqual([]);
      expect(status.added).toEqual([]);
      expect(status.untracked).toEqual([]);
      expect(status.staged).toContain('a.txt');
      expect(status.staged).toContain('b.txt');
      expect(status.staged).toContain('c.txt');
    });
  });

  // ==================== 历史记录 ====================

  describe('getLog', () => {
    it('should return commit history', async () => {
      await repo.init();
      await repo.commit('Commit 1');
      await repo.commit('Commit 2');

      const commits = await repo.getLog();
      expect(commits).toHaveLength(2);
      expect(commits[0].message).toBe('Commit 2');
      expect(commits[1].message).toBe('Commit 1');
    });

    it('should respect limit parameter', async () => {
      await repo.init();
      for (let i = 1; i <= 10; i++) {
        await repo.commit(`Commit ${i}`);
      }

      const commits = await repo.getLog(5);
      expect(commits).toHaveLength(5);
    });

    it('should respect skip parameter', async () => {
      await repo.init();
      for (let i = 1; i <= 5; i++) {
        await repo.commit(`Commit ${i}`);
      }

      const commits = await repo.getLog(10, 2);
      expect(commits).toHaveLength(3);
      expect(commits[0].message).toBe('Commit 3');
    });

    it('should return empty array if no commits', async () => {
      await repo.init();

      const commits = await repo.getLog();
      expect(commits).toEqual([]);
    });
  });

  describe('getCommit', () => {
    it('should retrieve specific commit by hash', async () => {
      await repo.init();
      const hash = await repo.commit('Test commit');

      const commit = await repo.getCommit(hash);
      expect(commit.message).toBe('Test commit');
      expect(commit.hash).toBe(hash);
    });

    it('should throw error for non-existent commit', async () => {
      await repo.init();

      await expect(repo.getCommit('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('getFileHistory', () => {
    it('should return commits that modified the file', async () => {
      await repo.init();
      await repo.commit('Modify file.txt', ['file.txt']);
      await repo.commit('Other change', ['other.txt']);

      const history = await repo.getFileHistory('file.txt');
      expect(history).toHaveLength(1);
      expect(history[0].files).toContain('file.txt');
    });

    it('should return empty array for file with no history', async () => {
      await repo.init();
      await repo.commit('Initial commit');

      const history = await repo.getFileHistory('nonexistent.txt');
      expect(history).toEqual([]);
    });
  });

  // ==================== 差异对比 ====================

  describe('getDiff', () => {
    it('should return diff object', async () => {
      await repo.init();

      const diff = await repo.getDiff('test.txt');
      expect(diff.file).toBe('test.txt');
      expect(diff.hunks).toBeDefined();
    });

    it('should return diff for all files if no file specified', async () => {
      await repo.init();

      const diff = await repo.getDiff();
      expect(diff.hunks).toBeDefined();
    });
  });

  describe('getDiffBetweenCommits', () => {
    it('should return diff between two commits', async () => {
      await repo.init();
      const hash1 = await repo.commit('First');
      const hash2 = await repo.commit('Second');

      const diff = await repo.getDiffBetweenCommits(hash1, hash2);
      expect(diff.oldContent).toBe('First');
      expect(diff.newContent).toBe('Second');
    });
  });

  // ==================== 回滚操作 ====================

  describe('checkoutCommit', () => {
    it('should checkout to specific commit', async () => {
      await repo.init();
      const hash = await repo.commit('Test commit');

      await repo.checkoutCommit(hash);
      // No exception means success
      expect(true).toBe(true);
    });

    it('should create branch when requested', async () => {
      await repo.init();
      const hash = await repo.commit('Test commit');

      await repo.checkoutCommit(hash, true);

      const branches = await repo.getBranches();
      const newBranch = branches.find(b => b.name.includes(hash.substring(0, 7)));
      expect(newBranch).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset to specific commit', async () => {
      await repo.init();
      const hash = await repo.commit('Test commit');

      await repo.reset(hash, 'soft');
      // No exception means success
      expect(true).toBe(true);
    });

    it('should clear status in hard mode', async () => {
      await repo.init();
      const hash = await repo.commit('Test');
      repo.setMockStatus({ modified: ['a.txt'] });

      await repo.reset(hash, 'hard');

      const status = await repo.getStatus();
      expect(status.modified).toEqual([]);
    });
  });

  describe('checkoutFiles', () => {
    it('should discard changes for specified files', async () => {
      await repo.init();
      repo.setMockStatus({ modified: ['a.txt', 'b.txt'] });

      await repo.checkoutFiles(['a.txt']);

      const status = await repo.getStatus();
      expect(status.modified).not.toContain('a.txt');
      expect(status.modified).toContain('b.txt');
    });
  });

  // ==================== 分支管理 ====================

  describe('createBranch', () => {
    it('should create new branch', async () => {
      await repo.init();

      await repo.createBranch('feature');

      const branches = await repo.getBranches();
      const featureBranch = branches.find(b => b.name === 'feature');
      expect(featureBranch).toBeDefined();
      expect(featureBranch?.isCurrent).toBe(false);
    });

    it('should throw error if branch already exists', async () => {
      await repo.init();
      await repo.createBranch('existing');

      await expect(repo.createBranch('existing')).rejects.toThrow('already exists');
    });
  });

  describe('checkoutBranch', () => {
    it('should switch to existing branch', async () => {
      await repo.init();
      await repo.createBranch('develop');

      await repo.checkoutBranch('develop');

      const currentBranch = await repo.getCurrentBranch();
      expect(currentBranch).toBe('develop');
    });

    it('should mark branch as current', async () => {
      await repo.init();
      await repo.createBranch('test');
      await repo.checkoutBranch('test');

      const branches = await repo.getBranches();
      const testBranch = branches.find(b => b.name === 'test');
      expect(testBranch?.isCurrent).toBe(true);
    });

    it('should unmark previous branch', async () => {
      await repo.init();
      await repo.createBranch('new-branch');
      await repo.checkoutBranch('new-branch');

      const branches = await repo.getBranches();
      const mainBranch = branches.find(b => b.name === 'main');
      expect(mainBranch?.isCurrent).toBe(false);
    });
  });

  describe('deleteBranch', () => {
    it('should delete branch', async () => {
      await repo.init();
      await repo.createBranch('to-delete');

      await repo.deleteBranch('to-delete');

      const branches = await repo.getBranches();
      const deleted = branches.find(b => b.name === 'to-delete');
      expect(deleted).toBeUndefined();
    });

    it('should throw error when deleting current branch without force', async () => {
      await repo.init();

      await expect(repo.deleteBranch('main')).rejects.toThrow('Cannot delete current branch');
    });

    it('should delete current branch with force', async () => {
      await repo.init();

      await repo.deleteBranch('main', true);
      // No exception means success
      expect(true).toBe(true);
    });
  });

  // ==================== 忽略文件 ====================

  describe('addToGitIgnore', () => {
    it('should add pattern to gitignore', async () => {
      await repo.init();

      await repo.addToGitIgnore('*.log');

      const patterns = await repo.getGitIgnore();
      expect(patterns).toContain('*.log');
    });

    it('should not add duplicate pattern', async () => {
      await repo.init();
      await repo.addToGitIgnore('node_modules/');
      await repo.addToGitIgnore('node_modules/');

      const patterns = await repo.getGitIgnore();
      const count = patterns.filter(p => p === 'node_modules/').length;
      expect(count).toBe(1);
    });
  });

  describe('removeFromGitIgnore', () => {
    it('should remove pattern from gitignore', async () => {
      await repo.init();

      await repo.removeFromGitIgnore('node_modules/');

      const patterns = await repo.getGitIgnore();
      expect(patterns).not.toContain('node_modules/');
    });
  });

  describe('getGitIgnore', () => {
    it('should return all ignore patterns', async () => {
      await repo.init();

      const patterns = await repo.getGitIgnore();
      expect(patterns).toContain('node_modules/');
      expect(patterns).toContain('*.log');
    });
  });

  // ==================== 远程仓库 ====================

  describe('addRemote', () => {
    it('should add remote repository', async () => {
      await repo.init();

      await repo.addRemote('origin', 'https://github.com/user/repo.git');

      const remotes = await repo.getRemotes();
      expect(remotes).toHaveLength(1);
      expect(remotes[0].name).toBe('origin');
    });

    it('should throw error if remote already exists', async () => {
      await repo.init();
      await repo.addRemote('origin', 'https://github.com/user/repo.git');

      await expect(
        repo.addRemote('origin', 'https://github.com/user/repo2.git')
      ).rejects.toThrow('already exists');
    });
  });

  describe('getRemotes', () => {
    it('should return list of remotes', async () => {
      await repo.init();
      await repo.addRemote('origin', 'url1');
      await repo.addRemote('upstream', 'url2');

      const remotes = await repo.getRemotes();
      expect(remotes).toHaveLength(2);
    });
  });

  describe('push', () => {
    it('should throw error if remote does not exist', async () => {
      await repo.init();

      await expect(repo.push('nonexistent')).rejects.toThrow('not found');
    });

    it('should succeed if remote exists', async () => {
      await repo.init();
      await repo.addRemote('origin', 'url');

      await repo.push('origin');
      // No exception means success
      expect(true).toBe(true);
    });
  });

  describe('pull', () => {
    it('should throw error if remote does not exist', async () => {
      await repo.init();

      await expect(repo.pull('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('fetch', () => {
    it('should throw error if remote does not exist', async () => {
      await repo.init();

      await expect(repo.fetch('nonexistent')).rejects.toThrow('not found');
    });
  });
});
