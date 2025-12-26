/**
 * Git 实体定义
 * 包含所有 Git 相关的领域实体
 */

/**
 * Git 提交实体
 */
export interface GitCommit {
  /** 完整的 commit hash */
  hash: string;

  /** 短 hash（前 7 位） */
  shortHash: string;

  /** 作者名称 */
  author: string;

  /** 提交信息 */
  message: string;

  /** 提交日期 */
  date: Date;

  /** 涉及的文件列表 */
  files: string[];
}

/**
 * Git 状态实体
 */
export interface GitStatus {
  /** 已修改的文件 */
  modified: string[];

  /** 新增的文件 */
  added: string[];

  /** 删除的文件 */
  deleted: string[];

  /** 未跟踪的文件 */
  untracked: string[];

  /** 是否有冲突 */
  conflicts: string[];

  /** 是否有暂存区更改 */
  staged: string[];
}

/**
 * Git 差异实体
 */
export interface GitDiff {
  /** 文件路径 */
  file: string;

  /** 旧内容 */
  oldContent?: string;

  /** 新内容 */
  newContent?: string;

  /** 差异块 */
  hunks: DiffHunk[];
}

/**
 * 差异块
 */
export interface DiffHunk {
  /** 旧文件起始行 */
  oldStart: number;

  /** 旧文件行数 */
  oldLines: number;

  /** 新文件起始行 */
  newStart: number;

  /** 新文件行数 */
  newLines: number;

  /** 差异行 */
  lines: DiffLine[];
}

/**
 * 差异行
 */
export interface DiffLine {
  /** 行类型：+ 新增，- 删除，' ' 无变化 */
  type: '+' | '-' | ' ';

  /** 行号 */
  lineNumber?: number;

  /** 行内容 */
  content: string;
}

/**
 * Git 分支实体
 */
export interface GitBranch {
  /** 分支名称 */
  name: string;

  /** 是否为当前分支 */
  isCurrent: boolean;

  /** 是否为远程分支 */
  isRemote: boolean;

  /** 最新提交 hash */
  commit: string;
}

/**
 * Git 远程仓库实体
 */
export interface GitRemote {
  /** 远程仓库名称 */
  name: string;

  /** 远程仓库 URL */
  url: string;
}
