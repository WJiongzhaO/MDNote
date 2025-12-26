import type { GitCommit } from '../../../domain/entities/git';

/**
 * 提交历史请求 DTO
 */
export interface CommitHistoryRequest {
  /** 返回的最大记录数 */
  limit?: number;

  /** 跳过的记录数 */
  skip?: number;

  /** 文件路径（可选，获取特定文件的历史） */
  filePath?: string;
}

/**
 * 提交历史响应 DTO
 */
export interface CommitHistoryResponse {
  /** 提交列表 */
  commits: GitCommit[];

  /** 总记录数 */
  total: number;

  /** 是否有更多记录 */
  hasMore: boolean;
}

/**
 * 提交操作请求 DTO
 */
export interface CommitRequest {
  /** 提交信息 */
  message: string;

  /** 要提交的文件列表（可选） */
  files?: string[];

  /** 是否自动添加所有更改 */
  addAll?: boolean;
}

/**
 * 提交操作响应 DTO
 */
export interface CommitResponse {
  /** 提交 hash */
  hash: string;

  /** 是否成功 */
  success: boolean;

  /** 错误信息 */
  error?: string;
}
