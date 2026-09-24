import test from 'node:test';
import assert from 'node:assert/strict';
import { readIds, saveIds } from '../src/portal/preferences.mjs';
const first = 'puzzle/game-001-first';
const second = 'arcade/game-001-second';
test('external storage clear does not resurrect successful writes', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  saveIds('external-clear', [first]); store.clear();
  assert.deepEqual(readIds('external-clear'), []);
  delete globalThis.localStorage;
});
test('quota failure keeps session changes ahead of stale persisted data', () => {
  globalThis.localStorage = { getItem: () => JSON.stringify([first]), setItem() { throw Error('quota'); } };
  saveIds('quota', [second]);
  assert.deepEqual(readIds('quota'), [second]);
  delete globalThis.localStorage;
});
