// main.js
const { app, BrowserWindow, ipcMain, Menu, dialog, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { registerGitIpcHandlers } = require('./git-ipc-handlers');

// 使用 electron-is-dev@2.0.0（CommonJS 版本）
const isDev = require('electron-is-dev');

// 设置数据存储目录
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');

// 读取配置文件
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return {};
}

// 保存配置文件
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

// 获取数据存储目录（支持自定义路径）
function getDataPath() {
  const config = loadConfig();
  if (config.customDataPath && fs.existsSync(config.customDataPath)) {
    return config.customDataPath;
  }

  // 如果是生产环境（已打包），使用app同级目录
  if (!isDev) {
    // app.getAppPath() 在打包后返回 app.asar 的路径
    // 我们需要获取 app.asar 的父目录，然后创建 data 文件夹
    const appPath = app.getAppPath();
    // 如果是 asar 包，需要获取 asar 文件的目录
    let basePath;
    if (appPath.endsWith('.asar')) {
      basePath = path.dirname(appPath);
    } else if (appPath.includes('.asar')) {
      // 如果路径包含 .asar，提取 .asar 之前的路径
      const asarIndex = appPath.indexOf('.asar');
      basePath = path.dirname(appPath.substring(0, asarIndex + 5));
    } else {
      // 开发环境或非 asar 打包
      basePath = path.dirname(appPath);
    }
    return path.join(basePath, 'MDNoteData');
  }

  // 开发环境：使用用户数据目录
  return path.join(userDataPath, 'data');
}

// 获取应该自动打开的文件夹（优先使用知识片段库文件夹，否则使用上次打开的文件夹）
function getAutoOpenFolder() {
  const config = loadConfig();
  // 优先使用知识片段库文件夹（customDataPath）
  if (config.customDataPath && fs.existsSync(config.customDataPath)) {
    return config.customDataPath;
  }
  // 否则使用上次打开的文件夹
  if (config.lastOpenedFolder && fs.existsSync(config.lastOpenedFolder)) {
    return config.lastOpenedFolder;
  }
  return null;
}

// 初始化数据路径
let dataPath = getDataPath();

// 确保数据目录存在
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// 创建原生菜单
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: (menuItem, browserWindow) => {
            browserWindow.webContents.send('menu:new-file');
          }
        },
        {
          label: 'New Folder',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: (menuItem, browserWindow) => {
            browserWindow.webContents.send('menu:new-folder');
          }
        },
        { type: 'separator' },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: async (menuItem, browserWindow) => {
            const result = await dialog.showOpenDialog(browserWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Markdown Files', extensions: ['md', 'markdown'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            if (!result.canceled && result.filePaths.length > 0) {
              browserWindow.webContents.send('menu:open-file', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async (menuItem, browserWindow) => {
            const result = await dialog.showOpenDialog(browserWindow, {
              properties: ['openDirectory']
            });
            if (!result.canceled && result.filePaths.length > 0) {
              // 直接发送文件夹路径，不再次弹出对话框
              browserWindow.webContents.send('menu:open-folder', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: (menuItem, browserWindow) => {
            browserWindow.webContents.send('menu:save');
          }
        },
        { type: 'separator' },
        {
          role: 'quit',
          label: process.platform === 'darwin' ? 'Quit' : 'Exit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Select All' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'close', label: 'Close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: (menuItem, browserWindow) => {
            dialog.showMessageBox(browserWindow, {
              type: 'info',
              title: 'About MD Note',
              message: 'MD Note',
              detail: 'A Markdown note-taking application'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // 设置 Content Security Policy 以减少安全警告
      webSecurity: true,
    },
  });

  // 设置 Content Security Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: app:; " +
          "img-src 'self' data: blob: app: file:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "font-src 'self' data:; " +
          "connect-src 'self' app: file:;"
        ]
      }
    });
  });

  // 将渲染进程的控制台输出重定向到主进程终端
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const prefix = level === 1 ? '[Renderer Error]' :
                   level === 2 ? '[Renderer Warning]' :
                   level === 3 ? '[Renderer Info]' :
                   level === 4 ? '[Renderer Debug]' : '[Renderer Log]';

    console.log(`${prefix} ${message}`);
    if (line) {
      console.log(`    at ${sourceId}:${line}`);
    }
  });

  // 监听所有控制台消息，包括错误和警告
  win.webContents.on('did-finish-load', () => {
    console.log('[Main Process] Window finished loading');
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Main Process] Failed to load:', errorCode, errorDescription, validatedURL);
  });

  // 监听渲染进程的未捕获异常
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('[Main Process] Render process gone:', details);
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow = win;
  return win;
}

