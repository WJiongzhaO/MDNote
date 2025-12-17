# Electron E2E Tests

这个目录包含针对 Electron 应用的端到端测试。

## 测试文件说明

- `app.spec.ts` - 基础的 Electron 应用启动和元素访问测试

## 运行测试

### 运行所有 Electron E2E 测试
```bash
npm run test:electron
```

### 运行特定的 Electron 测试
```bash
npx playwright test --config=playwright.electron.config.ts
```

## 配置文件

- `../../playwright.electron.config.ts` - Electron 测试的专用配置文件

## 与 Web 测试的区别

- **Web 测试** (`e2e/vue.spec.ts`) - 测试浏览器中的应用
- **Electron 测试** (`e2e/electron/*.spec.ts`) - 测试完整的 Electron 应用，包括：
  - 桌面应用窗口
  - IPC 通信
  - 文件系统操作
  - 桌面应用特有功能

## 测试特点

1. **智能窗口选择** - 自动识别主应用窗口，忽略 DevTools 窗口
2. **开发环境支持** - 等待 Vite 开发服务器完全加载
3. **详细调试信息** - 提供窗口信息、内容检查和截图功能
4. **完整应用测试** - 可以测试 Electron 特有的功能