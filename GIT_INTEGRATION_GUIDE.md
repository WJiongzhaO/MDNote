# MDNote Git 集成开发文档

## 目录
- [项目概述](#项目概述)
- [技术方案](#技术方案)
- [架构设计](#架构设计)
- [功能模块](#功能模块)
- [开发步骤](#开发步骤)
- [代码实现](#代码实现)
- [测试指南](#测试指南)
- [部署与发布](#部署与发布)
- [注意事项](#注意事项)

---

## 项目概述

### 背景

为 MDNote 笔记软件集成 Git 版本控制功能，提供：
- 完整的版本历史记录
- 文档版本对比
- 一键回滚到任意版本
- 分支管理（实验性功能）
- 自动提交与手动提交

### 目标

- ✅ 无需用户安装 Git（应用内置）
- ✅ 简洁直观的可视化界面
- ✅ 与现有 DDD 架构完美集成
- ✅ 不影响现有功能

---

## 技术方案

### 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| simple-git | ^3.20.0 | Git 操作封装库 |
| TypeScript | 5.6.2 | 类型安全 |
| InversifyJS | 7.10.8 | 依赖注入 |
| Vue 3 | 3.5.12 | UI 界面 |

### 为什么选择 simple-git？

✅ **优势**：
- 纯 JavaScript 实现，无需系统安装 Git
- 跨平台支持（Windows/macOS/Linux）
- Promise-based API，易于异步操作
- 完善的 TypeScript 类型定义
- 活跃维护，社区成熟

❌ **替代方案对比**：
- `nodegit`：依赖 native 模块，编译复杂
- 直接调用系统 git：需要用户预装 Git

---

## 架构设计

### DDD 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  GitPanel.vue│  │CommitHistory │  │  FileDiff.vue│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌─────────────────────────────────────────────────┐   │
│  │            useGit.ts (Composable)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │              GitUseCases.ts                     │   │
│  │  - initializeRepository()                       │   │
│  │  - commitChanges()                              │   │
│  │  - getCommitHistory()                           │   │
│  │  - revertToVersion()                            │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │           DTO (Data Transfer Objects)           │   │
│  │  - CommitDTO.ts                                 │   │
│  │  - DiffDTO.ts                                   │   │
│  │  - StatusDTO.ts                                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Domain Layer                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Entities (实体)                       │   │
│  │  - GitCommit.ts                                 │   │
│  │  - GitStatus.ts                                 │   │
│  │  - GitDiff.ts                                   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │        Repository Interfaces (仓储接口)         │   │
│  │  - IGitRepository.ts                            │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Domain Services (领域服务)              │   │
│  │  - GitService.ts                                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                Infrastructure Layer                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │       Repository Implementations                │   │
│  │  - SimpleGitRepository.ts                       │   │
│  │    (基于 simple-git 实现)                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 依赖注入配置

```typescript
// src/core/container/types.ts
export const TYPES = {
  // ... 现有的 types
  GitRepository: Symbol.for('GitRepository'),
  GitUseCases: Symbol.for('GitUseCases'),
};

// src/core/container/container.ts
import { IGitRepository } from '../../domain/repositories/IGitRepository';
import { SimpleGitRepository } from '../../infrastructure/repositories/SimpleGitRepository';
import { GitUseCases } from '../../application/usecases/GitUseCases';

// 绑定 Git 仓储
container.bind<IGitRepository>(TYPES.GitRepository)
  .to(SimpleGitRepository)
  .inSingletonScope();

// 绑定 Git 用例
container.bind<GitUseCases>(TYPES.GitUseCases)
  .to(GitUseCases)
  .inSingletonScope();
```

---

## 功能模块

### 功能清单

| 模块 | 功能 | 优先级 | 复杂度 | 预计工时 |
|------|------|--------|--------|----------|
| **仓库管理** | 初始化 Git 仓库 | 🔴 P0 | 低 | 2h |
| **状态查看** | 查看工作区状态 | 🔴 P0 | 低 | 2h |
| **提交功能** | 手动提交更改 | 🔴 P0 | 中 | 4h |
| **历史记录** | 查看提交历史 | 🔴 P0 | 中 | 4h |
| **版本对比** | 文件差异对比 | 🟡 P1 | 高 | 8h |
| **版本回滚** | 回滚到历史版本 | 🟡 P1 | 中 | 4h |
| **分支管理** | 创建/切换分支 | 🟢 P2 | 中 | 6h |
| **忽略文件** | .gitignore 管理 | 🟢 P2 | 低 | 2h |
| **自动提交** | 文档保存时自动提交 | 🟢 P2 | 中 | 4h |
| **远程仓库** | Push/Pull 操作 | ⚪ P3 | 高 | 12h |

**P0**: 核心功能，必须实现
**P1**: 重要功能，建议实现
**P2**: 增强功能，可选实现
**P3**: 高级功能，未来考虑

---

## 开发步骤

### 阶段 1：项目准备（Day 1）

#### 1.1 安装依赖

```bash
npm install simple-git@^3.20.0
npm install --save-dev @types/simple-git
```

#### 1.2 创建目录结构

```bash
# 领域层
mkdir -p src/domain/entities/git
mkdir -p src/domain/repositories
mkdir -p src/domain/services

# 应用层
mkdir -p src/application/dto/git
mkdir -p src/application/usecases

# 基础设施层
mkdir -p src/infrastructure/repositories/git

# 表现层
mkdir -p src/presentation/components/git
mkdir -p src/presentation/composables/git
```

---

### 阶段 2：领域层开发（Day 1-2）

#### 2.1 创建实体类

**文件**: `src/domain/entities/git/GitEntities.ts`

```typescript
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
```

#### 2.2 创建仓储接口

**文件**: `src/domain/repositories/IGitRepository.ts`

```typescript
import { GitCommit, GitStatus, GitDiff, GitBranch, GitRemote } from '../entities/git/GitEntities';

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
```

---

### 阶段 3：基础设施层开发（Day 2-3）

#### 3.1 实现 Git 仓储

**文件**: `src/infrastructure/repositories/git/SimpleGitRepository.ts`

```typescript
import simpleGit, { SimpleGit, DiffResult } from 'simple-git';
import { IGitRepository } from '../../../domain/repositories/IGitRepository';
import {
  GitCommit,
  GitStatus,
  GitDiff,
  GitBranch,
  GitRemote,
  DiffHunk,
  DiffLine,
} from '../../../domain/entities/git/GitEntities';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 基于 simple-git 的 Git 仓储实现
 */
export class SimpleGitRepository implements IGitRepository {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = path.resolve(repoPath);
    this.git = simpleGit({ baseDir: this.repoPath });
  }

  // ==================== 仓库管理 ====================

  async init(): Promise<void> {
    await this.git.init();

    // 创建默认 .gitignore
    await this.createDefaultGitIgnore();
  }

  async isRepository(): Promise<boolean> {
    try {
      const gitDir = path.join(this.repoPath, '.git');
      return fs.existsSync(gitDir);
    } catch {
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

    const allBranches = [
      ...branches.all.map(name => ({
        name,
        isCurrent: name === branches.current,
        isRemote: false,
        commit: '',
      })),
      ...branches.branches.map((b, name) => ({
        name,
        isCurrent: name === branches.current,
        isRemote: false,
        commit: b,
      })),
    ];

    // 去重
    const unique = new Map();
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
        if (currentHunk) {
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
      if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
        const type: '+' | '-' | ' ' = line[0] as '+' | '-' | ' ';
        currentHunk.lines!.push({
          type,
          content: line.substring(1),
        });
      }
    }

    if (currentHunk) {
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
    await this.git.revert(['HEAD~' + count + '..HEAD']);
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
    const gitignorePath = path.join(this.repoPath, '.gitignore');
    let content = '';

    if (fs.existsSync(gitignorePath)) {
      content = fs.readFileSync(gitignorePath, 'utf-8');
    }

    // 检查是否已存在
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    if (!lines.includes(pattern)) {
      content += `${content.endsWith('\n') ? '' : '\n'}${pattern}\n`;
      fs.writeFileSync(gitignorePath, content, 'utf-8');
    }
  }

  async removeFromGitIgnore(pattern: string): Promise<void> {
    const gitignorePath = path.join(this.repoPath, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
      return;
    }

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== pattern);

    fs.writeFileSync(gitignorePath, lines.join('\n'), 'utf-8');
  }

  async getGitIgnore(): Promise<string[]> {
    const gitignorePath = path.join(this.repoPath, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
      return [];
    }

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
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
    const gitignorePath = path.join(this.repoPath, '.gitignore');

    if (fs.existsSync(gitignorePath)) {
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

    fs.writeFileSync(gitignorePath, defaultIgnore, 'utf-8');
  }
}
```

---

### 阶段 4：应用层开发（Day 3-4）

#### 4.1 创建 DTO

**文件**: `src/application/dto/git/CommitDTO.ts`

```typescript
import { GitCommit } from '../../../domain/entities/git/GitEntities';

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
```

**文件**: `src/application/dto/git/DiffDTO.ts`

```typescript
import { GitDiff } from '../../../domain/entities/git/GitEntities';

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
```

#### 4.2 创建用例类

**文件**: `src/application/usecases/GitUseCases.ts`

```typescript
import { injectable, inject } from 'inversify';
import { IGitRepository } from '../../domain/repositories/IGitRepository';
import { GitCommit, GitStatus, GitDiff } from '../../domain/entities/git/GitEntities';
import { TYPES } from '../../core/container/types';
import {
  CommitHistoryRequest,
  CommitHistoryResponse,
  CommitRequest,
  CommitResponse,
} from '../dto/git/CommitDTO';
import { DiffRequest, DiffResponse } from '../dto/git/DiffDTO';

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
```

---

### 阶段 5：表现层开发（Day 4-6）

#### 5.1 创建 Composable

**文件**: `src/presentation/composables/git/useGit.ts`

```typescript
import { ref, computed, Ref } from 'vue';
import { container } from '../../core/container/container';
import { GitUseCases } from '../../application/usecases/GitUseCases';
import { GitCommit, GitStatus, GitDiff } from '../../domain/entities/git/GitEntities';

/**
 * Git Composable
 * 提供响应式的 Git 操作功能
 */
export function useGit(repoPath: Ref<string> | string) {
  const gitUseCases = container.get<GitUseCases>('GitUseCases');

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
      status.value.staged.length > 0
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
      status.value.deleted.length
    );
  });

  // ==================== 仓库管理 ====================

  /**
   * 检查是否为 Git 仓库
   */
  const checkRepository = async () => {
    try {
      isRepo.value = await gitUseCases.isRepository();
      return isRepo.value;
    } catch (e: any) {
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
      await gitUseCases.initializeRepository();
      isRepo.value = true;
      await refreshStatus();
      await fetchHistory();
    } catch (e: any) {
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
```

#### 5.2 创建 Git 面板组件

**文件**: `src/presentation/components/git/GitPanel.vue`

```vue
<template>
  <div class="git-panel" :class="{ 'loading': isLoading }">
    <!-- 仓库未初始化 -->
    <div v-if="!isRepo" class="init-section">
      <div class="init-icon">🔧</div>
      <h3>未初始化 Git 仓库</h3>
      <p class="init-desc">
        初始化后可以开始追踪文档版本历史
      </p>
      <button @click="initRepository" :disabled="isLoading" class="btn-primary">
        {{ isLoading ? '初始化中...' : '初始化 Git 仓库' }}
      </button>
    </div>

    <!-- Git 仓库已初始化 -->
    <template v-else>
      <!-- 顶部信息栏 -->
      <div class="panel-header">
        <div class="branch-info">
          <span class="branch-icon">🌿</span>
          <span class="branch-name">{{ currentBranch }}</span>
        </div>
        <button @click="refreshStatus" class="btn-icon" title="刷新状态">
          🔄
        </button>
      </div>

      <!-- 状态标签页 -->
      <div class="tabs">
        <button
          :class="['tab', { active: activeTab === 'status' }]"
          @click="activeTab = 'status'"
        >
          状态
          <span v-if="totalChanges > 0" class="badge">{{ totalChanges }}</span>
        </button>
        <button
          :class="['tab', { active: activeTab === 'history' }]"
          @click="activeTab = 'history'"
        >
          历史
          <span class="badge">{{ commits.length }}</span>
        </button>
      </div>

      <!-- 状态标签页内容 -->
      <div v-show="activeTab === 'status'" class="tab-content">
        <!-- 工作区干净 -->
        <div v-if="!hasChanges" class="clean-state">
          <div class="clean-icon">✨</div>
          <p>工作区是干净的</p>
          <small>没有需要提交的更改</small>
        </div>

        <!-- 有更改 -->
        <div v-else class="changes-section">
          <!-- 已修改 -->
          <div v-if="modifiedFiles.length > 0" class="file-group">
            <h4 class="group-header">
              <span class="group-icon">📝</span>
              已修改 ({{ modifiedFiles.length }})
            </h4>
            <FileList
              :files="modifiedFiles"
              :selected="selectedFiles"
              @toggle-select="toggleSelectFile"
            />
          </div>

          <!-- 已添加 -->
          <div v-if="addedFiles.length > 0" class="file-group">
            <h4 class="group-header">
              <span class="group-icon">➕</span>
              新增 ({{ addedFiles.length }})
            </h4>
            <FileList
              :files="addedFiles"
              :selected="selectedFiles"
              @toggle-select="toggleSelectFile"
            />
          </div>

          <!-- 已删除 -->
          <div v-if="deletedFiles.length > 0" class="file-group">
            <h4 class="group-header">
              <span class="group-icon">🗑️</span>
              删除 ({{ deletedFiles.length }})
            </h4>
            <FileList
              :files="deletedFiles"
              :selected="selectedFiles"
              @toggle-select="toggleSelectFile"
            />
          </div>

          <!-- 提交区域 -->
          <div class="commit-section">
            <input
              v-model="commitMessage"
              type="text"
              class="commit-input"
              placeholder="输入提交信息..."
              @keydown.enter="handleCommit"
              :disabled="isLoading"
            />
            <div class="commit-actions">
              <button
                @click="handleCommit"
                :disabled="!commitMessage.trim() || isLoading"
                class="btn-primary"
              >
                提交
              </button>
              <button
                v-if="selectedFiles.length > 0"
                @click="discardSelectedChanges"
                class="btn-danger"
              >
                丢弃选中
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 历史标签页内容 -->
      <div v-show="activeTab === 'history'" class="tab-content">
        <CommitHistory
          :commits="commits"
          :is-loading="isLoading"
          @view-diff="handleViewDiff"
          @revert="handleRevert"
          @load-more="loadMoreCommits"
        />
      </div>
    </template>

    <!-- 差异对比对话框 -->
    <DiffDialog
      v-if="showDiffDialog"
      :diff="currentDiff"
      @close="showDiffDialog = false"
    />

    <!-- 错误提示 -->
    <div v-if="error" class="error-toast">
      {{ error }}
      <button @click="error = null" class="close-btn">×</button>
    </div>

    <!-- 加载遮罩 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGit } from '../../composables/git/useGit';
import FileList from './FileList.vue';
import CommitHistory from './CommitHistory.vue';
import DiffDialog from './DiffDialog.vue';

const props = defineProps<{
  repoPath: string;
}>();

const {
  isRepo,
  status,
  commits,
  currentBranch,
  isLoading,
  error,
  hasChanges,
  modifiedFiles,
  addedFiles,
  deletedFiles,
  totalChanges,
  checkRepository,
  initRepository,
  refreshStatus,
  commit,
  loadMoreCommits,
  revertTo,
} = useGit(props.repoPath);

// UI 状态
const activeTab = ref<'status' | 'history'>('status');
const commitMessage = ref('');
const selectedFiles = ref<string[]>([]);
const showDiffDialog = ref(false);
const currentDiff = ref<any>(null);

// 初始化
onMounted(async () => {
  const repo = await checkRepository();
  if (repo) {
    await refreshStatus();
    await loadMoreCommits();
  }
});

// 处理提交
const handleCommit = async () => {
  if (!commitMessage.value.trim()) return;

  const result = await commit(
    commitMessage.value,
    selectedFiles.length > 0 ? selectedFiles : undefined
  );

  if (result.success) {
    commitMessage.value = '';
    selectedFiles = [];
  }
};

// 切换文件选择
const toggleSelectFile = (file: string) => {
  const index = selectedFiles.value.indexOf(file);
  if (index >= 0) {
    selectedFiles.value.splice(index, 1);
  } else {
    selectedFiles.value.push(file);
  }
};

// 丢弃选中的更改
const discardSelectedChanges = async () => {
  if (!confirm(`确定要丢弃 ${selectedFiles.value.length} 个文件的更改吗？`)) {
    return;
  }

  await discardChanges(selectedFiles.value);
  selectedFiles = [];
};

// 查看差异
const handleViewDiff = async (commit: any) => {
  // TODO: 实现差异对比
  console.log('View diff for:', commit);
};

// 回滚
const handleRevert = async (hash: string) => {
  if (!confirm('确定要回滚到此版本吗？当前更改将被丢弃。')) {
    return;
  }

  await revertTo(hash, 'mixed');
};
</script>

<style scoped>
.git-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  position: relative;
}

.git-panel.loading {
  pointer-events: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.branch-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.branch-icon {
  font-size: 16px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #f0f0f0;
}

.tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.tab {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab:hover {
  color: #333;
  background: #f9f9f9;
}

.tab.active {
  color: #0066cc;
  border-bottom-color: #0066cc;
}

.badge {
  background: #e0e0e0;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: normal;
}

.tab.active .badge {
  background: #0066cc;
  color: white;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.init-section {
  text-align: center;
  padding: 40px 20px;
}

.init-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.init-desc {
  color: #666;
  margin-bottom: 24px;
}

.btn-primary {
  background: #0066cc;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #0052a3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  background: #ff4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  margin-left: 8px;
}

.btn-danger:hover {
  background: #cc0000;
}

.clean-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.clean-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.file-group {
  margin-bottom: 24px;
}

.group-header {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.commit-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.commit-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 12px;
}

.commit-input:focus {
  outline: none;
  border-color: #0066cc;
}

.commit-actions {
  display: flex;
  gap: 8px;
}

.error-toast {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: #ffebee;
  color: #c62828;
  padding: 12px 16px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #c62828;
  padding: 0;
  line-height: 1;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

---

### 阶段 6：集成到主应用（Day 6-7）

#### 6.1 添加 IPC 通信

**文件**: `main.js`（添加以下内容）

```javascript
// 获取 Git 仓库路径（数据目录）
ipcMain.handle('git:get-repo-path', async () => {
  return getDataPath();
});

// 执行 Git 操作的代理（可选，如果需要在主进程执行）
ipcMain.handle('git:command', async (event, command, args) => {
  // 这里可以实现主进程的 Git 操作
  // 或者通过暴露 API 到渲染进程
});
```

#### 6.2 在主布局中集成 Git 面板

**文件**: `src/presentation/components/NewAppLayout.vue`（修改）

```vue
<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-tabs">
        <button
          :class="['tab-btn', { active: sidebarTab === 'files' }]"
          @click="sidebarTab = 'files'"
        >
          📁 文件
        </button>
        <button
          :class="['tab-btn', { active: sidebarTab === 'fragments' }]"
          @click="sidebarTab = 'fragments'"
        >
          💎 片段
        </button>
        <button
          :class="['tab-btn', { active: sidebarTab === 'git' }]"
          @click="sidebarTab = 'git'"
        >
          🔧 Git
        </button>
      </div>

      <!-- 文件浏览器 -->
      <FileExplorer v-show="sidebarTab === 'files'" />

      <!-- 知识片段 -->
      <KnowledgeFragmentSidebar v-show="sidebarTab === 'fragments'" />

      <!-- Git 面板 -->
      <GitPanel v-show="sidebarTab === 'git'" :repo-path="dataPath" />
    </div>

    <!-- 主编辑器 -->
    <div class="main-content">
      <MarkdownEditor />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import FileExplorer from './FileExplorer.vue';
import KnowledgeFragmentSidebar from './KnowledgeFragmentSidebar.vue';
import GitPanel from './git/GitPanel.vue';
import MarkdownEditor from './MarkdownEditor.vue';

const sidebarTab = ref<'files' | 'fragments' | 'git'>('files');
const dataPath = ref('');

onMounted(async () => {
  // 获取数据路径
  if (window.electronAPI) {
    dataPath.value = await window.electronAPI.file.getDataPath();
  }
});
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 300px;
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  background: #f9f9f9;
}

.tab-btn.active {
  color: #0066cc;
  border-bottom-color: #0066cc;
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>
```

---

## 测试指南

### 单元测试

**文件**: `src/infrastructure/repositories/git/__tests__/SimpleGitRepository.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimpleGitRepository } from '../SimpleGitRepository';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('SimpleGitRepository', () => {
  let testRepoPath: string;
  let repository: SimpleGitRepository;

  beforeEach(async () => {
    // 创建临时测试目录
    testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
    repository = new SimpleGitRepository(testRepoPath);
  });

  afterEach(() => {
    // 清理临时目录
    fs.rmSync(testRepoPath, { recursive: true, force: true });
  });

  describe('init', () => {
    it('should initialize a new git repository', async () => {
      await repository.init();

      const isRepo = await repository.isRepository();
      expect(isRepo).toBe(true);

      const gitDir = path.join(testRepoPath, '.git');
      expect(fs.existsSync(gitDir)).toBe(true);
    });

    it('should create .gitignore file', async () => {
      await repository.init();

      const gitignorePath = path.join(testRepoPath, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules');
    });
  });

  describe('commit', () => {
    beforeEach(async () => {
      await repository.init();

      // 创建测试文件
      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'Hello, Git!', 'utf-8');
    });

    it('should commit changes', async () => {
      const hash = await repository.commit('Initial commit');

      expect(hash).toBeTruthy();
      expect(hash.length).toBe(40); // Git hash length

      const logs = await repository.getLog();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Initial commit');
    });
  });

  describe('getStatus', () => {
    it('should return empty status for clean working directory', async () => {
      await repository.init();

      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'test', 'utf-8');
      await repository.commit('Add test file');

      const status = await repository.getStatus();
      expect(status.modified).toHaveLength(0);
      expect(status.added).toHaveLength(0);
    });

    it('should detect modified files', async () => {
      await repository.init();

      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'initial', 'utf-8');
      await repository.commit('Initial');

      fs.writeFileSync(testFile, 'modified', 'utf-8');

      const status = await repository.getStatus();
      expect(status.modified).toContain('test.txt');
    });
  });

  describe('getLog', () => {
    it('should return commit history', async () => {
      await repository.init();

      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'v1', 'utf-8');
      await repository.commit('Commit 1');

      fs.writeFileSync(testFile, 'v2', 'utf-8');
      await repository.commit('Commit 2');

      const logs = await repository.getLog();
      expect(logs.length).toBe(2);
      expect(logs[0].message).toBe('Commit 2');
      expect(logs[1].message).toBe('Commit 1');
    });
  });
});
```

### E2E 测试

**文件**: `e2e/git.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Git Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should initialize Git repository', async ({ page }) => {
    // 点击 Git 标签
    await page.click('button:has-text("Git")');

    // 点击初始化按钮
    await page.click('button:has-text("初始化 Git 仓库")');

    // 等待初始化完成
    await expect(page.locator('.branch-name')).toBeVisible();
  });

  test('should show file changes', async ({ page }) => {
    // 创建一个新文档
    await page.click('button:has-text("New File")');
    await page.fill('[contenteditable="true"]', 'Test content');
    await page.keyboard.press('Control+S');

    // 切换到 Git 标签
    await page.click('button:has-text("Git")');

    // 验证显示有更改
    await expect(page.locator('.file-group')).toBeVisible();
  });

  test('should commit changes', async ({ page }) => {
    // 准备环境
    await page.click('button:has-text("Git")');
    await page.click('button:has-text("初始化 Git 仓库")');

    // 创建文档
    await page.click('button:has-text("New File")');
    await page.fill('[contenteditable="true"]', 'New document');
    await page.keyboard.press('Control+S');

    // 切换到 Git 标签
    await page.click('button:has-text("Git")');

    // 输入提交信息
    await page.fill('.commit-input', 'Add new document');

    // 点击提交
    await page.click('button:has-text("提交")');

    // 验证提交成功
    await expect(page.locator('.clean-state')).toBeVisible();
  });
});
```

---

## 部署与发布

### 打包配置

**文件**: `package.json`（修改）

```json
{
  "build": {
    "appId": "com.mdnote.app",
    "productName": "MDNote",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "main.js",
      "preload.js",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### .gitignore 配置

确保 `.gitignore` 包含以下内容：

```
# Dependencies
node_modules/

# Build output
dist/
release/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# App specific
file-cache/
*.log

# Config (may contain sensitive data)
config.json
```

---

## 注意事项

### 1. 性能优化

- **大型仓库**：对于包含大量文件的历史记录，实现分页加载
- **Diff 计算**：大文件的 diff 计算可能耗时，考虑使用 Web Worker
- **历史记录缓存**：缓存已加载的提交历史，减少重复请求

### 2. 错误处理

- **合并冲突**：当检测到冲突时，提示用户手动解决
- **网络错误**：远程仓库操作失败时给出清晰的错误提示
- **权限问题**：检查文件系统权限，给出友好的错误信息

### 3. 安全性

- **路径注入**：验证所有文件路径，防止路径遍历攻击
- **命令注入**：使用 simple-git 而非直接执行 shell 命令
- **敏感信息**：不要将 `config.json` 等包含敏感信息的文件提交到 Git

### 4. 用户体验

- **进度提示**：长时间操作（如 clone 大型仓库）显示进度条
- **撤销操作**：提供撤销最后一次提交的选项
- **快捷键**：支持快捷键快速提交（如 Ctrl+Enter）

### 5. 兼容性

- **跨平台**：测试 Windows、macOS、Linux 三大平台
- **Git 版本**：确保 simple-git 兼容各版本的 Git
- **文件路径**：正确处理 Windows 和 Unix 风格的路径

---

## 开发检查清单

### 功能实现

- [ ] 安装 simple-git 依赖
- [ ] 创建领域实体和仓储接口
- [ ] 实现 SimpleGitRepository
- [ ] 创建 GitUseCases
- [ ] 配置依赖注入
- [ ] 实现 useGit Composable
- [ ] 创建 GitPanel 组件
- [ ] 创建 CommitHistory 组件
- [ ] 创建 FileList 组件
- [ ] 创建 DiffDialog 组件
- [ ] 集成到主布局
- [ ] 添加 IPC 通信

### 测试

- [ ] 编写单元测试
- [ ] 编写 E2E 测试
- [ ] 测试初始化仓库
- [ ] 测试提交功能
- [ ] 测试历史记录
- [ ] 测试版本对比
- [ ] 测试回滚功能
- [ ] 测试分支管理
- [ ] 测试错误处理

### 文档

- [ ] API 文档
- [ ] 用户使用指南
- [ ] 开发者文档
- [ ] 更新 CHANGELOG

### 发布

- [ ] 更新版本号
- [ ] 构建 Electron 应用
- [ ] 测试安装包
- [ ] 发布到 GitHub Releases
- [ ] 更新用户文档

---

## 常见问题

### Q1: 如何处理 Git 冲突？

**A**:
1. 检测到冲突时，在 UI 中标记冲突文件
2. 提供冲突解决界面，显示两个版本的内容
3. 用户选择保留哪个版本或手动合并
4. 标记冲突已解决后重新提交

### Q2: 如何优化大仓库的性能？

**A**:
1. 实现懒加载，初始只加载最近 50 条提交
2. 使用虚拟滚动渲染长列表
3. 对 diff 操作使用 Web Worker
4. 缓存常用操作的结果

### Q3: 是否支持远程仓库？

**A**:
当前方案支持远程仓库的基础操作（fetch/pull/push），但建议：
1. 第一版先实现本地版本控制
2. 后续迭代添加远程仓库功能
3. 提供配置界面管理远程仓库

### Q4: 如何处理中文文件名？

**A**:
simple-git 默认支持 Unicode，确保：
1. 文件系统使用 UTF-8 编码
2. Git 配置 `core.quotepath=false`
3. 路径正确编码/解码

---

## 后续优化方向

### 短期（1-2 周）

1. 完善错误处理和用户提示
2. 添加快捷键支持
3. 优化 UI/UX
4. 编写完整的测试覆盖

### 中期（1-2 月）

1. 实现分支管理 UI
2. 添加可视化提交图表
3. 支持远程仓库操作
4. 实现冲突解决界面

### 长期（3+ 月）

1. 支持子模块
2. 实现 Git LFS（大文件存储）
3. 添加协作功能
4. 集成 GitHub/GitLab API

---

## 参考资料

- [simple-git 官方文档](https://github.com/stevelkrenn/simple-git)
- [Git 官方文档](https://git-scm.com/doc)
- [Electron 安全最佳实践](https://www.electronjs.org/docs/latest/tutorial/security)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

---

**文档版本**: 1.0
**创建日期**: 2024-12-26
**最后更新**: 2024-12-26