app.whenReady().then(() => {
  createWindow();

  // 自动打开文件夹（优先使用知识片段库文件夹，否则使用上次打开的文件夹）
  const folderToOpen = getAutoOpenFolder();
  if (folderToOpen) {
    // 延迟发送，确保窗口已准备好
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:restore-last-folder', folderToOpen);
      }
    }, 500);
  }

  // 注册自定义协议来安全地提供本地文件
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      // request.url 格式: app://C:/path/to/file 或 app:///C:/path/to/file
      let filePath = request.url.replace(/^app:\/\//, '');

      // 移除开头的斜杠（如果有多个）
      filePath = filePath.replace(/^\/+/, '');

      // 解码 URL 编码的路径（处理中文等特殊字符）
      filePath = decodeURIComponent(filePath);

      // 处理路径：如果是绝对路径则直接使用，如果是相对路径则拼接到dataPath
      if (!path.isAbsolute(filePath)) {
        // 相对路径：拼接到dataPath
        filePath = path.join(getDataPath(), filePath);
      }

      // 规范化路径（处理 .. 和 . 等）
      filePath = path.normalize(filePath);

      // 检查文件是否存在
      if (fs.existsSync(filePath)) {
        callback({ path: filePath });
      } else {
        console.error('File not found:', filePath, 'Original URL:', request.url);
        callback({ error: -6 }); // FILE_NOT_FOUND
      }
    } catch (error) {
      console.error('Error serving file:', error, 'URL:', request.url);
      callback({ error: -6 });
    }
  });

  createMenu();
  // createWindow() 已经在 app.whenReady() 中调用了，这里不需要再次调用
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 文件操作 IPC 处理
ipcMain.handle('file:read', async (event, filename) => {
  try {
    const filePath = path.join(getDataPath(), filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('file:write', async (event, filename, data) => {
  try {
    const filePath = path.join(getDataPath(), filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle('file:delete', async (event, filename) => {
  try {
    const filePath = path.join(getDataPath(), filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
});

ipcMain.handle('file:exists', async (event, filename) => {
  try {
    const filePath = path.join(getDataPath(), filename);
    return fs.existsSync(filePath);
  } catch (error) {
    console.error('Error checking file existence:', error);
    throw error;
  }
});

ipcMain.handle('file:list', async (_event, _pattern = '*.json') => {
  try {
    const files = fs.readdirSync(getDataPath());
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
});

// 图片和文件操作 IPC 处理
ipcMain.handle('file:copy', async (event, sourcePath, destPath) => {
  try {
    // 确保目标目录存在
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(sourcePath, destPath);
    return true;
  } catch (error) {
    console.error('Error copying file:', error);
    throw error;
  }
});

ipcMain.handle('file:mkdir', async (event, dirPath) => {
  try {
    // 如果是相对路径（不包含 : 或 / 开头），需要拼接 dataPath
    let fullPath = dirPath;
    if (!path.isAbsolute(dirPath) && !dirPath.includes(':')) {
      // 相对路径：拼接到 dataPath
      fullPath = path.join(getDataPath(), dirPath);
    }

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
});

ipcMain.handle('file:write-binary', async (event, filePath, buffer) => {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return true;
  } catch (error) {
    console.error('Error writing binary file:', error);
    throw error;
  }
});

ipcMain.handle('file:read-binary', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return Array.from(buffer);
    }
    return null;
  } catch (error) {
    console.error('Error reading binary file:', error);
    throw error;
  }
});

ipcMain.handle('file:exists-path', async (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error('Error checking file existence:', error);
    throw error;
  }
});

ipcMain.handle('file:get-stats', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime.toISOString(),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting file stats:', error);
    throw error;
  }
});

// 获取文件的完整路径（用于构建app://协议URL）
ipcMain.handle('file:get-full-path', async (event, relativePath) => {
  try {
    let fullPath;

    // 检查是否是绝对路径（外部文件）
    if (path.isAbsolute(relativePath)) {
      // 外部文件：直接使用绝对路径
      fullPath = relativePath;
    } else {
      // 数据库文档：相对于dataPath的路径，如 "documents/xxx/assets/image.png"
      fullPath = path.join(getDataPath(), relativePath);
    }

    // 转换为app://协议URL（自定义协议，更安全）
    // Windows路径需要特殊处理：C:\path\to\file -> app://C:/path/to/file
    const normalizedPath = fullPath.replace(/\\/g, '/');

    // 直接返回 app:// 协议的 URL，协议处理器会处理路径解析
    return `app://${normalizedPath}`;
  } catch (error) {
    console.error('Error getting full path:', error);
    throw error;
  }
});

// 获取数据目录的完整路径
ipcMain.handle('file:get-data-path', async () => {
  const path = getDataPath();
  console.log('[Main Process] file:get-data-path called, returning:', path);
  return path;
});

// 获取自定义数据路径（如果已设置）
ipcMain.handle('file:get-custom-data-path', async () => {
  const config = loadConfig();
  const customPath = config.customDataPath || null;
  console.log('[Main Process] file:get-custom-data-path called, returning:', customPath);
  return customPath;
});

// 设置自定义数据路径
ipcMain.handle('file:set-custom-data-path', async (_event, customPath) => {
  try {
    console.log('[Main Process] file:set-custom-data-path called with:', customPath);

    if (!customPath || !fs.existsSync(customPath)) {
      throw new Error('Invalid path or path does not exist');
    }

    const config = loadConfig();
    config.customDataPath = customPath;
    // 同时将这个路径设置为上次打开的文件夹（这样下次启动时会自动打开）
    config.lastOpenedFolder = customPath;
    saveConfig(config);

    // 更新 dataPath 变量
    dataPath = customPath;
    console.log('[Main Process] dataPath updated to:', dataPath);

    // 确保数据目录存在
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }

    console.log('[Main Process] Custom data path set successfully:', customPath);
    return { success: true, path: customPath };
  } catch (error) {
    console.error('[Main Process] Error setting custom data path:', error);
    return { success: false, error: error.message };
  }
});

// 重置为默认数据路径
ipcMain.handle('file:reset-data-path', async () => {
  try {
    const config = loadConfig();
    delete config.customDataPath;
    saveConfig(config);

    // 更新 dataPath 变量为默认路径
    dataPath = path.join(userDataPath, 'data');

    // 确保数据目录存在
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }

    return { success: true, path: dataPath };
  } catch (error) {
    console.error('Error resetting data path:', error);
    return { success: false, error: error.message };
  }
});

// 打开文件夹对话框
ipcMain.handle('dialog:open-folder', async (_event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    // 保存上次打开的文件夹
    const config = loadConfig();
    config.lastOpenedFolder = result.filePaths[0];
    saveConfig(config);
    return result.filePaths[0];
  }
  return null;
});

// 保存上次打开的文件夹
ipcMain.handle('file:save-last-opened-folder', async (_event, folderPath) => {
  try {
    const config = loadConfig();
    config.lastOpenedFolder = folderPath;
    saveConfig(config);
    return { success: true };
  } catch (error) {
    console.error('Error saving last opened folder:', error);
    return { success: false, error: error.message };
  }
});

// 获取上次打开的文件夹
ipcMain.handle('file:get-last-opened-folder', async () => {
  try {
    const config = loadConfig();
    if (config.lastOpenedFolder && fs.existsSync(config.lastOpenedFolder)) {
      return config.lastOpenedFolder;
    }
    return null;
  } catch (error) {
    console.error('Error getting last opened folder:', error);
    return null;
  }
});

// 打开文件对话框
ipcMain.handle('dialog:open-file', async (_event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 保存文件对话框
ipcMain.handle('dialog:save-file', async (_event, options) => {
  const browserWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(browserWindow, {
    title: options.title || '保存文件',
    defaultPath: options.defaultPath,
    filters: options.filters || [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) {
    return null;
  }
  return result.filePath;
});

// 读取目录内容
ipcMain.handle('file:read-directory', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = [];

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      result.push({
        name: item.name,
        type: item.isDirectory() ? 'folder' : 'file',
        path: fullPath
      });
    }

    // 排序：文件夹在前，然后按名称排序
    result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error;
  }
});

// 读取文件内容
ipcMain.handle('file:read-file-content', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  } catch (error) {
    console.error('Error reading file content:', error);
    throw error;
  }
});

// 写入文件内容
ipcMain.handle('file:write-file-content', async (event, filePath, content) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing file content:', error);
    throw error;
  }
});

