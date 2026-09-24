import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

test('homepage source matches the approved pre-audit design', () => {
  // Original index.html at 630cf47bca4047b26d0f8ddacdbc5273f9f85d41.
  // Do not update this baseline for game-only work. Homepage redesign needs
  // separate maintainer authorization. Nonvisual link repairs happen in Vite.
  const source = readFileSync(new URL('../index.html', import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'),
    '2c70d9afe1316ffec00a6bc1ffd8f86287e841f591a1e8c2c95192733aec338e',
    'Keep the original homepage design. Limit visual changes to individual game pages.');
});
