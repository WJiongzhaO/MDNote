import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import { Application } from '../../../core/application';
import type { GitCommit, GitStatus, GitDiff } from '../../../domain/entities/git';

/**
 * Git Composable
 * 提供响应式的 Git 操作功能
 */
export function useGit(repoPath: Ref<string> | string) {
  const app = Application.getInstance();
  const gitUseCases = app.getGitUseCases();

  // 响应式状态
  const status = ref<GitStatus | null>(null);
  const commits = ref<GitCommit[]>([]);
  const currentBranch = ref<string>('');
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const isRepo = ref<boolean>(false);

  // 计算属性
  const hasChanges = computed(() => {
    if (!status.value) return false;
    return (
      status.value.modified.length > 0 ||
      status.value.added.length > 0 ||
      status.value.deleted.length > 0 ||
      status.value.untracked.length > 0 ||
      status.value.staged.length > 0 ||
      status.value.conflicts.length > 0
    );
  });

  const modifiedFiles = computed(() => status.value?.modified || []);
  const addedFiles = computed(() => status.value?.added || []);
  const deletedFiles = computed(() => status.value?.deleted || []);
  const untrackedFiles = computed(() => status.value?.untracked || []);
  const stagedFiles = computed(() => status.value?.staged || []);
  const conflictedFiles = computed(() => status.value?.conflicts || []);

  const totalChanges = computed(() => {
    if (!status.value) return 0;
    return (
      status.value.modified.length +
      status.value.added.length +
      status.value.deleted.length +
      status.value.untracked.length
    );
  });

  // ==================== 仓库管理 ====================

  /**
   * 检查是否为 Git 仓库
   */
  const checkRepository = async () => {
    try {
      console.log('[useGit] checkRepository called');
      const result = await gitUseCases.isRepository();
      isRepo.value = result;
      console.log('[useGit] isRepository result:', result);
      return isRepo.value;
    } catch (e: any) {
      console.error('[useGit] checkRepository error:', e);
      error.value = e.message;
      return false;
    }
  };

  /**
   * 初始化 Git 仓库
   */
  const initRepository = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[useGit] initRepository called');
      await gitUseCases.initializeRepository();
      isRepo.value = true;
      console.log('[useGit] Repository initialized successfully');
      await refreshStatus();
      await fetchHistory();
    } catch (e: any) {
      console.error('[useGit] initRepository error:', e);
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  };

  // ==================== 状态查询 ====================

  /**
   * 刷新状态
   */
  const refreshStatus = async () => {
    try {
      status.value = await gitUseCases.getStatus();
      currentBranch.value = await gitUseCases.getCurrentBranch();
    } catch (e: any) {
      error.value = e.message;
    }
  };

  /**
   * 检查是否有更改
   */
  const checkChanges = async () => {
    return await gitUseCases.hasChanges();
  };

  // ==================== 提交操作 ====================

  /**
   * 提交更改
   */
  const commit = async (message: string, files?: string[]) => {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await gitUseCases.commitChanges({
        message,
        files,
        addAll: !files || files.length === 0,
      });

      if (result.success) {
        await refreshStatus();
        await fetchHistory();
        return result;
      } else {
        error.value = result.error || '提交失败';
        return result;
      }
    } catch (e: any) {
      error.value = e.message;
      return { hash: '', success: false, error: e.message };
    } finally {
      isLoading.value = false;
    }
  };

  // ==================== 历史记录 ====================

  /**
   * 获取历史记录
   */
  const fetchHistory = async (limit: number = 50, filePath?: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await gitUseCases.getCommitHistory({ limit, filePath });
      commits.value = response.commits;
      return response;
    } catch (e: any) {
      error.value = e.message;
      return { commits: [], total: 0, hasMore: false };
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 加载更多历史记录
   */
  const loadMoreCommits = async () => {
    return await fetchHistory(commits.value.length + 50);
  };

  // ==================== 差异对比 ====================

  /**
   * 获取差异
   */
  const getDiff = async (file?: string) => {
    try {
      const response = await gitUseCases.compareVersions({ file });
      return response.diff;
    } catch (e: any) {
      error.value = e.message;
      return null;
    }
  };

  /**
   * 对比两个版本
   */
  const compareCommits = async (fromHash: string, toHash: string, file?: string) => {
    try {
      const response = await gitUseCases.compareVersions({
        fromHash,
        toHash,
        file,
      });
      return response.diff;
    } catch (e: any) {
      error.value = e.message;
      return null;
    }
  };

  // ==================== 回滚操作 ====================

  /**
   * 回滚到指定版本
   */
  const revertTo = async (hash: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed') => {
    isLoading.value = true;
    error.value = null;

    try {
      await gitUseCases.revertToVersion(hash, mode);
      await refreshStatus();
      await fetchHistory();
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 切换到指定提交（仅查看）
   */
  const checkoutTo = async (hash: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      await gitUseCases.checkoutVersion(hash);
      await refreshStatus();
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 丢弃文件更改
   */
  const discardChanges = async (files: string[]) => {
    isLoading.value = true;
    error.value = null;

    try {
      await gitUseCases.discardChanges(files);
      await refreshStatus();
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  };

  // ==================== 分支管理 ====================

  /**
   * 创建分支
   */
  const createBranch = async (name: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      await gitUseCases.createBranch(name);
      await refreshStatus();
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 切换分支
   */
  const switchBranch = async (name: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      await gitUseCases.switchBranch(name);
      await refreshStatus();
      await fetchHistory();
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 删除分支
   */
  const deleteBranch = async (name: string, force: boolean = false) => {
    isLoading.value = true;
    error.value = null;

    try {
      await gitUseCases.deleteBranch(name, force);
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  };

  // ==================== 忽略文件 ====================

  /**
   * 添加忽略模式
   */
  const addIgnorePattern = async (pattern: string) => {
    try {
      await gitUseCases.addIgnorePattern(pattern);
    } catch (e: any) {
      error.value = e.message;
    }
  };

  /**
   * 移除忽略模式
   */
  const removeIgnorePattern = async (pattern: string) => {
    try {
      await gitUseCases.removeIgnorePattern(pattern);
    } catch (e: any) {
      error.value = e.message;
    }
  };

  /**
   * 获取忽略列表
   */
  const getIgnorePatterns = async () => {
    try {
      return await gitUseCases.getIgnorePatterns();
    } catch (e: any) {
      error.value = e.message;
      return [];
    }
  };

  return {
    // 状态
    status,
    commits,
    currentBranch,
    isLoading,
    error,
    isRepo,

    // 计算属性
    hasChanges,
    modifiedFiles,
    addedFiles,
    deletedFiles,
    untrackedFiles,
    stagedFiles,
    conflictedFiles,
    totalChanges,

    // 方法
    checkRepository,
    initRepository,
    refreshStatus,
    checkChanges,
    commit,
    fetchHistory,
    loadMoreCommits,
    getDiff,
    compareCommits,
    revertTo,
    checkoutTo,
    discardChanges,
    createBranch,
    switchBranch,
    deleteBranch,
    addIgnorePattern,
    removeIgnorePattern,
    getIgnorePatterns,
  };
}
