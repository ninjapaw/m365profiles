import { expect, test } from '@playwright/test';

test('renders the licensing decision experience', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/M365 Profiles|Microsoft 365/i);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Privileged admin/i })).toBeVisible();
});