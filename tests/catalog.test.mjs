import test from 'node:test';
import assert from 'node:assert/strict';
import { readState, stateSearch, filterGames, paginate } from '../src/portal/catalog.mjs';
import { discoverGames, siteUrl, escapeHtml } from '../scripts/catalog.mjs';
import { readIds, saveIds, toggleFavorite } from '../src/portal/preferences.mjs';
const games = [
  { id: 'puzzle/game-001-first', number: 1, category: 'puzzle', title: 'First', titles: { 'zh-TW': '數字拼圖' }, description: 'merge numbers' },
  { id: 'arcade/game-001-second', number: 1, category: 'arcade', title: 'Second', titles: { en: 'Space Jump' }, description: 'space arcade' },
];
const base = readState('', ['puzzle', 'arcade']);
test('URL state clamps unsupported category, order and pages', () => {
  assert.deepEqual(readState('?category=__proto__&order=bad&page=-9', []), base);
  assert.equal(readState('?page=0', []).page, 1);
  assert.equal(readState('?page=99999999999', []).page, 1);
  assert.equal(readState('?q=' + 'a'.repeat(300), []).q.length, 200);
});
test('URL state round trips Unicode, favorites and page', () => {
  const state = { q: '拼圖 & space', category: 'puzzle', order: 'title', favorites: true, page: 4 };
  assert.deepEqual(readState(stateSearch(state), ['puzzle']), state);
});
test('search matches translations and AND tokens, case-insensitively', () => {
  assert.equal(filterGames(games, { ...base, q: '數字' })[0].id, games[0].id);
  assert.equal(filterGames(games, { ...base, q: 'SPACE Jump' })[0].id, games[1].id);
  assert.equal(filterGames(games, { ...base, q: 'SPACE merge' }).length, 0);
});
test('favorites use path IDs instead of colliding numeric labels', () => {
  assert.deepEqual(filterGames(games, { ...base, favorites: true }, [games[1].id]), [games[1]]);
});
test('category and empty favorites are independent constraints', () => {
  assert.equal(filterGames(games, { ...base, category: 'puzzle' }).length, 1);
  assert.equal(filterGames(games, { ...base, favorites: true }).length, 0);
});
test('pagination handles empty, invalid and oversize pages without gaps', () => {
  for (const n of [-9, NaN, Infinity]) assert.equal(paginate(games, n).page, 1);
  assert.deepEqual(paginate([], 100), { page: 1, pages: 1, items: [] });
  assert.deepEqual(paginate(games, 9, 1), { page: 2, pages: 2, items: [games[1]] });
});
test('corrupt and blocked storage cannot break favorites', () => {
  globalThis.localStorage = { getItem: () => '{bad', setItem() { throw Error('denied'); } };
  assert.deepEqual(readIds('corrupt'), []);
  assert.deepEqual(saveIds('favorites', [games[0].id, games[0].id, 'javascript:bad']), [games[0].id]);
  assert.deepEqual(readIds('favorites'), [games[0].id]);
  assert.deepEqual(toggleFavorite(games[0].id), []);
  delete globalThis.localStorage;
});
test('inventory is deterministic and uses unique safe relative routes', () => {
  const inventory = discoverGames();
  assert.equal(new Set(inventory.map(g => g.id)).size, inventory.length);
  assert.ok(inventory.length > 900);
  assert.ok(inventory.every(g => /^src\/games\/[a-z]+\/game-\d+-[a-z0-9-]+\/index\.html$/.test(g.url)));
  assert.deepEqual(discoverGames(), inventory);
});
test('site URL validates deployment origin and XML escaping', () => {
  const previous = process.env.SITE_URL;
  try {
    process.env.SITE_URL = 'https://example.test/games';
    assert.equal(siteUrl(), 'https://example.test/games/');
    for (const value of ['javascript:alert(1)', 'https://user:pass@example.test/', 'https://example.test/?x=1']) {
      process.env.SITE_URL = value; assert.throws(siteUrl);
    }
    assert.equal(escapeHtml('<&"\''), '&lt;&amp;&quot;&#39;');
  } finally { if (previous === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previous; }
});
