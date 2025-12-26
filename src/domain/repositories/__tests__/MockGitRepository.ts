import type { IGitRepository } from '../IGitRepository';
import type {
  GitCommit,
  GitStatus,
  GitDiff,
  GitBranch,
  GitRemote
} from '../../entities/git/GitEntities';

/**
 * Mock Git Repository for testing
 * 实现 IGitRepository 接口用于单元测试
 */
export class MockGitRepository implements IGitRepository {
  private initialized: boolean = false;
  private mockCommits: GitCommit[] = [];
  private mockBranches: GitBranch[] = [];
  private mockRemotes: GitRemote[] = [];
  private mockStatus: GitStatus = {
    modified: [],
    added: [],
    deleted: [],
    untracked: [],
    conflicts: [],
    staged: []
  };
  private currentBranch: string = 'main';
  private gitIgnorePatterns: string[] = ['node_modules/', '*.log'];

  constructor(config?: {
    initialized?: boolean;
    commits?: GitCommit[];
    branches?: GitBranch[];
    remotes?: GitRemote[];
    status?: GitStatus;
    currentBranch?: string;
  }) {
    if (config) {
      this.initialized = config.initialized ?? false;
      this.mockCommits = config.commits ?? [];
      this.mockBranches = config.branches ?? [];
      this.mockRemotes = config.remotes ?? [];
      this.mockStatus = config.status ?? this.mockStatus;
      this.currentBranch = config.currentBranch ?? 'main';
    }
  }

  // ==================== 仓库管理 ====================

  async init(): Promise<void> {
    this.initialized = true;
    this.currentBranch = 'main';
    this.mockBranches = [
      {
        name: 'main',
        isCurrent: true,
        isRemote: false,
        commit: 'initial-commit-hash'
      }
    ];
  }

  async isRepository(): Promise<boolean> {
    return this.initialized;
  }

  // ==================== 状态查询 ====================

