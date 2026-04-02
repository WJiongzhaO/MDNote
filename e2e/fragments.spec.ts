import { test, expect } from '@playwright/test';

/**
 * 片段管理 / 健康度仪表盘（工作2+3）
 * 需在 dev 服务器运行：npm run dev
 */
test.describe('Fragments & health', () => {
  test('fragment management page loads', async ({ page }) => {
    await page.goto('/fragments');
    await expect(page.getByRole('heading', { name: '片段管理' })).toBeVisible();
  });

  test('health dashboard loads', async ({ page }) => {
    await page.goto('/fragments/health');
    await expect(page.getByRole('heading', { name: '知识健康度仪表盘' })).toBeVisible();
  });
});
