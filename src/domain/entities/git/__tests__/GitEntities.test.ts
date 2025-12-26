import { describe, it, expect } from 'vitest';
import type {
  GitCommit,
  GitStatus,
  GitDiff,
  DiffHunk,
  DiffLine,
  GitBranch,
  GitRemote
} from '../GitEntities';

describe('Git Entities', () => {
  describe('GitCommit', () => {
    it('should create a valid GitCommit object', () => {
      const commit: GitCommit = {
        hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
        shortHash: 'a1b2c3d',
        author: 'John Doe',
        message: 'Initial commit',
        date: new Date('2024-01-01T00:00:00Z'),
        files: ['file1.txt', 'file2.md']
      };

      expect(commit.hash).toBe('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0');
      expect(commit.shortHash).toBe('a1b2c3d');
      expect(commit.author).toBe('John Doe');
      expect(commit.message).toBe('Initial commit');
      expect(commit.date).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(commit.files).toHaveLength(2);
      expect(commit.files).toContain('file1.txt');
    });

    it('should accept empty files array', () => {
      const commit: GitCommit = {
        hash: 'abcdef1234567890',
        shortHash: 'abcdef1',
        author: 'Jane Doe',
        message: 'Empty commit',
        date: new Date(),
        files: []
      };

      expect(commit.files).toEqual([]);
      expect(commit.files.length).toBe(0);
    });
  });

  describe('GitStatus', () => {
    it('should create a valid GitStatus object', () => {
      const status: GitStatus = {
        modified: ['file1.txt', 'file2.md'],
        added: ['newfile.txt'],
        deleted: ['oldfile.txt'],
        untracked: ['untracked.txt'],
        conflicts: [],
        staged: ['file1.txt']
      };

      expect(status.modified).toHaveLength(2);
      expect(status.modified).toContain('file1.txt');
      expect(status.added).toContain('newfile.txt');
      expect(status.deleted).toContain('oldfile.txt');
      expect(status.untracked).toContain('untracked.txt');
      expect(status.conflicts).toEqual([]);
      expect(status.staged).toContain('file1.txt');
    });

    it('should accept empty arrays for all properties', () => {
      const status: GitStatus = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        conflicts: [],
        staged: []
      };

      expect(status.modified).toEqual([]);
      expect(status.added).toEqual([]);
      expect(status.deleted).toEqual([]);
      expect(status.untracked).toEqual([]);
      expect(status.conflicts).toEqual([]);
      expect(status.staged).toEqual([]);
    });

    it('should represent a clean working directory', () => {
      const cleanStatus: GitStatus = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        conflicts: [],
        staged: []
      };

      const hasChanges =
        cleanStatus.modified.length > 0 ||
        cleanStatus.added.length > 0 ||
        cleanStatus.deleted.length > 0 ||
        cleanStatus.staged.length > 0;

      expect(hasChanges).toBe(false);
    });
  });

  describe('GitDiff', () => {
    it('should create a valid GitDiff object', () => {
      const hunk: DiffHunk = {
        oldStart: 1,
        oldLines: 3,
        newStart: 1,
        newLines: 4,
        lines: [
          { type: ' ', content: 'line 1' },
          { type: '-', content: 'line 2' },
          { type: '+', content: 'line 2 modified' }
        ]
      };

      const diff: GitDiff = {
        file: 'example.txt',
        oldContent: 'line 1\nline 2\nline 3',
        newContent: 'line 1\nline 2 modified\nline 3\nline 4',
        hunks: [hunk]
      };

      expect(diff.file).toBe('example.txt');
      expect(diff.oldContent).toContain('line 2');
      expect(diff.newContent).toContain('line 2 modified');
      expect(diff.hunks).toHaveLength(1);
      expect(diff.hunks[0].oldStart).toBe(1);
    });

    it('should handle diff without content', () => {
      const diff: GitDiff = {
        file: 'test.md',
        hunks: []
      };

      expect(diff.file).toBe('test.md');
      expect(diff.hunks).toEqual([]);
      expect(diff.oldContent).toBeUndefined();
      expect(diff.newContent).toBeUndefined();
    });
  });

  describe('DiffHunk', () => {
    it('should create a valid DiffHunk object', () => {
      const hunk: DiffHunk = {
        oldStart: 10,
        oldLines: 5,
        newStart: 10,
        newLines: 7,
        lines: [
          { type: '-', content: 'old line 1' },
          { type: '-', content: 'old line 2' },
          { type: '+', content: 'new line 1' },
          { type: '+', content: 'new line 2' },
          { type: '+', content: 'new line 3' }
        ]
      };

      expect(hunk.oldStart).toBe(10);
      expect(hunk.oldLines).toBe(5);
      expect(hunk.newStart).toBe(10);
      expect(hunk.newLines).toBe(7);
      expect(hunk.lines).toHaveLength(5);
    });

    it('should calculate line changes correctly', () => {
      const hunk: DiffHunk = {
        oldStart: 1,
        oldLines: 2,
        newStart: 1,
        newLines: 2,
        lines: [
          { type: '-', content: 'removed' },
          { type: '+', content: 'added' }
        ]
      };

      const removedCount = hunk.lines.filter(l => l.type === '-').length;
      const addedCount = hunk.lines.filter(l => l.type === '+').length;

      expect(removedCount).toBe(1);
      expect(addedCount).toBe(1);
    });
  });

  describe('DiffLine', () => {
    it('should create a valid DiffLine object for each type', () => {
      const addedLine: DiffLine = { type: '+', content: 'new content' };
      const removedLine: DiffLine = { type: '-', content: 'old content' };
      const unchangedLine: DiffLine = { type: ' ', content: 'same content' };

      expect(addedLine.type).toBe('+');
      expect(removedLine.type).toBe('-');
      expect(unchangedLine.type).toBe(' ');

      expect(addedLine.content).toBe('new content');
      expect(removedLine.content).toBe('old content');
      expect(unchangedLine.content).toBe('same content');
    });

    it('should support optional line number', () => {
      const lineWithNumber: DiffLine = {
        type: '+',
        lineNumber: 42,
        content: 'line content'
      };

      const lineWithoutNumber: DiffLine = {
        type: '-',
        content: 'removed line'
      };

      expect(lineWithNumber.lineNumber).toBe(42);
      expect(lineWithoutNumber.lineNumber).toBeUndefined();
    });
  });

  describe('GitBranch', () => {
    it('should create a valid GitBranch object', () => {
      const branch: GitBranch = {
        name: 'main',
        isCurrent: true,
        isRemote: false,
        commit: 'a1b2c3d4e5f6g7h8i9j0'
      };

      expect(branch.name).toBe('main');
      expect(branch.isCurrent).toBe(true);
      expect(branch.isRemote).toBe(false);
      expect(branch.commit).toBe('a1b2c3d4e5f6g7h8i9j0');
    });

    it('should represent a remote branch', () => {
      const remoteBranch: GitBranch = {
        name: 'origin/main',
        isCurrent: false,
        isRemote: true,
        commit: 'z9y8x7w6v5u4t3s2r1q0'
      };

      expect(remoteBranch.isRemote).toBe(true);
      expect(remoteBranch.name).toContain('origin/');
      expect(remoteBranch.isCurrent).toBe(false);
    });

    it('should distinguish between current and other branches', () => {
      const currentBranch: GitBranch = {
        name: 'develop',
        isCurrent: true,
        isRemote: false,
        commit: 'commit1'
      };

      const otherBranch: GitBranch = {
        name: 'feature/test',
        isCurrent: false,
        isRemote: false,
        commit: 'commit2'
      };

      expect(currentBranch.isCurrent).toBe(true);
      expect(otherBranch.isCurrent).toBe(false);
    });
  });

  describe('GitRemote', () => {
    it('should create a valid GitRemote object', () => {
      const remote: GitRemote = {
        name: 'origin',
        url: 'https://github.com/user/repo.git'
      };

      expect(remote.name).toBe('origin');
      expect(remote.url).toBe('https://github.com/user/repo.git');
    });

    it('should support different remote URL formats', () => {
      const httpsRemote: GitRemote = {
        name: 'origin',
        url: 'https://github.com/user/repo.git'
      };

      const sshRemote: GitRemote = {
        name: 'upstream',
        url: 'git@github.com:user/repo.git'
      };

      expect(httpsRemote.url).toMatch(/^https:/);
      expect(sshRemote.url).toMatch(/^git@/);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow array operations on GitStatus', () => {
      const status: GitStatus = {
        modified: ['a.txt', 'b.md'],
        added: ['c.txt'],
        deleted: [],
        untracked: [],
        conflicts: [],
        staged: []
      };

      // Test array methods work correctly
      expect(status.modified.map(f => f.toUpperCase())).toEqual(['A.TXT', 'B.MD']);
      expect(status.modified.filter(f => f.endsWith('.txt'))).toEqual(['a.txt']);
      expect(status.modified.includes('a.txt')).toBe(true);
    });

    it('should allow sorting and filtering commits', () => {
      const commits: GitCommit[] = [
        {
          hash: 'commit2',
          shortHash: 'commit2',
          author: 'Alice',
          message: 'Second',
          date: new Date('2024-01-02'),
          files: []
        },
        {
          hash: 'commit1',
          shortHash: 'commit1',
          author: 'Bob',
          message: 'First',
          date: new Date('2024-01-01'),
          files: []
        }
      ];

      const sortedByDate = [...commits].sort((a, b) => a.date.getTime() - b.date.getTime());

      expect(sortedByDate[0].message).toBe('First');
      expect(sortedByDate[1].message).toBe('Second');
    });
  });
});
