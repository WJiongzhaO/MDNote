// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// 使用 electron-is-dev@2.0.0（CommonJS 版本）
const isDev = require('electron-is-dev');

// 设置数据存储目录
const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');

// 确保数据目录存在
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 文件操作 IPC 处理
ipcMain.handle('file:read', async (event, filename) => {
  try {
    const filePath = path.join(dataPath, filename);
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
    const filePath = path.join(dataPath, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle('file:delete', async (event, filename) => {
  try {
    const filePath = path.join(dataPath, filename);
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
    const filePath = path.join(dataPath, filename);
    return fs.existsSync(filePath);
  } catch (error) {
    console.error('Error checking file existence:', error);
    throw error;
  }
});

ipcMain.handle('file:list', async (event, pattern = '*.json') => {
  try {
    const files = fs.readdirSync(dataPath);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
});