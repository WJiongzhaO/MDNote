import { test, expect } from '@playwright/test';

test('opens and closes the new vault dialog from the home page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('vault-select-page')).toBeVisible();
  await expect(page.getByTestId('vault-select-title')).toHaveText('MD Note');
  await expect(page.getByTestId('vault-select-subtitle')).toHaveText('选择或创建知识库');

  await page.getByTestId('open-new-vault-dialog').click();
  await expect(page.getByTestId('new-vault-dialog')).toBeVisible();
  await expect(page.getByTestId('confirm-create-vault')).toBeDisabled();

  await page.getByTestId('new-vault-name-input').fill('自动化验收用知识库');
  await expect(page.getByTestId('confirm-create-vault')).toBeEnabled();

  await page.getByTestId('cancel-create-vault').click();
  await expect(page.getByTestId('new-vault-dialog')).toHaveCount(0);
});
