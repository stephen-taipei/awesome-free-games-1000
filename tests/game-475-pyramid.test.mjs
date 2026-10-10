import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/games/card/game-475-pyramid/logic.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const L = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

// Same mulberry32 as the kit's `rng`, so deal numbers reproduce the game's deals.
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const card = (rank, suit = 0) => suit * 13 + rank - 1;
/** Builds a state from a 28-entry pyramid (ranks or null) and optional stock/waste ranks. */
function state(pyramidRanks, { stock = [], waste = [], pass = 1 } = {}) {
  const used = new Map();
  const make = rank => { const n = used.get(rank) ?? 0; used.set(rank, n + 1); return card(rank, n % 4); };
  return { pyramid: pyramidRanks.map(r => (r === null ? null : make(r))), stock: stock.map(make), waste: waste.map(make), discard: [], pass, score: 0, moves: 0, streak: 0 };
}
const empty = () => Array(28).fill(null);

test('a seeded deal is a full deck, reproducible, and laid out 28 + 24', () => {
  const a = L.shuffleDeck(seeded(475));
  assert.deepEqual([...a].sort((x, y) => x - y), Array.from({ length: 52 }, (_, i) => i));
  assert.deepEqual(L.shuffleDeck(seeded(475)), a);
  assert.notDeepEqual(L.shuffleDeck(seeded(476)), a);
  const game = L.newGame(a);
  assert.equal(game.pyramid.length, 28);
  assert.equal(game.stock.length, 24);
  assert.equal(game.stock[game.stock.length - 1], a[28], 'the first undealt card is the stock top');
});

test('pyramid geometry: rows, columns and covering cards', () => {
  assert.deepEqual([0, 1, 2, 3, 6, 27].map(L.rowOf), [0, 1, 1, 2, 3, 6]);
  assert.deepEqual(L.coveringSlots(0), [1, 2]);
  assert.deepEqual(L.coveringSlots(4), [7, 8]);
  assert.equal(L.coveringSlots(21), null);
});

test('only uncovered cards are available', () => {
  const game = L.newGame(L.shuffleDeck(seeded(1)));
  assert.deepEqual(L.availableSlots(game), [21, 22, 23, 24, 25, 26, 27]);
  const p = game.pyramid.slice(); p[21] = null;
  assert.equal(L.isAvailable({ ...game, pyramid: p }, 15), false, 'one covering card is still there');
  p[22] = null;
  assert.equal(L.isAvailable({ ...game, pyramid: p }, 15), true);
});

test('pairs must sum to 13 and kings go alone', () => {
  const p = empty(); p[21] = 6; p[22] = 7; p[23] = 13; p[24] = 5; p[25] = 12; p[26] = 1; p[15] = 8;
  const s = state(p);
  assert.equal(L.canPair(s, 21, 22), true);
  assert.equal(L.canPair(s, 21, 24), false, '6 + 5 is not 13');
  assert.equal(L.canPair(s, 25, 26), true, 'Q + A');
  assert.equal(L.canPair(s, 15, 24), false, 'a covered card cannot pair');
  assert.equal(L.canPair(s, 21, 21), false);
  assert.equal(L.canRemoveKing(s, 23), true);
  assert.equal(L.apply(s, { type: 'pair', a: 21, b: 24 }), null);
  const next = L.apply(s, { type: 'pair', a: 21, b: 22 });
  assert.equal(next.pyramid[21], null);
  assert.equal(next.pyramid[22], null);
  assert.equal(next.discard.length, 2);
  assert.equal(next.score, L.PAIR_POINTS);
  assert.equal(L.isAvailable(next, 15), true, 'removing both covers frees the card above');
  assert.equal(s.pyramid[21] !== null, true, 'apply never mutates its input');
});

test('the waste top pairs with the pyramid; streaks grow the score and draws reset them', () => {
  const p = empty(); p[21] = 4; p[22] = 3; p[23] = 13;
  let s = state(p, { stock: [10, 9] });
  s = L.apply(s, { type: 'draw' });
  assert.equal(L.rankOf(L.cardAt(s, L.WASTE)), 9);
  s = L.apply(s, { type: 'pair', a: 21, b: L.WASTE });
  assert.equal(s.waste.length, 0);
  s = L.apply(s, { type: 'king', slot: 23 });
  assert.equal(s.score, L.removalPoints(0) + L.removalPoints(1));
  s = L.apply(s, { type: 'draw' });
  assert.equal(s.streak, 0);
  s = L.apply(s, { type: 'pair', a: 22, b: L.WASTE });
  assert.equal(L.isWon(s), true, 'the bottom row is the whole pyramid here');
});

