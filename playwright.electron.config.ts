import { defineConfig } from '@playwright/test';

/**
 * Playwright Electron测试配置
 * 专门用于测试Electron应用，而非Web浏览器
 */
export default defineConfig({
  testDir: './e2e/electron',

  // 只运行 Electron 相关的测试文件
  testMatch: [
    '*.spec.ts'
  ],

  timeout: 60 * 1000, // 增加超时时间到60秒
  expect: {
    timeout: 15000, // 增加expect超时时间
  },

  // 先启动Vite开发服务器，然后再运行Electron测试
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000, // 服务器启动超时30秒
  },

  /* Reporter to use. */
  reporter: 'html',

  /* Shared settings for all the projects below. */
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    headless: false, // 设置为false以便调试，可以看到Electron窗口
  },

  /* 配置Electron项目 */
  projects: [
    {
      name: 'electron',
      use: {
        // Electron特定的配置
      },
    },
  ],

  /* Electron测试的输出目录 */
  outputDir: 'test-results/electron',
});