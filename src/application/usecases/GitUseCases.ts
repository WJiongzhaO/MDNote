import { injectable, inject } from 'inversify';
import type { IGitRepository } from '../../domain/repositories/IGitRepository';
import type { GitCommit, GitStatus, GitDiff } from '../../domain/entities/git';
import { TYPES } from '../../core/container/container.types';
import type {
  CommitHistoryRequest,
  CommitHistoryResponse,
  CommitRequest,
  CommitResponse,
} from '../dto/git/CommitDTO';
import type { DiffRequest, DiffResponse } from '../dto/git/DiffDTO';

/**
 * Git 用例类
 * 封装所有 Git 相关的业务逻辑
 */
@injectable()
export class GitUseCases {
  constructor(
    @inject(TYPES.GitRepository) private gitRepository: IGitRepository
  ) {}

  // ==================== 仓库管理 ====================

  /**
   * 初始化 Git 仓库
   * @throws Error 如果初始化失败
   */
  async initializeRepository(): Promise<void> {
    const isRepo = await this.gitRepository.isRepository();

    if (!isRepo) {
      await this.gitRepository.init();
    }
  }

  /**
   * 检查是否为 Git 仓库
   */
  async isRepository(): Promise<boolean> {
    return await this.gitRepository.isRepository();
  }

  // ==================== 状态查询 ====================

  /**
   * 获取当前工作区状态
   */
  async getStatus(): Promise<GitStatus> {
    return await this.gitRepository.getStatus();
  }

  /**
   * 检查是否有未提交的更改
   */
  async hasChanges(): Promise<boolean> {
    const status = await this.gitRepository.getStatus();
    return (
      status.modified.length > 0 ||
      status.added.length > 0 ||
      status.deleted.length > 0 ||
      status.staged.length > 0
    );
  }

  /**
   * 获取当前分支
   */
  async getCurrentBranch(): Promise<string> {
    return await this.gitRepository.getCurrentBranch();
  }

  /**
   * 获取所有分支
   */
  async getBranches(): Promise<string[]> {
    const branches = await this.gitRepository.getBranches();
    return branches.map(b => b.name);
  }

  // ==================== 提交操作 ====================

  /**
   * 提交更改
   */
  async commitChanges(request: CommitRequest): Promise<CommitResponse> {
    try {
      if (request.addAll || !request.files || request.files.length === 0) {
        await this.gitRepository.addAll();
      }

      const hash = await this.gitRepository.commit(request.message, request.files);

      return {
        hash,
        success: true,
      };
    } catch (error: any) {
      return {
        hash: '',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 快速提交（使用默认消息）
   */
  async quickCommit(message: string): Promise<CommitResponse> {
    return await this.commitChanges({ message, addAll: true });
  }

  // ==================== 历史记录 ====================

  /**
   * 获取提交历史
   */
  async getCommitHistory(request: CommitHistoryRequest = {}): Promise<CommitHistoryResponse> {
    const limit = request.limit || 50;
    const skip = request.skip || 0;

    let commits: GitCommit[];

    if (request.filePath) {
      commits = await this.gitRepository.getFileHistory(request.filePath, limit);
    } else {
      commits = await this.gitRepository.getLog(limit, skip);
    }

    return {
      commits,
      total: commits.length,
      hasMore: commits.length === limit,
    };
  }

  /**
   * 获取特定提交
   */
  async getCommit(hash: string): Promise<GitCommit> {
    return await this.gitRepository.getCommit(hash);
  }

  // ==================== 差异对比 ====================

  /**
   * 获取差异对比
   */
  async compareVersions(request: DiffRequest): Promise<DiffResponse> {
    let diff: GitDiff;

    if (request.staged) {
      diff = await this.gitRepository.getStagedDiff(request.file);
    } else if (request.fromHash && request.toHash) {
      diff = await this.gitRepository.getDiffBetweenCommits(
        request.fromHash,
        request.toHash,
        request.file
      );
    } else {
      diff = await this.gitRepository.getDiff(request.file);
    }

    return {
      diff,
      hasChanges: diff.hunks.length > 0,
    };
  }

  // ==================== 回滚操作 ====================

  /**
   * 回滚到指定版本
   */
  async revertToVersion(
    hash: string,
    mode: 'soft' | 'mixed' | 'hard' = 'mixed'
  ): Promise<void> {
    await this.gitRepository.reset(hash, mode);
  }

  /**
   * 切换到指定提交（仅查看）
   */
  async checkoutVersion(hash: string): Promise<void> {
    await this.gitRepository.checkoutCommit(hash);
  }

  /**
   * 撤销文件更改
   */
  async discardChanges(files: string[]): Promise<void> {
    await this.gitRepository.checkoutFiles(files);
  }

  // ==================== 分支管理 ====================

  /**
   * 创建新分支
   */
  async createBranch(name: string): Promise<void> {
    await this.gitRepository.createBranch(name);
  }

  /**
   * 切换分支
   */
  async switchBranch(name: string): Promise<void> {
    await this.gitRepository.checkoutBranch(name);
  }

  /**
   * 删除分支
   */
  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    await this.gitRepository.deleteBranch(name, force);
  }

  // ==================== 忽略文件 ====================

  /**
   * 添加忽略模式
   */
  async addIgnorePattern(pattern: string): Promise<void> {
    await this.gitRepository.addToGitIgnore(pattern);
  }

  /**
   * 移除忽略模式
   */
  async removeIgnorePattern(pattern: string): Promise<void> {
    await this.gitRepository.removeFromGitIgnore(pattern);
  }

  /**
   * 获取忽略列表
   */
  async getIgnorePatterns(): Promise<string[]> {
    return await this.gitRepository.getGitIgnore();
  }
}
