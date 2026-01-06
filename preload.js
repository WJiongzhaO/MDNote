// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 发送异步消息并等待回复
  ping: () => ipcRenderer.invoke('ping'),

  // 监听主进程消息（示例）
  onMessage: (callback) => {
    const handler = (_, message) => callback(message);
    ipcRenderer.on('main-process-message', handler);
    return () => ipcRenderer.removeListener('main-process-message', handler);
  },

  // 打开外部链接（安全方式）
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  },

  // 文件操作 API
  file: {
    read: (filename) => ipcRenderer.invoke('file:read', filename),
    write: (filename, data) => ipcRenderer.invoke('file:write', filename, data),
    delete: (filename) => ipcRenderer.invoke('file:delete', filename),
    exists: (filename) => ipcRenderer.invoke('file:exists', filename),
    list: (pattern) => ipcRenderer.invoke('file:list', pattern),
    copy: (sourcePath, destPath) => ipcRenderer.invoke('file:copy', sourcePath, destPath),
    mkdir: (dirPath) => ipcRenderer.invoke('file:mkdir', dirPath),
    writeBinary: (filePath, buffer) => ipcRenderer.invoke('file:write-binary', filePath, buffer),
    readBinary: (filePath) => ipcRenderer.invoke('file:read-binary', filePath),
    existsPath: (filePath) => ipcRenderer.invoke('file:exists-path', filePath),
    getStats: (filePath) => ipcRenderer.invoke('file:get-stats', filePath),
    getFullPath: (relativePath) => ipcRenderer.invoke('file:get-full-path', relativePath),
    getDataPath: () => ipcRenderer.invoke('file:get-data-path'),
    getCustomDataPath: () => ipcRenderer.invoke('file:get-custom-data-path'),
    setCustomDataPath: (customPath) => ipcRenderer.invoke('file:set-custom-data-path', customPath),
    resetDataPath: () => ipcRenderer.invoke('file:reset-data-path'),
    readDirectory: (dirPath) => ipcRenderer.invoke('file:read-directory', dirPath),
    readFileContent: (filePath) => ipcRenderer.invoke('file:read-file-content', filePath),
    writeFileContent: (filePath, content) => ipcRenderer.invoke('file:write-file-content', filePath, content),
    deleteNode: (nodePath) => ipcRenderer.invoke('file:delete-node', nodePath),
    saveLastOpenedFolder: (folderPath) => ipcRenderer.invoke('file:save-last-opened-folder', folderPath),
    getLastOpenedFolder: () => ipcRenderer.invoke('file:get-last-opened-folder'),
    saveFileCache: (filePath, cacheData) => ipcRenderer.invoke('file:save-file-cache', filePath, cacheData),
    getFileCache: (filePath) => ipcRenderer.invoke('file:get-file-cache', filePath),
    deleteFileCache: (filePath) => ipcRenderer.invoke('file:delete-file-cache', filePath)
  },
  // Git 操作 API
  git: {
    init: () => ipcRenderer.invoke('git:init'),
    isRepository: () => ipcRenderer.invoke('git:isRepository'),
    getStatus: () => ipcRenderer.invoke('git:getStatus'),
    getCurrentBranch: () => ipcRenderer.invoke('git:getCurrentBranch'),
    getBranches: () => ipcRenderer.invoke('git:getBranches'),
    commit: (message, files) => ipcRenderer.invoke('git:commit', message, files),
    add: (files) => ipcRenderer.invoke('git:add', files),
    addAll: () => ipcRenderer.invoke('git:addAll'),
    getLog: (limit, skip) => ipcRenderer.invoke('git:getLog', limit, skip),
    getCommit: (hash) => ipcRenderer.invoke('git:getCommit', hash),
    getFileHistory: (filePath, limit) => ipcRenderer.invoke('git:getFileHistory', filePath, limit),
    getDiff: (file) => ipcRenderer.invoke('git:getDiff', file),
    getDiffBetweenCommits: (fromHash, toHash, file) => ipcRenderer.invoke('git:getDiffBetweenCommits', fromHash, toHash, file),
    getStagedDiff: (file) => ipcRenderer.invoke('git:getStagedDiff', file),
    checkoutCommit: (hash, createBranch) => ipcRenderer.invoke('git:checkoutCommit', hash, createBranch),
    reset: (hash, mode) => ipcRenderer.invoke('git:reset', hash, mode),
    checkoutFiles: (files) => ipcRenderer.invoke('git:checkoutFiles', files),
    revert: (count) => ipcRenderer.invoke('git:revert', count),
    createBranch: (name) => ipcRenderer.invoke('git:createBranch', name),
    checkoutBranch: (name) => ipcRenderer.invoke('git:checkoutBranch', name),
    deleteBranch: (name, force) => ipcRenderer.invoke('git:deleteBranch', name, force),
    renameBranch: (oldName, newName) => ipcRenderer.invoke('git:renameBranch', oldName, newName),
    addToGitIgnore: (pattern) => ipcRenderer.invoke('git:addToGitIgnore', pattern),
    removeFromGitIgnore: (pattern) => ipcRenderer.invoke('git:removeFromGitIgnore', pattern),
    getGitIgnore: () => ipcRenderer.invoke('git:getGitIgnore'),
    addRemote: (name, url) => ipcRenderer.invoke('git:addRemote', name, url),
    getRemotes: () => ipcRenderer.invoke('git:getRemotes'),
    push: (remote, branch) => ipcRenderer.invoke('git:push', remote, branch),
    pull: (remote, branch) => ipcRenderer.invoke('git:pull', remote, branch),
    fetch: (remote) => ipcRenderer.invoke('git:fetch', remote)
  },
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
    openFile: () => ipcRenderer.invoke('dialog:open-file'),
    saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options)
  },
  export: {
    pdf: (options) => ipcRenderer.invoke('export:pdf', options)
  },
  menu: {
    onNewFile: (callback) => ipcRenderer.on('menu:new-file', callback),
    onNewFolder: (callback) => ipcRenderer.on('menu:new-folder', callback),
    onOpenFile: (callback) => ipcRenderer.on('menu:open-file', callback),
    onOpenFolder: (callback) => ipcRenderer.on('menu:open-folder', callback),
    onSave: (callback) => ipcRenderer.on('menu:save', callback)
  },
  // 监听主进程消息
  on: (channel, callback) => {
    const handler = (_, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
});

// 安全限制：禁止直接暴露 ipcRenderer
// window.ipcRenderer = null;