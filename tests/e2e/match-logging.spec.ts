import { test, expect } from '@playwright/test';

test.describe('Match Logging (Unauthenticated)', () => {
  test('should not show FAB for unauthenticated users', async ({ page }) => {
    // Navigate to home, expect redirect to signin
    await page.goto('/');

    // FAB should not be visible since user is not authenticated
    // (they're on the signin page)
    const fab = page.locator('[data-testid="log-match-fab"]');
    await expect(fab).not.toBeVisible();
  });

  test('should redirect to signin when accessing dashboard', async ({ page }) => {
    await page.goto('/');

    // Should redirect to signin
    await expect(page).toHaveURL(/.*signin/);
  });
});

test.describe('Match Logging UI Structure', () => {
  // These tests would require authenticated sessions
  // For now, we skip them but document what should be tested

  test.describe.skip('Authenticated User', () => {
    test('should show FAB on dashboard', async ({ page }) => {
      // Would need auth cookie setup
      await page.goto('/');
      const fab = page.locator('[data-testid="log-match-fab"]');
      await expect(fab).toBeVisible();
    });

    test('should open modal when FAB is clicked', async ({ page }) => {
      await page.goto('/');
      await page.locator('[data-testid="log-match-fab"]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('should show singles and doubles tabs', async ({ page }) => {
      await page.goto('/');
      await page.locator('[data-testid="log-match-fab"]').click();

      await expect(page.getByRole('tab', { name: /singles/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /doubles/i })).toBeVisible();
    });

    test('should validate score input', async ({ page }) => {
      await page.goto('/');
      await page.locator('[data-testid="log-match-fab"]').click();

      // Try to submit without valid scores
      await page.getByRole('button', { name: /log match/i }).click();

      // Should show validation error
      await expect(page.getByText(/select.*winner/i)).toBeVisible();
    });
  });
});
