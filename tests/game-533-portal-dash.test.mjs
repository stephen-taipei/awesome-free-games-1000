import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/games/runner/game-533-portal-dash/logic.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const logic = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const { TAU, PORTAL_EVERY, TURN_SPEED, PLAYER_HALF_ANGLE, wrap, overlaps, isSolid, createGenerator, nextRow } = logic;

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

test('wrap keeps angles in (-PI, PI]', () => {
  for (const a of [0, 1, -1, 7, -7, 100, -100]) {
    const w = wrap(a);
    assert.ok(w > -Math.PI - 1e-9 && w <= Math.PI + 1e-9);
    assert.ok(Math.abs(Math.sin(w) - Math.sin(a)) < 1e-9 && Math.abs(Math.cos(w) - Math.cos(a)) < 1e-9);
  }
});

test('overlap respects the arc span across the seam', () => {
  assert.equal(overlaps(Math.PI - 0.05, -Math.PI + 0.05, 0.3), true);
  assert.equal(overlaps(0, 1, 0.5), false);
  assert.equal(overlaps(123, 0, TAU), true);
});

test('walls in the player colour are phantoms', () => {
  const arc = { kind: 'arc', angle: 0, span: 1, phase: 1, spin: 0 };
  assert.equal(isSolid(arc, 1), false);
  assert.equal(isSolid(arc, 0), true);
});

test('every generated row leaves a gap the player can reach by steering alone', () => {
  for (const seed of [1, 2, 3, 42, 2026]) {
    const random = seeded(seed);
    const state = createGenerator();
    let previousGap = state.gapAngle;
    let expected = 0;
    for (let i = 0; i < 400; i++) {
      const speed = Math.min(62, 24 + i * 0.1);
      const row = nextRow(state, speed, random);
      const arcs = row.pieces.filter(p => p.kind === 'arc');
      if (row.pieces.some(p => p.kind === 'portal')) { expected = 1 - expected; continue; }
      const ring = arcs.find(a => a.span >= TAU - 1e-6);
      if (ring) { assert.equal(ring.phase, expected, 'closed rings match the phase the last portal gave'); continue; }
      if (arcs.some(a => a.spin)) { previousGap = state.gapAngle; continue; }
      // Some angle inside the reachable window must be free of every static block.
      const window = TURN_SPEED * (row.spacing / speed);
      let free = false;
      for (let k = -40; k <= 40 && !free; k++) {
        const angle = previousGap + (k / 40) * window;
        if (!arcs.some(a => overlaps(angle, a.angle, a.span, PLAYER_HALF_ANGLE))) free = true;
      }
      assert.ok(free, `row ${state.row} (seed ${seed}) has no reachable gap`);
      previousGap = state.gapAngle;
    }
  }
});

test('portals arrive on a fixed cadence and advance the sector', () => {
  const state = createGenerator();
  const random = seeded(7);
  let portals = 0;
  for (let i = 0; i < PORTAL_EVERY * 5; i++) if (nextRow(state, 30, random).pieces.some(p => p.kind === 'portal')) portals++;
  assert.equal(portals, 5);
  assert.equal(state.sector, 6);
});
