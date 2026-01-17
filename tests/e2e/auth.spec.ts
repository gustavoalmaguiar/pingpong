import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to signin page', async ({ page }) => {
    await page.goto('/');

    // Should be redirected to signin page
    await expect(page).toHaveURL(/.*signin/);
  });

  test('should show signin page with OAuth buttons', async ({ page }) => {
    await page.goto('/auth/signin');

    // Should show the signin page
    await expect(page).toHaveURL(/.*signin/);

    // Should have OAuth provider buttons
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
  });

  test('should show signout page', async ({ page }) => {
    await page.goto('/auth/signout');

    // Should show signout page content
    await expect(page).toHaveURL(/.*signout/);
  });
});
