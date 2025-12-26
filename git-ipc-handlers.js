// git-ipc-handlers.js
const simpleGit = require('simple-git');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Git IPC 处理器
 * 在主进程中处理所有 Git 操作
 */

// 存储动态 dataPath getter
let dataPathGetter = null;

// 获取当前的 dataPath
function getCurrentDataPath() {
  if (dataPathGetter) {
    return dataPathGetter();
  }
  throw new Error('dataPathGetter not initialized');
}

// 获取 Git 仓库实例
function getGitInstance(repoPath) {
  return simpleGit({
    baseDir: repoPath,
  });
}

/**
 * 注册所有 Git IPC 处理器
 * @param {Object} ipcMain - Electron ipcMain
 * @param {Function} getDataPath - 动态获取 dataPath 的函数
 */
function registerGitIpcHandlers(ipcMain, getDataPath) {
  // 保存 dataPath getter，这样每次调用都能获取最新的路径
  dataPathGetter = getDataPath;
  // ==================== 仓库管理 ====================

  ipcMain.handle('git:init', async () => {
    try {
      const currentDataPath = getCurrentDataPath();
      console.log('[Git IPC] git:init called, dataPath:', currentDataPath);
      const git = getGitInstance(currentDataPath);
      await git.init();

      // 创建默认 .gitignore
      await createDefaultGitIgnore(currentDataPath);

      console.log('[Git IPC] git:init success, .git created at:', path.join(currentDataPath, '.git'));
      return { success: true };
    } catch (error) {
      console.error('[Git IPC] git:init error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:isRepository', async () => {
    try {
      const currentDataPath = getCurrentDataPath();
      console.log('[Git IPC] git:isRepository called, dataPath:', currentDataPath);
      const gitDir = path.join(currentDataPath, '.git');
      const exists = fs.existsSync(gitDir);
      console.log('[Git IPC] git:isRepository result:', exists, 'gitDir:', gitDir);
      return exists;
    } catch (error) {
      console.error('[Git IPC] git:isRepository error:', error);
      return false;
    }
  });

  // ==================== 状态查询 ====================

  ipcMain.handle('git:getStatus', async () => {
    try {
      const currentDataPath = getCurrentDataPath();
      console.log('[Git IPC] git:getStatus called, dataPath:', currentDataPath);
      const git = getGitInstance(currentDataPath);
      const status = await git.status();

      // 打印完整的 status 对象以便调试
      console.log('[Git IPC] Raw status object:', JSON.stringify(status, null, 2));

      // 添加防御性检查，确保所有属性都是数组
      const modified = Array.isArray(status.modified) ? status.modified : [];
      const added = Array.isArray(status.created) ? status.created : [];
      const deleted = Array.isArray(status.deleted) ? status.deleted : [];
      const untracked = Array.isArray(status.not_added) ? status.not_added : [];
      const conflicts = Array.isArray(status.conflicts) ? status.conflicts : [];
      const staged = Array.isArray(status.staged) ? status.staged : [];

      console.log('[Git IPC] git:getStatus result:', {
        modified: modified.length,
        added: added.length,
        deleted: deleted.length,
        untracked: untracked.length,
        conflicts: conflicts.length,
        staged: staged.length,
      });

      return {
        modified,
        added,
        deleted,
        untracked,
        conflicts,
        staged,
      };
    } catch (error) {
      console.error('[Git IPC] git:getStatus error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:getCurrentBranch', async () => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      const branches = await git.branch();
      return branches.current || 'HEAD';
    } catch (error) {
      console.error('[Git] GetCurrentBranch error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:getBranches', async () => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      const branches = await git.branch();

      return branches.all.map(name => ({
        name: name || '',
        isCurrent: name === branches.current,
        isRemote: false,
        commit: '',
      }));
    } catch (error) {
      console.error('[Git] GetBranches error:', error);
      throw error;
    }
  });

  // ==================== 提交操作 ====================

  ipcMain.handle('git:commit', async (event, message, files) => {
    try {
      const git = getGitInstance(getCurrentDataPath());

      if (files && files.length > 0) {
        await git.add(files);
      } else {
        await git.add('.');
      }

      const result = await git.commit(message);
      // 确保只返回可序列化的commit hash字符串
      return result.commit || '';
    } catch (error) {
      console.error('[Git] Commit error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:add', async (event, files) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.add(files);
    } catch (error) {
      console.error('[Git] Add error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:addAll', async () => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.add('.');
    } catch (error) {
      console.error('[Git] AddAll error:', error);
      throw error;
    }
  });

  // ==================== 历史记录 ====================

  ipcMain.handle('git:getLog', async (event, limit = 50, skip = 0) => {
    try {
      const git = getGitInstance(getCurrentDataPath());

      // 检查是否有任何提交
      try {
        await git.raw(['rev-parse', 'HEAD']);
      } catch (e) {
        // 没有 HEAD 引用,说明还没有任何提交
        console.log('[Git] No commits yet, returning empty log');
        return [];
      }

      const log = await git.log({
        maxCount: limit,
        from: skip > 0 ? `HEAD~${skip}` : undefined,
      });

      return log.all.map(commit => ({
        hash: commit.hash || '',
        shortHash: commit.hash ? commit.hash.substring(0, 7) : '',
        author: commit.author_name || '',
        message: commit.message || '',
        date: commit.date ? new Date(commit.date) : new Date(),
        files: Array.isArray(commit.files) ? commit.files : [],
      }));
    } catch (error) {
      console.error('[Git] GetLog error:', error);
      // 如果是因为没有提交而导致的错误,返回空数组
      if (error.message && error.message.includes('does not have any commits yet')) {
        console.log('[Git] No commits yet, returning empty log');
        return [];
      }
      throw error;
    }
  });

  ipcMain.handle('git:getCommit', async (event, hash) => {
    try {
      const git = getGitInstance(getCurrentDataPath());

      // 检查是否有任何提交
      try {
        await git.raw(['rev-parse', 'HEAD']);
      } catch (e) {
        // 没有 HEAD 引用,说明还没有任何提交
        throw new Error('No commits yet');
      }

      const log = await git.log({ from: hash, maxCount: 1 });
      const commit = log.all[0];

      return {
        hash: commit.hash || '',
        shortHash: commit.hash ? commit.hash.substring(0, 7) : '',
        author: commit.author_name || '',
        message: commit.message || '',
        date: commit.date ? new Date(commit.date) : new Date(),
        files: Array.isArray(commit.files) ? commit.files : [],
      };
    } catch (error) {
      console.error('[Git] GetCommit error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:getFileHistory', async (event, filePath, limit = 50) => {
    try {
      const git = getGitInstance(getCurrentDataPath());

      // 检查是否有任何提交
      try {
        await git.raw(['rev-parse', 'HEAD']);
      } catch (e) {
        // 没有 HEAD 引用,说明还没有任何提交
        console.log('[Git] No commits yet, returning empty file history');
        return [];
      }

      const log = await git.log({ file: filePath, maxCount: limit });

      return log.all.map(commit => ({
        hash: commit.hash || '',
        shortHash: commit.hash ? commit.hash.substring(0, 7) : '',
        author: commit.author_name || '',
        message: commit.message || '',
        date: commit.date ? new Date(commit.date) : new Date(),
        files: Array.isArray(commit.files) ? commit.files : [],
      }));
    } catch (error) {
      console.error('[Git] GetFileHistory error:', error);
      // 如果是因为没有提交而导致的错误,返回空数组
      if (error.message && error.message.includes('does not have any commits yet')) {
        console.log('[Git] No commits yet, returning empty file history');
        return [];
      }
      throw error;
    }
  });

  // ==================== 差异对比 ====================

  ipcMain.handle('git:getDiff', async (event, file) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      const diffText = await git.diff([file || 'HEAD']);
      return parseDiff(diffText, file || '');
    } catch (error) {
      console.error('[Git] GetDiff error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:getDiffBetweenCommits', async (event, fromHash, toHash, file) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      const args = [fromHash, toHash];
      if (file) args.push(file);

      let diffText;
      try {
        diffText = await git.diff(args);
      } catch (diffError) {
        // 如果对比失败，检查是否是因为第一次提交（没有父提交）
        // 第一次提交使用空树作为对比基准
        if (fromHash.endsWith('^') || fromHash === `${toHash}^`) {
          console.log('[Git] First commit detected, using empty tree as baseline');
          // Git 的空树 hash
          const emptyTreeHash = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
          const emptyArgs = [emptyTreeHash, toHash];
          if (file) emptyArgs.push(file);
          diffText = await git.diff(emptyArgs);
        } else {
          throw diffError;
        }
      }

      return parseDiff(diffText, file || '');
    } catch (error) {
      console.error('[Git] GetDiffBetweenCommits error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:getStagedDiff', async (event, file) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      const args = ['--staged'];
      if (file) args.push(file);

      const diffText = await git.diff(args);
      return parseDiff(diffText, file || '');
    } catch (error) {
      console.error('[Git] GetStagedDiff error:', error);
      throw error;
    }
  });

  // ==================== 回滚操作 ====================

  ipcMain.handle('git:checkoutCommit', async (event, hash, createBranch) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      if (createBranch) {
        await git.checkout(['-b', hash]);
      } else {
        await git.checkout(hash);
      }
    } catch (error) {
      console.error('[Git] CheckoutCommit error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:reset', async (event, hash, mode = 'mixed') => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.reset(mode, hash);
    } catch (error) {
      console.error('[Git] Reset error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:checkoutFiles', async (event, files) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.checkout(files);
    } catch (error) {
      console.error('[Git] CheckoutFiles error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:revert', async (event, count = 1) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.revert(['HEAD~' + count + '..HEAD']);
    } catch (error) {
      console.error('[Git] Revert error:', error);
      throw error;
    }
  });

  // ==================== 分支管理 ====================

  ipcMain.handle('git:createBranch', async (event, name) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.checkoutLocalBranch(name);
    } catch (error) {
      console.error('[Git] CreateBranch error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:checkoutBranch', async (event, name) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.checkout(name);
    } catch (error) {
      console.error('[Git] CheckoutBranch error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:deleteBranch', async (event, name, force) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.deleteLocalBranch(name, force);
    } catch (error) {
      console.error('[Git] DeleteBranch error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:renameBranch', async (event, oldName, newName) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.branch(['-m', oldName, newName]);
    } catch (error) {
      console.error('[Git] RenameBranch error:', error);
      throw error;
    }
  });

  // ==================== 忽略文件 ====================

  ipcMain.handle('git:addToGitIgnore', async (event, pattern) => {
    try {
      const gitignorePath = path.join(getCurrentDataPath(), '.gitignore');
      let content = '';

      if (fs.existsSync(gitignorePath)) {
        content = fs.readFileSync(gitignorePath, 'utf8');
      }

      // 检查是否已存在
      const lines = content.split('\n').map(l => l.trim()).filter(l => l);
      if (!lines.includes(pattern)) {
        content += `${content.endsWith('\n') ? '' : '\n'}${pattern}\n`;
        fs.writeFileSync(gitignorePath, content, 'utf8');
      }
    } catch (error) {
      console.error('[Git] AddToGitIgnore error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:removeFromGitIgnore', async (event, pattern) => {
    try {
      const gitignorePath = path.join(getCurrentDataPath(), '.gitignore');

      if (!fs.existsSync(gitignorePath)) {
        return;
      }

      const content = fs.readFileSync(gitignorePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== pattern);

      fs.writeFileSync(gitignorePath, lines.join('\n'), 'utf8');
    } catch (error) {
      console.error('[Git] RemoveFromGitIgnore error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:getGitIgnore', async () => {
    try {
      const gitignorePath = path.join(getCurrentDataPath(), '.gitignore');

      if (!fs.existsSync(gitignorePath)) {
        return [];
      }

      const content = fs.readFileSync(gitignorePath, 'utf8');
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch (error) {
      console.error('[Git] GetGitIgnore error:', error);
      throw error;
    }
  });

  // ==================== 远程仓库 ====================

  ipcMain.handle('git:addRemote', async (event, name, url) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.addRemote(name, url);
    } catch (error) {
      console.error('[Git] AddRemote error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:getRemotes', async () => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      const remotes = await git.getRemotes(true);
      return remotes.map(r => ({
        name: r.name || '',
        url: r.refs && r.refs.fetch ? r.refs.fetch : '',
      }));
    } catch (error) {
      console.error('[Git] GetRemotes error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:push', async (event, remote = 'origin', branch) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      const args = [remote];
      if (branch) args.push(branch);
      await git.push(args);
    } catch (error) {
      console.error('[Git] Push error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:pull', async (event, remote = 'origin', branch) => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      const args = [remote];
      if (branch) args.push(branch);
      await git.pull(args);
    } catch (error) {
      console.error('[Git] Pull error:', error);
      throw error;
    }
  });

  ipcMain.handle('git:fetch', async (event, remote = 'origin') => {
    try {
      const git = getGitInstance(getCurrentDataPath());
      await git.fetch(remote);
    } catch (error) {
      console.error('[Git] Fetch error:', error);
      throw error;
    }
  });
}

/**
 * 解析 git diff 输出
 */
function parseDiff(diffText, file) {
  const lines = diffText.split('\n');
  const hunks = [];
  let currentHunk = null;

  for (const line of lines) {
    // 解析 hunk 头：@@ -oldStart,oldLines +newStart,newLines @@
    const hunkMatch = line.match(/^@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
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
      const type = line[0];
      currentHunk.lines.push({
        type,
        content: line.substring(1),
      });
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return {
    file,
    hunks,
  };
}

/**
 * 创建默认 .gitignore 文件
 */
async function createDefaultGitIgnore(repoPath) {
  const gitignorePath = path.join(repoPath, '.gitignore');

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

  fs.writeFileSync(gitignorePath, defaultIgnore, 'utf8');
}

module.exports = { registerGitIpcHandlers };
