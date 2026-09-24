import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
async function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const { I18n, detectLocale } = await load('src/shared/i18n/index.ts');
const utils = await load('src/shared/utils/index.ts');
const { Analytics } = await load('src/shared/analytics/index.ts');
const { Game2048 } = await load('src/games/puzzle/game-001-2048/game.ts');
test('regional locales normalize across supported languages', () => {
  for (const [input, expected] of [['zh-HK','zh-TW'],['zh-Hant-TW','zh-TW'],['zh-SG','zh-CN'],['es-MX','es'],['fr-CA','fr'],['ar-SA','ar'],['xx','en']]) assert.equal(detectLocale(input), expected);
});
test('i18n initializes and changes language without available storage', () => {
  globalThis.localStorage = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  const i18n = new I18n(); i18n.setLocale('ja'); assert.equal(i18n.getLocale(), 'ja');
  delete globalThis.localStorage;
});
test('missing locale and individual keys fall back without losing preference', async () => {
  const i18n = new I18n(); i18n.setLocale('ja');
  await i18n.loadTranslations('en', { 'game.title': 'Game', game: { score: 'Score {{score}}' } });
  assert.equal(i18n.getLocale(), 'en'); assert.equal(i18n.t('game.title'), 'Game');
  await i18n.loadTranslations('ja', { 'game.title': 'ゲーム' });
  assert.equal(i18n.getLocale(), 'ja'); assert.equal(i18n.t('game.title'), 'ゲーム');
  assert.equal(i18n.t('game.score', { score: 0 }), 'Score 0');
  assert.equal(i18n.t('unknown'), 'unknown'); assert.equal(i18n.t('toString'), 'toString');
});
test('document language and direction follow actual loaded locale', async () => {
  globalThis.document = { documentElement: {} };
  const i18n = new I18n(); await i18n.loadTranslations('ar', { title: 'Arabic' }); i18n.setLocale('ar');
  assert.deepEqual(document.documentElement, { lang: 'ar', dir: 'rtl' });
  await i18n.loadTranslations('en', { title: 'English' }); i18n.setLocale('en');
  assert.equal(document.documentElement.dir, 'ltr'); delete globalThis.document;
});
test('locale listener can unsubscribe', () => {
  const i18n = new I18n(); let calls = 0; const off = i18n.onLocaleChange(() => calls++);
  i18n.setLocale('ko'); off(); i18n.setLocale('en'); assert.equal(calls, 1);
});
test('time formatting normalizes fractions and invalid values', () => {
  for (const [input, expected] of [[61.9,'01:01'],[-1,'00:00'],[NaN,'00:00'],[Infinity,'00:00'],[3600,'60:00']]) assert.equal(utils.formatTime(input), expected);
});
test('fullscreen denied promises are safely consumed', async () => {
  utils.requestFullscreen({ requestFullscreen: () => Promise.reject(Error('denied')) });
  globalThis.document = { exitFullscreen: () => Promise.reject(Error('denied')) };
  utils.exitFullscreen(); await new Promise(resolve => setImmediate(resolve)); delete globalThis.document;
});
test('disabled analytics is silent and does not require DOM', () => {
  const analytics = new Analytics(); analytics.init('G-EXAMPLE'); analytics.init('invalid?id=x');
  analytics.gameStart({ game_id: 'test', game_name: 'Test' });
});
test('2048 starts with two tiles and conserves tile sum on legal moves', () => {
  const game = new Game2048(); game.newGame();
  const tiles = () => game.getState().grid.flat().filter(Boolean);
  assert.equal(tiles().length, 2);
  for (const direction of ['left','up','right','down']) {
    const sum = tiles().reduce((total, tile) => total + tile.value, 0);
    const changed = game.move(direction);
    const delta = tiles().reduce((total, tile) => total + tile.value, 0) - sum;
    assert.ok(changed ? delta === 2 || delta === 4 : delta === 0);
  }
});
test('2048 corrupt high score falls back to zero', () => {
  globalThis.localStorage = { getItem: () => 'not-a-number' };
  assert.equal(new Game2048().getState().bestScore, 0);
  delete globalThis.localStorage;
});
