import { test, expect } from '@playwright/test';

test('boots black screen and reaches ready', async ({ page }) => {
  const warns: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'warning') warns.push(msg.text());
  });
  await page.goto('/');
  await expect(page.locator('#game-root')).toBeVisible();
  await expect.poll(() => warns.some(w => w.includes('ready')), { timeout: 15_000 }).toBe(true);
});
