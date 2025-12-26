import type {
  GitCommit,
  GitStatus,
  GitDiff,
  GitBranch,
  GitRemote,
  DiffHunk,
  DiffLine,
} from '../../../domain/entities/git';
import type { IGitRepository } from '../../../domain/repositories/IGitRepository';

/**
 * 基于 Electron IPC 的 Git 仓储实现
 * 将所有 Git 操作委托给主进程执行
 */
export class ElectronGitRepository implements IGitRepository {
  private electronAPI: any;

  constructor() {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      this.electronAPI = (window as any).electronAPI;
    } else {
      console.warn('[ElectronGitRepository] electronAPI not found');
    }
  }

  private async invoke(channel: string, ...args: any[]): Promise<any> {
    if (!this.electronAPI) {
      throw new Error('Electron API not available');
    }
    return this.electronAPI.git[channel](...args);
  }

  // ==================== 仓库管理 ====================

  async init(): Promise<void> {
    return this.invoke('init');
  }

  async isRepository(): Promise<boolean> {
    return this.invoke('isRepository');
  }

  // ==================== 状态查询 ====================

  async getStatus(): Promise<GitStatus> {
    return this.invoke('getStatus');
  }

  async getCurrentBranch(): Promise<string> {
    return this.invoke('getCurrentBranch');
  }

  async getBranches(): Promise<GitBranch[]> {
    return this.invoke('getBranches');
  }

  // ==================== 提交操作 ====================

  async commit(message: string, files?: string[]): Promise<string> {
    return this.invoke('commit', message, files);
  }

  async add(files: string[]): Promise<void> {
    return this.invoke('add', files);
  }

  async addAll(): Promise<void> {
    return this.invoke('addAll');
  }

  // ==================== 历史记录 ====================

  async getLog(limit?: number, skip?: number): Promise<GitCommit[]> {
    return this.invoke('getLog', limit, skip);
  }

  async getCommit(hash: string): Promise<GitCommit> {
    return this.invoke('getCommit', hash);
  }

  async getFileHistory(filePath: string, limit?: number): Promise<GitCommit[]> {
    return this.invoke('getFileHistory', filePath, limit);
  }

  // ==================== 差异对比 ====================

  async getDiff(file?: string): Promise<GitDiff> {
    return this.invoke('getDiff', file);
  }

  async getDiffBetweenCommits(
    fromHash: string,
    toHash: string,
    file?: string
  ): Promise<GitDiff> {
    return this.invoke('getDiffBetweenCommits', fromHash, toHash, file);
  }

  async getStagedDiff(file?: string): Promise<GitDiff> {
    return this.invoke('getStagedDiff', file);
  }

  // ==================== 回滚操作 ====================

  async checkoutCommit(hash: string, createBranch?: boolean): Promise<void> {
    return this.invoke('checkoutCommit', hash, createBranch);
  }

  async reset(hash: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void> {
    return this.invoke('reset', hash, mode);
  }

  async checkoutFiles(files: string[]): Promise<void> {
    return this.invoke('checkoutFiles', files);
  }

  async revert(count?: number): Promise<void> {
    return this.invoke('revert', count);
  }

  // ==================== 分支管理 ====================

  async createBranch(name: string): Promise<void> {
    return this.invoke('createBranch', name);
  }

  async checkoutBranch(name: string): Promise<void> {
    return this.invoke('checkoutBranch', name);
  }

  async deleteBranch(name: string, force?: boolean): Promise<void> {
    return this.invoke('deleteBranch', name, force);
  }

  async renameBranch(oldName: string, newName: string): Promise<void> {
    return this.invoke('renameBranch', oldName, newName);
  }

  // ==================== 忽略文件 ====================

  async addToGitIgnore(pattern: string): Promise<void> {
    return this.invoke('addToGitIgnore', pattern);
  }

  async removeFromGitIgnore(pattern: string): Promise<void> {
    return this.invoke('removeFromGitIgnore', pattern);
  }

  async getGitIgnore(): Promise<string[]> {
    return this.invoke('getGitIgnore');
  }

  // ==================== 远程仓库 ====================

  async addRemote(name: string, url: string): Promise<void> {
    return this.invoke('addRemote', name, url);
  }

  async getRemotes(): Promise<GitRemote[]> {
    return this.invoke('getRemotes');
  }

  async push(remote?: string, branch?: string): Promise<void> {
    return this.invoke('push', remote, branch);
  }

  async pull(remote?: string, branch?: string): Promise<void> {
    return this.invoke('pull', remote, branch);
  }

  async fetch(remote?: string): Promise<void> {
    return this.invoke('fetch', remote);
  }
}
