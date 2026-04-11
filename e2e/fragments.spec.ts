import { test, expect } from '@playwright/test';

/**
 * 片段管理 / 健康度仪表盘（工作2+3）
 * 需在 dev 服务器运行：npm run dev
 */
test.describe('Fragments & health', () => {
  test('fragment management page loads', async ({ page }) => {
    await page.goto('/fragments');

    await expect(page.getByTestId('fragment-management-page')).toBeVisible();
    await expect(page.getByTestId('fragment-management-breadcrumb-current')).toHaveText('片段管理');
    await expect(page.getByTestId('create-fragment-button')).toBeVisible();

    const fragmentCards = page.getByTestId('fragment-card');
    if (await fragmentCards.count()) {
      await expect(fragmentCards.first()).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: '暂无片段' })).toBeVisible();
    }
  });

  test('health dashboard opens from fragment management', async ({ page }) => {
    await page.goto('/fragments');
    await page.getByTestId('fragment-management-health-link').click();

    await expect(page).toHaveURL(/\/fragments\/health$/);
    await expect(page.getByTestId('knowledge-health-dashboard')).toBeVisible();
    await expect(page.getByTestId('health-dashboard-recent-active')).toBeVisible();
  });
});
