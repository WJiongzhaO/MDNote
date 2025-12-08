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
});

// 安全限制：禁止直接暴露 ipcRenderer
// window.ipcRenderer = null;