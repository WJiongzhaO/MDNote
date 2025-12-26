import type { GitDiff } from '../../../domain/entities/git';

/**
 * 差异对比请求 DTO
 */
export interface DiffRequest {
  /** 起始提交 hash（可选，默认对比工作区） */
  fromHash?: string;

  /** 结束提交 hash（可选） */
  toHash?: string;

  /** 文件路径（可选） */
  file?: string;

  /** 是否对比暂存区 */
  staged?: boolean;
}

/**
 * 差异对比响应 DTO
 */
export interface DiffResponse {
  /** 差异信息 */
  diff: GitDiff;

  /** 是否有差异 */
  hasChanges: boolean;
}
