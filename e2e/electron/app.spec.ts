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
      await window.waitForSelector('#app', { state: 'visible', timeout: 15000 });
      console.log('#app元素可见');

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

    // 截图用于调试
    await window.screenshot({ path: 'test-results/electron/app-screenshot.png' });

    // 基本断言 - 只要能检测到页面元素就算通过
    expect(hasContent).toBeTruthy();

    // 关闭应用
    await electronApp.close();
  });
});