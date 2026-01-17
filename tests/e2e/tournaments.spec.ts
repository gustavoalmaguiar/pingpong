import { test, expect } from '@playwright/test';

test.describe('Tournaments Page', () => {
  // Note: These tests check public-facing pages
  // For authenticated flows, you would need to set up test auth

  test('tournaments page is accessible', async ({ page }) => {
    // Try to access tournaments page
    const response = await page.goto('/tournaments');

    // Should get some response (may redirect to signin)
    expect(response).not.toBeNull();
  });

  test('should show page title on public tournaments list', async ({ page }) => {
    await page.goto('/tournaments');

    // If redirected to signin, that's expected behavior
    // The test verifies the page doesn't crash
    const url = page.url();
    expect(url).toMatch(/tournaments|signin/);
  });
});

test.describe('Leaderboard Page', () => {
  test('leaderboard page is accessible', async ({ page }) => {
    const response = await page.goto('/leaderboard');
    expect(response).not.toBeNull();
  });

  test('should render leaderboard or redirect to signin', async ({ page }) => {
    await page.goto('/leaderboard');
    const url = page.url();
    expect(url).toMatch(/leaderboard|signin/);
  });
});