// 删除文件或文件夹
ipcMain.handle('file:delete-node', async (event, nodePath) => {
  try {
    // 规范化路径（处理 Windows 路径）
    const normalizedPath = path.normalize(nodePath);

    // 检查路径是否存在
    if (!fs.existsSync(normalizedPath)) {
      console.warn('要删除的路径不存在:', normalizedPath);
      return true; // 路径不存在，视为删除成功
    }

    const stats = fs.statSync(normalizedPath);
    if (stats.isDirectory()) {
      fs.rmSync(normalizedPath, { recursive: true, force: true });
      console.log('已删除目录:', normalizedPath);
    } else {
      fs.unlinkSync(normalizedPath);
      console.log('已删除文件:', normalizedPath);
    }
    return true;
  } catch (error) {
    console.error('Error deleting node:', error);
    throw error;
  }
});

// 文件缓存操作（用于存储引用标志信息）
const getCachePath = (filePath) => {
  // 将文件路径转换为缓存文件名（使用hash避免路径问题）
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(filePath).digest('hex');
  const cacheDir = path.join(getDataPath(), 'file-cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return path.join(cacheDir, `${hash}.json`);
};

ipcMain.handle('file:save-file-cache', async (event, filePath, cacheData) => {
  try {
    const cachePath = getCachePath(filePath);
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving file cache:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:get-file-cache', async (event, filePath) => {
  try {
    const cachePath = getCachePath(filePath);
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error getting file cache:', error);
    return null;
  }
});

ipcMain.handle('file:delete-file-cache', async (event, filePath) => {
  try {
    const cachePath = getCachePath(filePath);
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting file cache:', error);
    return { success: false, error: error.message };
  }
});

// ==================== PDF 导出 IPC 处理器 ====================
ipcMain.handle('export:pdf', async (event, options) => {
  try {
    console.log('[Main Process] PDF export requested:', options.title);
    
    // 直接使用 Puppeteer 生成 PDF，不依赖 TypeScript 编译后的文件
    // 渲染进程已经准备好了 HTML 内容，我们只需要使用 Puppeteer 生成 PDF
    const puppeteer = require('puppeteer');
    
    let browser;
    try {
      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // 设置内容，等待所有资源加载完成（包括图片和 CSS）
      await page.setContent(options.html || options.content || '', { waitUntil: 'networkidle0' });

      // 等待 Mermaid 图表渲染（如果有）
      await page.evaluate(async () => {
        const maxAttempts = 20; // 最多尝试 20 次
        const delay = 500; // 每次尝试间隔 500ms
        let attempts = 0;

        while (attempts < maxAttempts) {
          const mermaidPlaceholders = document.querySelectorAll('.mermaid-asset-placeholder');
          if (mermaidPlaceholders.length === 0) {
            console.log('所有Mermaid图表已渲染。');
            return; // 所有占位符都已消失，渲染完成
          }
          console.log(`等待Mermaid图表渲染... 剩余 ${mermaidPlaceholders.length} 个占位符。尝试 ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
        }
        console.warn('Mermaid图表渲染超时，可能部分图表未渲染。');
      });

      // 生成 PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        },
        printBackground: true
      });

      await browser.close();

      console.log('[Main Process] PDF export completed, buffer size:', pdfBuffer.length);

      // 将 Buffer 转换为 Array（用于 IPC 传输）
      const bufferArray = Array.from(pdfBuffer);

      return {
        success: true,
        buffer: bufferArray,
        extension: 'pdf',
        mimeType: 'application/pdf',
        filename: (options.title || 'document').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') + '.pdf'
      };
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      throw error;
    }
  } catch (error) {
    console.error('[Main Process] PDF export error:', error);
    return {
      success: false,
      error: error.message || 'PDF导出失败'
    };
  }
});

// ==================== Git IPC 处理器 ====================
// 注册所有 Git 相关的 IPC 处理器
// 传递一个函数，这样 Git handlers 可以动态获取最新的 dataPath
registerGitIpcHandlers(ipcMain, () => dataPath);