  async getStatus(): Promise<GitStatus> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }
    return { ...this.mockStatus };
  }

  async getCurrentBranch(): Promise<string> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }
    return this.currentBranch;
  }

  async getBranches(): Promise<GitBranch[]> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }
    return [...this.mockBranches];
  }

  // ==================== 提交操作 ====================

  async commit(message: string, files?: string[]): Promise<string> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    const newCommit: GitCommit = {
      hash: `commit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      shortHash: `commit-${Math.random().toString(36).substring(7)}`,
      author: 'Test User',
      message,
      date: new Date(),
      files: files ?? []
    };

    this.mockCommits.unshift(newCommit);

    // Clear status after commit
    this.mockStatus = {
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
      conflicts: [],
      staged: []
    };

    return newCommit.hash;
  }

  async add(files: string[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    // Move files from untracked/modified to staged
    files.forEach(file => {
      if (this.mockStatus.untracked.includes(file)) {
        this.mockStatus.untracked = this.mockStatus.untracked.filter(f => f !== file);
        this.mockStatus.staged.push(file);
      }
      if (this.mockStatus.modified.includes(file)) {
        this.mockStatus.modified = this.mockStatus.modified.filter(f => f !== file);
        this.mockStatus.staged.push(file);
      }
    });
  }

  async addAll(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    // Move all changes to staged
    this.mockStatus.staged = [
      ...this.mockStatus.staged,
      ...this.mockStatus.modified,
      ...this.mockStatus.added,
      ...this.mockStatus.untracked
    ];
    this.mockStatus.modified = [];
    this.mockStatus.added = [];
    this.mockStatus.untracked = [];
  }

  // ==================== 历史记录 ====================

  async getLog(limit: number = 50, skip: number = 0): Promise<GitCommit[]> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }
    return this.mockCommits.slice(skip, skip + limit);
  }

  async getCommit(hash: string): Promise<GitCommit> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    const commit = this.mockCommits.find(c => c.hash === hash);
    if (!commit) {
      throw new Error(`Commit ${hash} not found`);
    }
    return commit;
  }

  async getFileHistory(filePath: string, limit: number = 50): Promise<GitCommit[]> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    return this.mockCommits
      .filter(commit => commit.files.includes(filePath))
      .slice(0, limit);
  }

  // ==================== 差异对比 ====================

  async getDiff(file?: string): Promise<GitDiff> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    return {
      file: file ?? '',
      hunks: [
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 4,
          lines: [
            { type: ' ', content: 'unchanged line' },
            { type: '-', content: 'removed line' },
            { type: '+', content: 'added line' }
          ]
        }
      ]
    };
  }

  async getDiffBetweenCommits(
    fromHash: string,
    toHash: string,
    file?: string
  ): Promise<GitDiff> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    const fromCommit = this.mockCommits.find(c => c.hash === fromHash);
    const toCommit = this.mockCommits.find(c => c.hash === toHash);

    if (!fromCommit || !toCommit) {
      throw new Error('Commit not found');
    }

    return {
      file: file ?? '',
      oldContent: fromCommit.message,
      newContent: toCommit.message,
      hunks: []
    };
  }

  async getStagedDiff(file?: string): Promise<GitDiff> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    return {
      file: file ?? '',
      hunks: []
    };
  }

  // ==================== 回滚操作 ====================

  async checkoutCommit(hash: string, createBranch: boolean = false): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    const commit = this.mockCommits.find(c => c.hash === hash);
    if (!commit) {
      throw new Error(`Commit ${hash} not found`);
    }

    if (createBranch) {
      const newBranchName = `branch-${hash.substring(0, 7)}`;
      this.mockBranches.push({
        name: newBranchName,
        isCurrent: true,
        isRemote: false,
        commit: hash
      });
      this.currentBranch = newBranchName;
    }
  }

  async reset(hash: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    const commit = this.mockCommits.find(c => c.hash === hash);
    if (!commit) {
      throw new Error(`Commit ${hash} not found`);
    }

    if (mode === 'hard') {
      this.mockStatus = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        conflicts: [],
        staged: []
      };
    }
  }

  async checkoutFiles(files: string[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    files.forEach(file => {
      this.mockStatus.modified = this.mockStatus.modified.filter(f => f !== file);
      this.mockStatus.added = this.mockStatus.added.filter(f => f !== file);
    });
  }

  async revert(count: number = 1): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    if (count > this.mockCommits.length) {
      throw new Error('Not enough commits to revert');
    }

    this.mockCommits = this.mockCommits.slice(count);
  }

  // ==================== 分支管理 ====================

  async createBranch(name: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    if (this.mockBranches.find(b => b.name === name)) {
      throw new Error(`Branch ${name} already exists`);
    }

    this.mockBranches.push({
      name,
      isCurrent: false,
      isRemote: false,
      commit: this.mockCommits[0]?.hash ?? ''
    });
  }

  async checkoutBranch(name: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    const branch = this.mockBranches.find(b => b.name === name);
    if (!branch) {
      throw new Error(`Branch ${name} not found`);
    }

    this.mockBranches.forEach(b => b.isCurrent = false);
    branch.isCurrent = true;
    this.currentBranch = name;
  }

  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    const branch = this.mockBranches.find(b => b.name === name);
    if (!branch) {
      throw new Error(`Branch ${name} not found`);
    }

    if (branch.isCurrent && !force) {
      throw new Error('Cannot delete current branch');
    }

    this.mockBranches = this.mockBranches.filter(b => b.name !== name);
  }

  async renameBranch(oldName: string, newName: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Not a git repository');
    }

    const branch = this.mockBranches.find(b => b.name === oldName);
    if (!branch) {
      throw new Error(`Branch ${oldName} not found`);
    }

    branch.name = newName;
  }

  // ==================== 忽略文件 ====================

  async addToGitIgnore(pattern: string): Promise<void> {
    if (!this.gitIgnorePatterns.includes(pattern)) {
      this.gitIgnorePatterns.push(pattern);
    }
  }

  async removeFromGitIgnore(pattern: string): Promise<void> {
    this.gitIgnorePatterns = this.gitIgnorePatterns.filter(p => p !== pattern);
  }

  async getGitIgnore(): Promise<string[]> {
    return [...this.gitIgnorePatterns];
  }

  // ==================== 远程仓库 ====================

  async addRemote(name: string, url: string): Promise<void> {
    if (this.mockRemotes.find(r => r.name === name)) {
      throw new Error(`Remote ${name} already exists`);
    }

    this.mockRemotes.push({ name, url });
  }

  async getRemotes(): Promise<GitRemote[]> {
    return [...this.mockRemotes];
  }

  async push(remote: string = 'origin', branch?: string): Promise<void> {
    if (!this.mockRemotes.find(r => r.name === remote)) {
      throw new Error(`Remote ${remote} not found`);
    }
  }

  async pull(remote: string = 'origin', branch?: string): Promise<void> {
    if (!this.mockRemotes.find(r => r.name === remote)) {
      throw new Error(`Remote ${remote} not found`);
    }
  }

  async fetch(remote: string = 'origin'): Promise<void> {
    if (!this.mockRemotes.find(r => r.name === remote)) {
      throw new Error(`Remote ${remote} not found`);
    }
  }

  // ==================== 辅助方法（用于测试）====================

  /**
   * 设置模拟状态
   */
  setMockStatus(status: Partial<GitStatus>): void {
    this.mockStatus = { ...this.mockStatus, ...status };
  }

  /**
   * 添加模拟提交
   */
  addMockCommit(commit: GitCommit): void {
    this.mockCommits.unshift(commit);
  }

  /**
   * 获取所有提交
   */
  getAllCommits(): GitCommit[] {
    return [...this.mockCommits];
  }

  /**
   * 设置已初始化状态
   */
  setInitialized(initialized: boolean): void {
    this.initialized = initialized;
  }
}
