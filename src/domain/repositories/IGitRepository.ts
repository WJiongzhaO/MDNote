import type {
  GitCommit,
  GitStatus,
  GitDiff,
  GitBranch,
  GitRemote
} from '../entities/git';

/**
 * Git 仓储接口
 * 定义所有 Git 操作的抽象接口
 */
export interface IGitRepository {
  // ==================== 仓库管理 ====================

  /**
   * 初始化 Git 仓库
   * @throws Error 如果初始化失败
   */
  init(): Promise<void>;

  /**
   * 检查是否为 Git 仓库
   * @returns 是否为 Git 仓库
   */
  isRepository(): Promise<boolean>;

  // ==================== 状态查询 ====================

  /**
   * 获取当前工作区状态
   * @returns Git 状态信息
   */
  getStatus(): Promise<GitStatus>;

  /**
   * 获取当前分支名称
   * @returns 当前分支名称
   */
  getCurrentBranch(): Promise<string>;

  /**
   * 获取所有分支
   * @returns 分支列表
   */
  getBranches(): Promise<GitBranch[]>;

  // ==================== 提交操作 ====================

  /**
   * 提交更改
   * @param message 提交信息
   * @param files 要提交的文件列表（可选，不传则提交所有更改）
   * @returns 提交 hash
   * @throws Error 如果没有可提交的更改
   */
  commit(message: string, files?: string[]): Promise<string>;

  /**
   * 添加文件到暂存区
   * @param files 文件列表
   */
  add(files: string[]): Promise<void>;

  /**
   * 添加所有更改到暂存区
   */
  addAll(): Promise<void>;

  // ==================== 历史记录 ====================

  /**
   * 获取提交历史
   * @param limit 返回的最大记录数
   * @param skip 跳过的记录数
   * @returns 提交历史列表
   */
  getLog(limit?: number, skip?: number): Promise<GitCommit[]>;

  /**
   * 获取特定提交的详细信息
   * @param hash 提交 hash
   * @returns 提交信息
   */
  getCommit(hash: string): Promise<GitCommit>;

  /**
   * 获取文件的提交历史
   * @param filePath 文件路径
   * @param limit 返回的最大记录数
   * @returns 该文件的提交历史
   */
  getFileHistory(filePath: string, limit?: number): Promise<GitCommit[]>;

  // ==================== 差异对比 ====================

  /**
   * 获取工作区与暂存区的差异
   * @param file 文件路径（可选，不传则返回所有差异）
   * @returns 差异信息
   */
  getDiff(file?: string): Promise<GitDiff>;

  /**
   * 获取两个提交之间的差异
   * @param fromHash 起始提交 hash
   * @param toHash 结束提交 hash
   * @param file 文件路径（可选）
   * @returns 差异信息
   */
  getDiffBetweenCommits(fromHash: string, toHash: string, file?: string): Promise<GitDiff>;

  /**
   * 获取暂存区与最近提交的差异
   * @param file 文件路径（可选）
   * @returns 差异信息
   */
  getStagedDiff(file?: string): Promise<GitDiff>;

  // ==================== 回滚操作 ====================

  /**
   * 切换到指定提交
   * @param hash 提交 hash
   * @param createBranch 是否创建新分支（默认 false）
   */
  checkoutCommit(hash: string, createBranch?: boolean): Promise<void>;

  /**
   * 重置到指定提交
   * @param hash 提交 hash
   * @param mode 重置模式：soft/mixed/hard
   */
  reset(hash: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void>;

  /**
   * 撤销工作区的更改
   * @param files 文件列表
   */
  checkoutFiles(files: string[]): Promise<void>;

  /**
   * 回滚最近的提交
   * @param count 要回滚的提交数
   */
  revert(count?: number): Promise<void>;

  // ==================== 分支管理 ====================

  /**
   * 创建新分支
   * @param name 分支名称
   */
  createBranch(name: string): Promise<void>;

  /**
   * 切换分支
   * @param name 分支名称
   */
  checkoutBranch(name: string): Promise<void>;

  /**
   * 删除本地分支
   * @param name 分支名称
   * @param force 是否强制删除
   */
  deleteBranch(name: string, force?: boolean): Promise<void>;

  /**
   * 重命名分支
   * @param oldName 旧名称
   * @param newName 新名称
   */
  renameBranch(oldName: string, newName: string): Promise<void>;

  // ==================== 忽略文件 ====================

  /**
   * 添加模式到 .gitignore
   * @param pattern 忽略模式
   */
  addToGitIgnore(pattern: string): Promise<void>;

  /**
   * 从 .gitignore 移除模式
   * @param pattern 忽略模式
   */
  removeFromGitIgnore(pattern: string): Promise<void>;

  /**
   * 读取 .gitignore 内容
   * @returns .gitignore 内容行数组
   */
  getGitIgnore(): Promise<string[]>;

  // ==================== 远程仓库（可选）====================

  /**
   * 添加远程仓库
   * @param name 远程仓库名称
   * @param url 远程仓库 URL
   */
  addRemote(name: string, url: string): Promise<void>;

  /**
   * 获取远程仓库列表
   * @returns 远程仓库列表
   */
  getRemotes(): Promise<GitRemote[]>;

  /**
   * 推送到远程仓库
   * @param remote 远程仓库名称
   * @param branch 分支名称
   */
  push(remote?: string, branch?: string): Promise<void>;

  /**
   * 从远程仓库拉取
   * @param remote 远程仓库名称
   * @param branch 分支名称
   */
  pull(remote?: string, branch?: string): Promise<void>;

  /**
   * 获取远程仓库更新
   * @param remote 远程仓库名称
   */
  fetch(remote?: string): Promise<void>;
}
