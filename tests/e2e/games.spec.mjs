import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const catalog = JSON.parse(fs.readFileSync('public/catalog.json', 'utf8'));
for (const game of catalog.games) {
  test(`boot ${game.id}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).hostname === '127.0.0.1') errors.push(`HTTP ${response.status()}: ${response.url()}`); });
    const response = await page.goto(game.url, { waitUntil: 'load' });
    expect(response.status()).toBe(200);
    await expect(page.locator('afg-navigation')).toBeVisible();
    await page.waitForTimeout(100);
    const start = page.locator('#start-btn, #start-button, #new-game-btn').first();
    if (await start.isVisible()) { await start.click({ timeout: 2000 }); await page.waitForTimeout(100); }
    expect(errors).toEqual([]);
  });
}
