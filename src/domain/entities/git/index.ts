/**
 * Git 实体统一导出文件
 * 使用 Barrel Pattern 统一管理所有 Git 相关实体的导出
 * 避免导出不一致导致的运行时错误
 */

// 核心实体
export type {
  GitCommit,
  GitStatus,
  GitDiff,
  GitBranch,
  GitRemote,
} from './GitEntities';

// Diff 相关类型
export type {
  DiffHunk,
  DiffLine,
} from './GitEntities';

// 重新导出所有实体（向后兼容）
export {
  GitCommit,
  GitStatus,
  GitDiff,
  GitBranch,
  GitRemote,
  DiffHunk,
  DiffLine,
} from './GitEntities';
