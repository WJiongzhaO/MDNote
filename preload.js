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
    renameNode: (oldPath, newName) => ipcRenderer.invoke('file:rename-node', oldPath, newName),
    saveLastOpenedFolder: (folderPath) => ipcRenderer.invoke('file:save-last-opened-folder', folderPath),
    getLastOpenedFolder: () => ipcRenderer.invoke('file:get-last-opened-folder'),
    saveFileCache: (filePath, cacheData) => ipcRenderer.invoke('file:save-file-cache', filePath, cacheData),
    getFileCache: (filePath) => ipcRenderer.invoke('file:get-file-cache', filePath),
    deleteFileCache: (filePath) => ipcRenderer.invoke('file:delete-file-cache', filePath),
    createDirectory: (dirPath) => ipcRenderer.invoke('vault:create-directory', dirPath),
    deleteDirectory: (dirPath) => ipcRenderer.invoke('vault:delete-directory', dirPath),
    directoryExists: (dirPath) => ipcRenderer.invoke('vault:directory-exists', dirPath)
  },
  // 知识片段库 API（使用全局路径，不随项目切换）
  fragment: {
    read: (filename) => ipcRenderer.invoke('fragment:read', filename),
    write: (filename, data) => ipcRenderer.invoke('fragment:write', filename, data),
    mkdir: (dirPath) => ipcRenderer.invoke('fragment:mkdir', dirPath),
    getGlobalPath: () => ipcRenderer.invoke('fragment:get-global-path'),
    getCustomGlobalPath: () => ipcRenderer.invoke('fragment:get-custom-global-path'),
    setGlobalPath: (customPath) => ipcRenderer.invoke('fragment:set-global-path', customPath),
    resetGlobalPath: () => ipcRenderer.invoke('fragment:reset-global-path'),
    copy: (sourcePath, destPath) => ipcRenderer.invoke('fragment:copy', sourcePath, destPath),
    deleteDir: (dirPath) => ipcRenderer.invoke('fragment:delete-dir', dirPath),
    getFullPath: (relativePath) => ipcRenderer.invoke('fragment:get-full-path', relativePath)
  },
  // 知识库 API
  vault: {
    createDirectory: (dirPath) => ipcRenderer.invoke('vault:create-directory', dirPath),
    write: (filePath, data) => ipcRenderer.invoke('vault:write', filePath, data),
    read: (filePath) => ipcRenderer.invoke('vault:read', filePath),
    deleteDirectory: (dirPath) => ipcRenderer.invoke('vault:delete-directory', dirPath),
    exists: (filePath) => ipcRenderer.invoke('vault:exists', filePath),
    directoryExists: (dirPath) => ipcRenderer.invoke('vault:directory-exists', dirPath),
    getVaultsPath: () => ipcRenderer.invoke('vault:get-vaults-path')
  },
  // 知识库注册表 API
  vaultRegistry: {
    getRegistry: () => ipcRenderer.invoke('vault-registry:get'),
    saveRegistry: (registry) => ipcRenderer.invoke('vault-registry:save', registry),
    addVault: (item) => ipcRenderer.invoke('vault-registry:add-vault', item),
    removeVault: (id) => ipcRenderer.invoke('vault-registry:remove-vault', id),
    setLastOpened: (id) => ipcRenderer.invoke('vault-registry:set-last-opened', id),
    checkPathExists: (vaultPath) => ipcRenderer.invoke('vault-registry:check-path-exists', vaultPath)
  },
  dialog: {
    openFolder: (options) => ipcRenderer.invoke('dialog:open-folder', options),
    openFile: () => ipcRenderer.invoke('dialog:open-file'),
    saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options)
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