test('stock and waste: draw, three passes in total, then stuck', () => {
  const p = empty(); p[21] = 2; p[22] = 2;
  let s = state(p, { stock: [5, 6] });
  assert.equal(L.canRedeal(s), false, 'cannot redeal while the stock has cards');
  s = L.apply(s, { type: 'draw' });
  s = L.apply(s, { type: 'draw' });
  assert.equal(L.canDraw(s), false);
  assert.equal(L.redealsLeft(s), 2);
  const order = s.waste.slice();
  s = L.apply(s, { type: 'redeal' });
  assert.equal(s.pass, 2);
  assert.equal(s.waste.length, 0);
  assert.equal(s.stock[s.stock.length - 1], order[0], 'the redealt stock starts with the first card drawn');
  s = L.apply(L.apply(s, { type: 'draw' }), { type: 'draw' });
  s = L.apply(s, { type: 'redeal' });
  assert.equal(L.redealsLeft(s), 0);
  s = L.apply(L.apply(s, { type: 'draw' }), { type: 'draw' });
  assert.equal(L.apply(s, { type: 'redeal' }), null, 'no fourth pass');
  assert.equal(L.hasMoves(s), false);
  assert.equal(L.isStuck(s), true);
});

test('hints prefer removals, then drawing, then redealing', () => {
  const p = empty(); p[21] = 6; p[22] = 7; p[23] = 13;
  assert.deepEqual(L.findHint(state(p, { stock: [1] })), { type: 'king', slot: 23 });
  p[23] = 2;
  assert.deepEqual(L.findHint(state(p, { stock: [1] })), { type: 'pair', a: 21, b: 22 });
  p[22] = 2;
  assert.deepEqual(L.findHint(state(p, { stock: [1] })), { type: 'draw' });
  assert.deepEqual(L.findHint(state(p, { waste: [1] })), { type: 'redeal' });
  assert.equal(L.findHint(state(p, { waste: [1], pass: 3 })), null);
});

test('undo walks back through the session history', () => {
  let session = L.startSession(L.newGame(L.shuffleDeck(seeded(9))));
  const first = session.state;
  assert.equal(L.undo(session), null);
  session = L.play(session, { type: 'draw' });
  session = L.play(session, { type: 'draw' });
  assert.equal(L.play(session, { type: 'pair', a: 0, b: 1 }), null, 'illegal moves are refused');
  assert.equal(session.history.length, 2);
  session = L.undo(session);
  assert.equal(session.state.waste.length, 1);
  session = L.undo(session);
  assert.deepEqual(session.state, first);
});

test('a win scores the clear, redeal and time bonuses', () => {
  const p = empty(); p[21] = 13;
  const won = L.apply(state(p), { type: 'king', slot: 21 });
  const result = L.finalScore(won, 100);
  assert.equal(result.clear, L.CLEAR_BONUS);
  assert.equal(result.redeals, 2 * L.REDEAL_BONUS);
  assert.equal(result.time, L.TIME_BONUS_SECONDS - 100);
  assert.equal(result.total, won.score + result.clear + result.redeals + result.time);
  assert.equal(L.finalScore(state(empty().map((_, i) => (i === 21 ? 2 : null))), 10).total, 0);
});

test('the solver finds real winning lines', () => {
  let wins = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const start = L.newGame(L.shuffleDeck(seeded(seed)));
    const { result, line } = L.solve(start, 5000);
    if (result !== 'win') continue;
    wins++;
    let s = start;
    for (const action of line) { s = L.apply(s, action); assert.ok(s, 'every move in the line is legal'); }
    assert.equal(L.isWon(s), true);
  }
  assert.ok(wins >= 3, `expected several provably winnable deals, got ${wins}`);
});

test('the fallback deals for New deal are provably winnable', () => {
  // The deal numbers must mean the same deals as in the game, so check the copy above against the kit's rng.
  const kit = fs.readFileSync('src/shared/three/kit.ts', 'utf8');
  const rngSource = /export function rng\([\s\S]*?\n\}\n/.exec(kit)[0];
  const rngJs = ts.transpileModule(rngSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const kitRng = new Function(`${rngJs.replace('export ', '')}; return rng;`)();
  for (const seed of [1, 475, 99999]) assert.deepEqual(L.shuffleDeck(kitRng(seed)), L.shuffleDeck(seeded(seed)));

  assert.ok(L.WINNABLE_DEALS.length >= 5);
  for (const deal of L.WINNABLE_DEALS) {
    const start = L.newGame(L.shuffleDeck(seeded(deal)));
    const { result, line } = L.solve(start, 5000);
    assert.equal(result, 'win', `deal #${deal}`);
    let s = start;
    for (const action of line) { s = L.apply(s, action); assert.ok(s, `deal #${deal}: every move in the line is legal`); }
    assert.equal(L.isWon(s), true, `deal #${deal}: the line clears the pyramid`);
  }
});
