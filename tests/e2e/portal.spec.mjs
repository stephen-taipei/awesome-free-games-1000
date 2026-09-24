import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const catalog = JSON.parse(fs.readFileSync('public/catalog.json', 'utf8'));
test('catalog search, categories, favorites, pagination and history', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.game-card')).toHaveCount(36);
  await page.locator('#next').click();
  await expect(page).toHaveURL(/page=2/);
  await page.locator('[data-category="puzzle"]').click();
  await expect(page.locator('#results-note')).toContainText('150');
  await page.locator('#search').fill('2048');
  await expect(page.locator('.game-card')).toHaveCount(1);
  await page.locator('.favorite-button').click();
  await expect(page.locator('#favorite-count')).toHaveText('1');
  await page.reload();
  await expect(page.locator('.favorite-button')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#favorites-filter').click();
  await expect(page.locator('.game-card')).toHaveCount(1);
  await page.locator('.favorite-button').click();
  await expect(page.locator('#empty')).toBeVisible();
  await page.locator('#reset').click();
  await expect(page.locator('.game-card')).toHaveCount(36);
  await page.goBack();
  await expect(page.locator('#favorites-filter')).toHaveAttribute('aria-pressed', 'true');
});
test('mobile gallery fits viewport and keyboard focus is visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('.game-card')).toHaveCount(36);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#search').focus();
  await expect(page.locator('#search')).toBeFocused();
  await page.screenshot({ path: 'test-results/portal-mobile.png', fullPage: false });
});
test('desktop gallery screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('./');
  await expect(page.locator('.game-card')).toHaveCount(36);
  await page.screenshot({ path: 'test-results/portal-desktop.png', fullPage: false });
});
test('failed catalog fetch offers retry and a static fallback', async ({ page }) => {
  await page.route('**/catalog.json', route => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('./');
  await expect(page.locator('#retry')).toBeVisible();
  await expect(page.locator('a[href="./catalog.html"]').first()).toBeVisible();
  await page.unroute('**/catalog.json');
  await page.locator('#retry').click();
  await expect(page.locator('.game-card')).toHaveCount(36);
});
test('storage denial and corrupt favorites do not prevent browsing', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('./');
  await expect(page.locator('.game-card')).toHaveCount(36);
  await page.locator('.favorite-button').first().click();
  await expect(page.locator('#favorite-count')).toHaveText('1');
  await page.locator('#favorites-filter').click();
  await expect(page.locator('.game-card')).toHaveCount(1);
});
test('static directory works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4174/awesome-free-games-1000/catalog.html');
  await expect(page.locator('a[href^="src/games/"]')).toHaveCount(catalog.total);
  await context.close();
});
test('direct nested game link can return to the subpath lobby', async ({ page }) => {
  await page.goto(catalog.games[0].url);
  await expect(page.locator('afg-navigation')).toBeVisible();
  await page.locator('afg-navigation').getByRole('link').click();
  await expect(page).toHaveURL('http://127.0.0.1:4174/awesome-free-games-1000/index.html');
  await expect(page.locator('.game-card')).toHaveCount(36);
});
