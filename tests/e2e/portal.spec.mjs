import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const catalog = JSON.parse(fs.readFileSync('public/catalog.json', 'utf8'));
const featured = ['2048', 'Tetris', 'Sudoku', 'Minesweeper', 'Klotski'];

async function expectOriginalHomepage(page) {
  await expect(page).toHaveTitle('Awesome Free Games 1000 | Frontend Browser Games');
  await expect(page.locator('.hero h1')).toHaveText('Awesome Free Games 1000');
  await expect(page.locator('.sample h3')).toHaveText(featured);
  await expect(page.locator('.faq-item')).toHaveCount(3);
  await expect(page.locator('#library, .site-header, .game-card, script[type="module"]')).toHaveCount(0);
}

test('original homepage retains featured routes and repaired nonvisual links', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expectOriginalHomepage(page);
  for (const href of await page.locator('.sample a').evaluateAll(links => links.map(link => link.href))) {
    expect(new URL(href).pathname).toMatch(/^\/awesome-free-games-1000\/src\/games\//);
    const response = await page.request.get(href);
    expect(response.status()).toBe(200);
  }
  await expect(page.getByRole('link', { name: 'Read README', exact: true })).toHaveAttribute('href',
    'https://github.com/stephen-taipei/awesome-free-games-1000/blob/main/README.md');
  await expect(page.locator('link[rel="alternate"]')).toHaveAttribute('href', './llms.txt');
  expect((await page.request.get(new URL('./llms.txt', page.url()).href)).status()).toBe(200);
  expect(errors).toEqual([]);
});

test('original mobile homepage fits viewport and supports keyboard navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expectOriginalHomepage(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'View GitHub', exact: true })).toBeFocused();
  await page.screenshot({ path: 'test-results/homepage-mobile.png', fullPage: false });
});

test('original desktop homepage screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('./');
  await expectOriginalHomepage(page);
  await page.screenshot({ path: 'test-results/homepage-desktop.png', fullPage: false });
});

test('homepage does not depend on catalogue fetches or browser storage', async ({ page }) => {
  const errors = [];
  const catalogueRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/catalog.json', route => {
    catalogueRequests.push(route.request().url());
    return route.fulfill({ status: 503, body: '{}' });
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('./', { waitUntil: 'load' });
  await expectOriginalHomepage(page);
  expect(catalogueRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('individual game favorites still persist without a redesigned homepage', async ({ page }) => {
  await page.goto(catalog.games[0].url);
  const favorite = page.locator('afg-navigation').getByRole('button');
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  await favorite.click();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await favorite.click();
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
});

test('original homepage and complete directory work without JavaScript', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const base = testInfo.project.use.baseURL;
    await page.goto(base);
    await expectOriginalHomepage(page);
    await page.goto(new URL('catalog.html', base).href);
    await expect(page.locator('a[href^="src/games/"]')).toHaveCount(catalog.total);
  } finally { await context.close(); }
});

test('direct nested game returns to the original subpath homepage', async ({ page }) => {
  await page.goto(catalog.games[0].url);
  await expect(page.locator('afg-navigation')).toBeVisible();
  await page.locator('afg-navigation').getByRole('link').click();
  expect(new URL(page.url()).pathname).toBe('/awesome-free-games-1000/index.html');
  await expectOriginalHomepage(page);
});
