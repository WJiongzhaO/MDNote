import { test, _electron as electron, expect } from '@playwright/test';

test.describe('Electron App Tests', () => {
  test('should launch Electron app and access window elements', async () => {
    // 启动Electron应用
    const electronApp = await electron.launch({
      args: ['.'], // 当前目录作为应用入口
    });

    // 等待应用启动完成，所有窗口都应该已创建
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 获取所有窗口
    const allWindows = electronApp.windows();
    console.log('总窗口数量:', allWindows.length);

    // 找到主应用窗口（URL包含localhost:5173或file://协议）
    let mainWindow = allWindows.find(w =>
      w.url().includes('localhost:5173') ||
      w.url().startsWith('file://')
    );

    // 如果没有找到，使用第一个窗口
    if (!mainWindow) {
      mainWindow = await electronApp.firstWindow();
    }

    const window = mainWindow;

    // 监听控制台消息以捕获错误
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    window.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.error('Browser Console Error:', text);
      } else {
        console.log('Browser Console:', text);
      }
    });

    window.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
      console.error('Page Error:', error.message, error.stack);
    });

    console.log('窗口URL:', window.url());

    // 等待窗口加载完成，更智能的等待
    await window.waitForLoadState('domcontentloaded');

    // 如果是开发模式，需要等待Vite服务器加载完成
    if (window.url().includes('localhost:5173')) {
      console.log('检测到开发模式，等待Vite服务器响应...');

      // 等待页面包含实际内容而不是加载中状态
      await window.waitForFunction(() => {
        return document.readyState === 'complete' &&
               document.body &&
               document.body.innerHTML.trim().length > 100; // 确保有实际内容
      }, { timeout: 30000 });
    }

    // 添加更多调试信息
    const title = await window.title();
    console.log('窗口标题:', title);
    console.log('页面URL:', window.url());

    // 检查页面内容
    const bodyContent = await window.locator('body').innerHTML();
    console.log('页面内容长度:', bodyContent.length);

    // 检查是否有Vue应用挂载
    const appExists = await window.locator('#app').count();
    console.log('#app元素数量:', appExists);

    // 等待Vue应用加载完成
    if (appExists > 0) {
      try {
        await window.waitForSelector('#app', { state: 'visible', timeout: 5000 });
        console.log('#app元素可见');
      } catch (error) {
        // 即使超时也继续，打印所有控制台消息
        console.error('#app 元素不可见，打印所有控制台消息:');
        consoleLogs.forEach(log => console.log(log));
        consoleErrors.forEach(err => console.error(err));

        // 检查页面是否有错误
        const pageErrors = await window.evaluate(() => {
          return (window as any).lastError || null;
        });
        if (pageErrors) {
          console.error('页面错误:', pageErrors);
        }

        throw error;
      }

      // 检查Vue应用是否有实际内容
      const appContent = await window.locator('#app').innerHTML();
      console.log('#app内容长度:', appContent.length);
    }

    // 更通用的测试 - 检查页面是否有实际内容
    await expect(window.locator('body')).toBeVisible({ timeout: 15000 });

    // 确保页面不是空白页面
    const hasContent = await window.evaluate(() => {
      return document.body && document.body.innerText.trim().length > 0;
    });
    console.log('页面是否有文本内容:', hasContent);

    // 打印所有捕获的错误
    if (consoleErrors.length > 0) {
      console.error('\n=== 捕获到的控制台错误 ===');
      consoleErrors.forEach((err, i) => {
        console.error(`错误 ${i + 1}:`, err);
      });
      console.error('========================\n');
    }

    // 截图用于调试
    await window.screenshot({ path: 'test-results/electron/app-screenshot.png' });

    // 基本断言 - 只要能检测到页面元素就算通过
    expect(hasContent).toBeTruthy();

    // 关闭应用
    await electronApp.close();
  });
});
