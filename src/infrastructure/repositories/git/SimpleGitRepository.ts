import simpleGit, { SimpleGit } from 'simple-git';
import { IGitRepository } from '../../../domain/repositories/IGitRepository';
import type {
  GitCommit,
  GitStatus,
  GitDiff,
  GitBranch,
  GitRemote,
  DiffHunk,
  DiffLine,
} from '../../../domain/entities/git';

/**
 * 基于 simple-git 的 Git 仓储实现
 * 在 Electron 环境中运行，需要访问文件系统
 */
export class SimpleGitRepository implements IGitRepository {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit({ baseDir: repoPath });
  }

  // ==================== 仓库管理 ====================

  async init(): Promise<void> {
    await this.git.init();

    // 创建默认 .gitignore
    await this.createDefaultGitIgnore();
  }

  async isRepository(): Promise<boolean> {
    try {
      const gitDir = `${this.repoPath}/.git`;
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.file) {
        return await electronAPI.file.existsPath(gitDir);
      }

      // Fallback: 尝试检查 .git 是否存在
      await this.git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  // ==================== 状态查询 ====================

  async getStatus(): Promise<GitStatus> {
    const status = await this.git.status();

    return {
      modified: status.modified,
      added: status.created,
      deleted: status.deleted,
      untracked: status.not_added,
      conflicts: status.conflicts,
      staged: status.staged,
    };
  }

  async getCurrentBranch(): Promise<string> {
    const branches = await this.git.branch();
    return branches.current || 'HEAD';
  }

  async getBranches(): Promise<GitBranch[]> {
    const branches = await this.git.branch();

    const allBranches = branches.all.map(name => ({
      name,
      isCurrent: name === branches.current,
      isRemote: name.includes('origin/') || name.includes('upstream/'),
      commit: branches.branches[name] || '',
    }));

    // 去重
    const unique = new Map<string, GitBranch>();
    allBranches.forEach(b => unique.set(b.name, b));

    return Array.from(unique.values());
  }

  // ==================== 提交操作 ====================

  async commit(message: string, files?: string[]): Promise<string> {
    if (files && files.length > 0) {
      await this.git.add(files);
    } else {
      await this.git.add('.');
    }

    const result = await this.git.commit(message);
    return result.commit as string;
  }

  async add(files: string[]): Promise<void> {
    await this.git.add(files);
  }

  async addAll(): Promise<void> {
    await this.git.add('.');
  }

  // ==================== 历史记录 ====================

  async getLog(limit: number = 50, skip: number = 0): Promise<GitCommit[]> {
    const log = await this.git.log({
      maxCount: limit,
      from: skip > 0 ? `HEAD~${skip}` : undefined,
    });

    return log.all.map(commit => ({
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      author: commit.author_name,
      message: commit.message,
      date: new Date(commit.date),
      files: commit.files || [],
    }));
  }

  async getCommit(hash: string): Promise<GitCommit> {
    const log = await this.git.log({ from: hash, maxCount: 1 });
    const commit = log.all[0];

    if (!commit) {
      throw new Error(`Commit ${hash} not found`);
    }

    return {
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      author: commit.author_name,
      message: commit.message,
      date: new Date(commit.date),
      files: commit.files || [],
    };
  }

  async getFileHistory(filePath: string, limit: number = 50): Promise<GitCommit[]> {
    const log = await this.git.log({ file: filePath, maxCount: limit });

    return log.all.map(commit => ({
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      author: commit.author_name,
      message: commit.message,
      date: new Date(commit.date),
      files: commit.files || [],
    }));
  }

  // ==================== 差异对比 ====================

  async getDiff(file?: string): Promise<GitDiff> {
    const diffText = await this.git.diff([file || 'HEAD']);
    return this.parseDiff(diffText, file || '');
  }

  async getDiffBetweenCommits(
    fromHash: string,
    toHash: string,
    file?: string
  ): Promise<GitDiff> {
    const args = [fromHash, toHash];
    if (file) args.push(file);

    const diffText = await this.git.diff(args);
    return this.parseDiff(diffText, file || '');
  }

  async getStagedDiff(file?: string): Promise<GitDiff> {
    const args = ['--staged'];
    if (file) args.push(file);

    const diffText = await this.git.diff(args);
    return this.parseDiff(diffText, file || '');
  }

  /**
   * 解析 git diff 输出
   */
  private parseDiff(diffText: string, file: string): GitDiff {
    const lines = diffText.split('\n');
    const hunks: DiffHunk[] = [];
    let currentHunk: Partial<DiffHunk> | null = null;

    for (const line of lines) {
      // 解析 hunk 头：@@ -oldStart,oldLines +newStart,newLines @@
      const hunkMatch = line.match(/^@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
      if (hunkMatch) {
        if (currentHunk && currentHunk.lines) {
          hunks.push(currentHunk as DiffHunk);
        }
        currentHunk = {
          oldStart: parseInt(hunkMatch[1]),
          oldLines: parseInt(hunkMatch[2] || '1'),
          newStart: parseInt(hunkMatch[3]),
          newLines: parseInt(hunkMatch[4] || '1'),
          lines: [],
        };
        continue;
      }

      // 解析差异行
      if (currentHunk && currentHunk.lines && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        const type: '+' | '-' | ' ' = line[0] as '+' | '-' | ' ';
        currentHunk.lines.push({
          type,
          content: line.substring(1),
        });
      }
    }

    if (currentHunk && currentHunk.lines) {
      hunks.push(currentHunk as DiffHunk);
    }

    return {
      file,
      hunks,
    };
  }

  // ==================== 回滚操作 ====================

  async checkoutCommit(hash: string, createBranch: boolean = false): Promise<void> {
    if (createBranch) {
      await this.git.checkout(['-b', hash]);
    } else {
      await this.git.checkout(hash);
    }
  }

  async reset(hash: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<void> {
    await this.git.reset(mode, hash);
  }

  async checkoutFiles(files: string[]): Promise<void> {
    await this.git.checkout(files);
  }

  async revert(count: number = 1): Promise<void> {
    await this.git.revert(null, [`HEAD~${count}..HEAD`]);
  }

  // ==================== 分支管理 ====================

  async createBranch(name: string): Promise<void> {
    await this.git.checkoutLocalBranch(name);
  }

  async checkoutBranch(name: string): Promise<void> {
    await this.git.checkout(name);
  }

  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    await this.git.deleteLocalBranch(name, force);
  }

  async renameBranch(oldName: string, newName: string): Promise<void> {
    await this.git.branch(['-m', oldName, newName]);
  }

  // ==================== 忽略文件 ====================

  async addToGitIgnore(pattern: string): Promise<void> {
    const gitignorePath = `${this.repoPath}/.gitignore`;
    const electronAPI = (window as any).electronAPI;

    let content = '';

    try {
      if (electronAPI && electronAPI.file) {
        const exists = await electronAPI.file.existsPath(gitignorePath);
        if (exists) {
          content = await electronAPI.file.readFileContent(gitignorePath);
        }
      }
    } catch (error) {
      console.error('Error reading .gitignore:', error);
      throw error;
    }

    // 检查是否已存在
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    if (!lines.includes(pattern)) {
      content += `${content.endsWith('\n') ? '' : '\n'}${pattern}\n`;

      try {
        if (electronAPI && electronAPI.file) {
          await electronAPI.file.writeFileContent(gitignorePath, content);
        }
      } catch (error) {
        console.error('Error writing .gitignore:', error);
        throw new Error('Failed to update .gitignore');
      }
    }
  }

  async removeFromGitIgnore(pattern: string): Promise<void> {
    const gitignorePath = `${this.repoPath}/.gitignore`;
    const electronAPI = (window as any).electronAPI;

    try {
      if (electronAPI && electronAPI.file) {
        const exists = await electronAPI.file.existsPath(gitignorePath);
        if (!exists) {
          return;
        }

        const content = await electronAPI.file.readFileContent(gitignorePath);
        const lines = content.split('\n').filter(line => line.trim() !== pattern);

        await electronAPI.file.writeFileContent(gitignorePath, lines.join('\n'));
      }
    } catch (error) {
      console.error('Error updating .gitignore:', error);
      throw error;
    }
  }

  async getGitIgnore(): Promise<string[]> {
    const gitignorePath = `${this.repoPath}/.gitignore`;
    const electronAPI = (window as any).electronAPI;

    try {
      if (electronAPI && electronAPI.file) {
        const exists = await electronAPI.file.existsPath(gitignorePath);
        if (!exists) {
          return [];
        }

        const content = await electronAPI.file.readFileContent(gitignorePath);
        return content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));
      }
    } catch (error) {
      console.error('Error reading .gitignore:', error);
    }

    return [];
  }

  // ==================== 远程仓库 ====================

  async addRemote(name: string, url: string): Promise<void> {
    await this.git.addRemote(name, url);
  }

  async getRemotes(): Promise<GitRemote[]> {
    const remotes = await this.git.getRemotes(true);
    return remotes.map(r => ({
      name: r.name,
      url: r.refs.fetch || '',
    }));
  }

  async push(remote: string = 'origin', branch?: string): Promise<void> {
    const args = [remote];
    if (branch) args.push(branch);
    await this.git.push(args);
  }

  async pull(remote: string = 'origin', branch?: string): Promise<void> {
    const args = [remote];
    if (branch) args.push(branch);
    await this.git.pull(args);
  }

  async fetch(remote: string = 'origin'): Promise<void> {
    await this.git.fetch(remote);
  }

  // ==================== 私有方法 ====================

  /**
   * 创建默认 .gitignore 文件
   */
  private async createDefaultGitIgnore(): Promise<void> {
    const gitignorePath = `${this.repoPath}/.gitignore`;
    const electronAPI = (window as any).electronAPI;

    try {
      if (electronAPI && electronAPI.file) {
        const exists = await electronAPI.file.existsPath(gitignorePath);
        if (exists) {
          return;
        }

        const defaultIgnore = [
          '# Dependencies',
          'node_modules/',
          '',
          '# Build output',
          'dist/',
          'release/',
          '',
          '# IDE',
          '.vscode/',
          '.idea/',
          '*.swp',
          '*.swo',
          '',
          '# OS',
          '.DS_Store',
          'Thumbs.db',
          '',
          '# App specific',
          'file-cache/',
          '*.log',
          '',
          '# Config (may contain sensitive data)',
          'config.json',
        ].join('\n');

        await electronAPI.file.writeFileContent(gitignorePath, defaultIgnore);
      }
    } catch (error) {
      console.error('Error creating .gitignore:', error);
    }
  }
}
