import { test, _electron as electron, expect } from '@playwright/test';

async function getMainAppWindow(electronApp: Awaited<ReturnType<typeof electron.launch>>) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const mainWindow = electronApp.windows().find((window) => {
      const url = window.url();
      return url.startsWith('http://localhost:5173') || url.startsWith('file://');
    });

    if (mainWindow) {
      return mainWindow;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Unable to locate Electron app window. URLs: ${electronApp
      .windows()
      .map((window) => window.url())
      .join(', ')}`,
  );
}

test.describe('Electron App Tests', () => {
  test('opens the new vault dialog and captures screenshots', async ({}, testInfo) => {
    const electronApp = await electron.launch({
      args: ['.'],
    });

    const window = await getMainAppWindow(electronApp);

    await expect(window.getByTestId('vault-select-page')).toBeVisible({ timeout: 30000 });
    await expect(window.getByTestId('vault-select-title')).toHaveText('MD Note');
    await window.screenshot({ path: testInfo.outputPath('vault-select-home.png') });

    await window.getByTestId('open-new-vault-dialog').click();
    await expect(window.getByTestId('new-vault-dialog')).toBeVisible();

    await window.getByTestId('new-vault-name-input').fill('Electron 自动化验收');
    await expect(window.getByTestId('confirm-create-vault')).toBeEnabled();
    await window.screenshot({ path: testInfo.outputPath('new-vault-dialog.png') });

    await window.getByTestId('cancel-create-vault').click();
    await expect(window.getByTestId('new-vault-dialog')).toHaveCount(0);

    await electronApp.close();
  });
});
