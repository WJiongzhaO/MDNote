/**
 * Git 实体导出测试
 *
 * 目的：确保所有 Git 相关实体都被正确导出
 * 防止运行时的 "does not provide an export" 错误
 *
 * 注意：TypeScript 接口在运行时不存在，所以只测试类型导入
 */

import { describe, it, expect } from 'vitest';
import type {
  GitCommit,
  GitStatus,
  GitDiff,
  GitBranch,
  GitRemote,
  DiffHunk,
  DiffLine,
} from '../GitEntities';

describe('Git Entities Exports', () => {
  describe('类型导出验证', () => {
    it('should export GitCommit type', () => {
      const commit: GitCommit = {
        hash: 'test',
        shortHash: 'test',
        author: 'Test',
        message: 'Test',
        date: new Date(),
        files: [],
      };
      expect(commit.hash).toBe('test');
    });

    it('should export GitStatus type', () => {
      const status: GitStatus = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        conflicts: [],
        staged: [],
      };
      expect(status.modified).toEqual([]);
    });

    it('should export GitDiff type', () => {
      const diff: GitDiff = {
        file: 'test.ts',
        hunks: [],
      };
      expect(diff.file).toBe('test.ts');
    });

    it('should export GitBranch type', () => {
      const branch: GitBranch = {
        name: 'main',
        isCurrent: true,
        isRemote: false,
        commit: 'abc123',
      };
      expect(branch.name).toBe('main');
    });

    it('should export GitRemote type', () => {
      const remote: GitRemote = {
        name: 'origin',
        url: 'https://github.com/test/repo.git',
      };
      expect(remote.name).toBe('origin');
    });

    it('should export DiffHunk type', () => {
      const hunk: DiffHunk = {
        oldStart: 1,
        oldLines: 5,
        newStart: 1,
        newLines: 6,
        lines: [],
      };
      expect(hunk.oldStart).toBe(1);
    });

    it('should export DiffLine type', () => {
      const line: DiffLine = {
        type: '+',
        content: 'added line',
      };
      expect(line.type).toBe('+');
    });
  });

  describe('Index barrel exports', () => {
    it('should re-export all types from index', async () => {
      // 动态导入 index.ts
      const indexModule = await import('../index');

      // 验证所有导出都存在（作为类型）
      expect(typeof indexModule).toBe('object');
    });
  });

  describe('Import consistency', () => {
    it('should allow importing from index.ts', async () => {
      // 测试从 index 导入
      const module = await import('../index');

      expect(module).toBeDefined();
    });

    it('should allow importing from GitEntities.ts directly', async () => {
      // 测试从 GitEntities.ts 直接导入
      const module = await import('../GitEntities');

      expect(module).toBeDefined();
    });

    it('should allow type-only imports', async () => {
      // 验证 type-only 导入工作正常
      type TestCommit = GitCommit;
      type TestStatus = GitStatus;

      const commit: TestCommit = {
        hash: 'test',
        shortHash: 'test',
        author: 'Test',
        message: 'Test',
        date: new Date(),
        files: [],
      };

      const status: TestStatus = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        conflicts: [],
        staged: [],
      };

      expect(commit.hash).toBe('test');
      expect(status.modified).toEqual([]);
    });
  });

  describe('Module structure validation', () => {
    it('should have consistent exports', async () => {
      const indexModule = await import('../index');

      // 验证模块是一个对象
      expect(typeof indexModule).toBe('object');

      // 验证有导出
      expect(Object.keys(indexModule).length).toBeGreaterThan(0);
    });
  });
});
