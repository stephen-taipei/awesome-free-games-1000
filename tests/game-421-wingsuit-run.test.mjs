import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/games/runner/game-421-wingsuit-run/logic.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const L = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

// The kit's rng (mulberry32), so courses match the game's for the same seed.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const still = { wind: 0, lift: 0 };
const fly = (f, controls, seconds, air = still) => { for (let i = 0; i < Math.round(seconds * 120); i++) L.stepFlight(f, controls, 1 / 120, air); };
const trimmed = () => { const f = L.createFlight(0, 0, 2000, 33, -0.2, 0); fly(f, { pitch: 0, roll: 0 }, 30); return f; };

test('a neutral stick settles into a steady glide of about 5 : 1', () => {
  for (const [v, gamma] of [[20, 0.3], [36, -0.1], [70, -0.9]]) {
    const f = L.createFlight(0, 0, 3000, v, gamma, 0);
    fly(f, { pitch: 0, roll: 0 }, 40);
    assert.ok(Math.abs(f.v - L.TRIM_SPEED) < 2, `settles near trim speed from ${v} m/s (got ${f.v.toFixed(1)})`);
    const ratio = 1 / Math.tan(-f.gamma);
    assert.ok(ratio > 4.5 && ratio < 5.5, `glide ratio ${ratio.toFixed(2)}`);
  }
});

test('lift grows with the square of airspeed, so a fast glider can climb and a slow one cannot', () => {
  const [, high20] = L.liftRange(20);
  const [, high30] = L.liftRange(30);
  assert.ok(Math.abs(high30 / high20 - (30 * 30) / (20 * 20)) < 1e-9, 'below the 5 g limit lift scales with V^2');
  assert.equal(L.liftRange(80)[1], L.LOAD_MAX, 'the structural limit caps it at high speed');
  const pullRate = v => (L.liftRange(v)[1] - L.G) / v;
  assert.ok(pullRate(18) < 0, 'below stall speed even a full pull cannot hold level flight');
  assert.ok(pullRate(45) > 2.5 * pullRate(25), 'pulling at speed bends the path several times faster');
});

test('climbing is possible after a dive: a pull-up turns speed back into height', () => {
  const f = trimmed();
  const start = f.y;
  fly(f, { pitch: -1, roll: 0 }, 3);
  const vDive = f.v;
  let bottom = f.y;
  let peak = -Infinity;
  for (let i = 0; i < 120 * 8; i++) {
    L.stepFlight(f, { pitch: 1, roll: 0 }, 1 / 120, still);
    bottom = Math.min(bottom, f.y);
    peak = Math.max(peak, f.y);
  }
  assert.ok(vDive > 45, `the dive builds speed (${vDive.toFixed(1)} m/s)`);
  const lost = start - bottom;
  const regained = peak - bottom;
  assert.ok(regained > 70, `the zoom climbs ${regained.toFixed(1)} m`);
  assert.ok(regained / lost > 0.55, `it wins back ${(100 * regained / lost).toFixed(0)}% of the height the dive spent`);
  assert.ok(peak < start, 'but never more than the dive spent: no free energy');
});

test('energy (height plus speed) never rises in still air, whatever the stick does', () => {
  const random = rng(5);
  for (let run = 0; run < 20; run++) {
    const f = L.createFlight(0, 0, 3000, 15 + random() * 60, random() * 2 - 1, 0);
    let controls = { pitch: 0, roll: 0 };
    let energy = L.energyHeight(f);
    for (let i = 0; i < 120 * 30; i++) {
      if (i % 40 === 0) controls = { pitch: random() * 2 - 1, roll: random() * 2 - 1 };
      L.stepFlight(f, controls, 1 / 120, still);
      const now = L.energyHeight(f);
      assert.ok(now <= energy + 1e-6, `energy rose by ${(now - energy).toFixed(6)} m (v ${f.v.toFixed(1)})`);
      energy = now;
    }
  }
});

test('a stalled wing drops its nose even at full pull', () => {
  const f = L.createFlight(0, 0, 1000, 14, 0.4, 0);
  const gamma = f.gamma;
  fly(f, { pitch: 1, roll: 0 }, 0.8);
  assert.ok(f.gamma < gamma - 0.3, `nose dropped from ${gamma} to ${f.gamma.toFixed(2)}`);
});

test('banking turns toward the low wing whether pushing or pulling, and the assist levels out', () => {
  for (const pitch of [-1, 0, 1]) {
    const f = trimmed();
    fly(f, { pitch, roll: 1 }, 0.8);
    assert.ok(f.heading > 0.1, `right bank turns right with pitch ${pitch}`);
  }
  const f = trimmed();
  fly(f, { pitch: 0, roll: -1 }, 1);
  assert.ok(f.heading < -0.2);
  fly(f, { pitch: 0, roll: 0 }, 6);
  assert.ok(Math.abs(f.heading) < 0.05 && Math.abs(f.bank) < 0.05, 'with the stick centred the suit levels and lines up with the valley');
});

test('rising air in a thermal adds energy; a straight pass through the core gains real height', () => {
  const course = L.createCourse(3, rng);
  L.ensureCourse(course, 3000);
  const thermal = course.thermals.find(t => t.s > 900);
  const f = L.createFlight(thermal.s - thermal.rs - 20, thermal.x, thermal.top - 90, 28, L.GLIDE_GAMMA, 0);
  const before = L.energyHeight(f);
  while (f.s < thermal.s + thermal.rs + 20) {
    L.stepFlight(f, { pitch: 0, roll: 0 }, 1 / 120, { wind: 0, lift: L.thermalLift(course, f.s, f.x, f.y) });
  }
  const gain = L.energyHeight(f) - before;
  const glideOnly = (2 * thermal.rs + 40) * 0.2;
  assert.ok(gain + glideOnly > 40, `a pass through the core gains ${(gain + glideOnly).toFixed(1)} m over plain gliding`);
  assert.equal(L.thermalLift(course, thermal.s, thermal.x, thermal.top + 1), 0, 'no lift above the column top');
  assert.equal(L.thermalLift(course, thermal.s, thermal.x + thermal.rx + 1, thermal.top - 50), 0, 'none outside the column');
});

test('burst: three charges, one at a time, refilled by unbroken chains of four gates', () => {
  const run = L.createRun(L.createCourse(1, rng));
  const events = [];
  assert.equal(run.charges, L.MAX_CHARGES);
  assert.equal(L.triggerBurst(run, events), true);
  assert.equal(L.triggerBurst(run, events), false, 'no second burst while one is burning');
  L.stepRun(run, { pitch: 0, roll: 0 }, L.BURST_TIME + 0.05, events);
  assert.equal(L.triggerBurst(run, events), true);
  L.stepRun(run, { pitch: 0, roll: 0 }, L.BURST_TIME + 0.05, events);
  assert.equal(L.triggerBurst(run, events), true);
  L.stepRun(run, { pitch: 0, roll: 0 }, L.BURST_TIME + 0.05, events);
  assert.equal(run.charges, 0);
  assert.equal(L.triggerBurst(run, events), false);
  assert.equal(events.filter(e => e.type === 'denied').length, 2);
  // Fly the racing line until a chain of four refills a charge.
  let refilled = false;
  while (!refilled && run.flight.s < 2500) {
    events.length = 0;
    L.stepRun(run, L.autopilot(run.course, run.flight, { mode: 'line' }), 1 / 60, events);
    refilled = events.some(e => e.type === 'charge');
  }
  assert.ok(refilled, 'a chain of four gates refills a charge');
  assert.equal(run.charges, 1);
  assert.equal(run.chain % L.CHAIN_PER_CHARGE, 0);
});

test('the chain multiplier steps up every three gates and caps at x5', () => {
  assert.deepEqual([0, 1, 2, 3, 5, 6, 9, 12, 40].map(L.multiplier), [1, 1, 1, 2, 2, 3, 4, 5, 5]);
  assert.equal(L.multiplier(-3), 1);
});

test('gates: inside the ring passes, outside misses, nothing before the plane; tilted rings face the line', () => {
  const gate = { id: 0, s: 100, x: 0, y: 50, r: 8, dx: 0, dy: 0 };
  assert.equal(L.crossGate(gate, [0, 50, 90], [0, 50, 99]), null);
  assert.equal(L.crossGate(gate, [3, 52, 99], [3, 52, 101]), 'pass');
  assert.equal(L.crossGate(gate, [0, 50 + gate.r - L.PLAYER_RADIUS + 0.1, 99], [0, 50 + gate.r - L.PLAYER_RADIUS + 0.1, 101]), 'miss', 'the rim itself does not count');
  assert.equal(L.crossGate(gate, [30, 50, 99], [30, 50, 101]), 'miss');
  // A ring on a 30 degree climb: crossing along the climb through its centre passes even though s differs.
  const tilted = { id: 1, s: 100, x: 0, y: 50, r: 6, dx: 0, dy: Math.tan(Math.PI / 6) };
  const along = d => [0, 50 + d * Math.sin(Math.PI / 6), 100 + d * Math.cos(Math.PI / 6)];
  assert.equal(L.crossGate(tilted, along(-0.5), along(0.5)), 'pass');
  const { n, u, v } = L.gateBasis(tilted);
  for (const [a, b] of [[n, u], [n, v], [u, v]]) assert.ok(Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) < 1e-12, 'the ring basis is orthogonal');
});

test('the rendered terrain mesh and the collision surface are the same triangles', async () => {
  const THREE = await import(new URL('../src/shared/three/three.module.min.js', import.meta.url).href);
  const course = L.createCourse(9, rng);
  const s0 = 3 * L.CHUNK_LENGTH;
  const geometry = new THREE.PlaneGeometry(1, 1, L.OFFSETS.length - 1, L.ROWS_PER_CHUNK);
  const positions = geometry.getAttribute('position');
  L.chunkLattice(course, s0, L.ROWS_PER_CHUNK, positions.array);
  const index = geometry.getIndex().array;
  const random = rng(4);
  let checked = 0;
  for (let k = 0; k < 400; k++) {
    const s = s0 + random() * L.CHUNK_LENGTH;
    const x = L.centerX(course, s) + (random() * 2 - 1) * 300;
    for (let t = 0; t < index.length; t += 3) {
      const p = [0, 1, 2].map(j => [positions.getX(index[t + j]), positions.getY(index[t + j]), -positions.getZ(index[t + j])]);
      // Barycentric coordinates of (x, s) in the triangle's ground projection.
      const [a, b, c] = p;
      const det = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
      const w1 = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (s - c[2])) / det;
      const w2 = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (s - c[2])) / det;
      const w3 = 1 - w1 - w2;
      if (w1 < -1e-9 || w2 < -1e-9 || w3 < -1e-9) continue;
      const mesh = w1 * a[1] + w2 * b[1] + w3 * c[1];
      assert.ok(Math.abs(mesh - L.surfaceHeight(course, s, x)) < 0.02, `mesh ${mesh} vs surface ${L.surfaceHeight(course, s, x)} at s ${s}, x ${x}`);
      checked++;
      break;
    }
  }
  assert.ok(checked > 390, `${checked} points matched a triangle`);
  // Every face points up.
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map(j => [positions.getX(index[t + j]), positions.getY(index[t + j]), positions.getZ(index[t + j])]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    assert.ok(ny > 0);
  }
});

test('the racing line is clear of the ground, inside the valley floor, and every ring clears the ground', () => {
  for (let seed = 1; seed <= 24; seed++) {
    const course = L.createCourse(seed, rng);
    L.ensureCourse(course, 12000);
    for (let s = -50; s < 12000; s += 4) {
      const x = L.lineX(course, s);
      const clearance = L.lineY(course, s) - L.surfaceHeight(course, s, x);
      assert.ok(clearance > 7, `seed ${seed}: line only ${clearance.toFixed(1)} m above ground at s ${s}`);
      assert.ok(Math.abs(L.swayAt(course, s)) + L.gateRadiusAt(s) < L.halfWidthAt(s) - 5, 'rings stay over the valley floor');
    }
    assert.ok(course.gates.length > 80, 'gates keep coming');
    for (const gate of course.gates) {
      assert.ok(L.gateClearance(course, gate) > 1, `seed ${seed}: ring at s ${gate.s.toFixed(0)} touches the ground`);
      assert.ok(Math.abs(gate.y - L.lineY(course, gate.s)) < 1e-9 && Math.abs(gate.x - L.lineX(course, gate.s)) < 1e-9, 'gates sit on the line');
    }
    // Ridges really block the valley away from their saddle.
    for (const ridge of course.ridges.filter(r => r.s < 11000)) {
      const saddle = L.surfaceHeight(course, ridge.s, L.lineX(course, ridge.s)) - L.floorY(ridge.s);
      const flank = L.surfaceHeight(course, ridge.s, L.lineX(course, ridge.s) + (L.swayAt(course, ridge.s) > 0 ? -1 : 1) * 30) - L.floorY(ridge.s);
      assert.ok(flank > saddle + 5, `seed ${seed}: ridge at ${ridge.s.toFixed(0)} has a saddle (${saddle.toFixed(1)} vs ${flank.toFixed(1)})`);
    }
  }
});

test('a gate sequence is reachable at top speed: the racing line stays inside the flight envelope at V_MAX', () => {
  const V = L.V_MAX;
  const side = L.G * Math.tan(L.BANK_MAX);
  const [push, pull] = L.liftRange(V);
  for (let seed = 1; seed <= 24; seed++) {
    const course = L.createCourse(seed, rng);
    for (let s = 0; s < 12000; s += 3) {
      const x1 = (L.lineX(course, s + 3) - L.lineX(course, s - 3)) / 6;
      const y1 = (L.lineY(course, s + 3) - L.lineY(course, s - 3)) / 6;
      const x2 = (L.lineX(course, s + 6) - 2 * L.lineX(course, s) + L.lineX(course, s - 6)) / 36;
      const y2 = (L.lineY(course, s + 6) - 2 * L.lineY(course, s) + L.lineY(course, s - 6)) / 36;
      const gamma = Math.atan(y1);
      const vs = V * Math.cos(gamma);
      const lateral = vs * vs * x2;
      const vertical = vs * vs * y2;
      const up = vertical / Math.cos(gamma) + L.G * Math.cos(gamma);
      assert.ok(Math.abs(Math.atan(x1)) < L.HEADING_MAX * 0.6, 'heading');
      assert.ok(gamma > L.GAMMA_MIN && gamma < L.GAMMA_MAX, 'climb angle');
      assert.ok(Math.abs(lateral) < side * 0.95, `seed ${seed} s ${s}: needs ${lateral.toFixed(1)} m/s^2 sideways`);
      assert.ok(up < pull * 0.9 && up > push * 0.9, `seed ${seed} s ${s}: needs ${up.toFixed(1)} m/s^2 of lift`);
      assert.ok(Math.hypot(up, lateral) < L.LOAD_MAX, 'combined load');
    }
  }
});

test('a gate sequence is reachable at top speed: an autopilot held at V_MAX in still air threads every gate', () => {
  let gates = 0;
  for (let seed = 1; seed <= 16; seed++) {
    const course = L.createCourse(seed, rng);
    course.thermalCursor = Infinity; // still air: rising air would be a disturbance, not part of the layout
    const run = L.createRun(course);
    run.flight.v = L.V_MAX;
    run.flight.y = L.lineY(course, 0);
    const events = [];
    while (run.flight.s < 6000 && !run.crashed) {
      events.length = 0;
      L.stepRun(run, L.autopilot(course, run.flight, { mode: 'line' }), 1 / 60, events);
      run.flight.v = L.V_MAX;
      const miss = events.find(e => e.type === 'miss');
      assert.equal(miss, undefined, `seed ${seed}: missed the gate at s ${miss?.gate.s.toFixed(0)}`);
    }
    assert.equal(run.crashed, false);
    gates += run.gatesPassed;
  }
  assert.ok(gates > 650, `${gates} gates threaded`);
});

test('no unavoidable terrain collision: a gliding policy that rides thermals survives every course', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const course = L.createCourse(seed * 7919, rng);
    const run = L.createRun(course);
    const events = [];
    let lowest = Infinity;
    while (run.flight.s < 12000 && !run.crashed) {
      events.length = 0;
      L.stepRun(run, L.autopilot(course, run.flight, { mode: 'survive' }), 1 / 30, events);
      lowest = Math.min(lowest, run.agl);
    }
    assert.equal(run.crashed, false, `seed ${seed} crashed at s ${run.flight.s.toFixed(0)}`);
    assert.equal(run.bounces, 0);
    assert.ok(lowest > 20, `seed ${seed}: lowest ${lowest.toFixed(1)} m above ground`);
  }
});

test('the racing line itself can be flown through the hardest segments', () => {
  for (const seed of [2, 11, 2026]) {
    const course = L.createCourse(seed, rng);
    const run = L.createRun(course);
    const events = [];
    while (run.flight.s < 10000 && !run.crashed) { events.length = 0; L.stepRun(run, L.autopilot(course, run.flight, { mode: 'line' }), 1 / 30, events); }
    assert.equal(run.crashed, false, `seed ${seed} crashed at ${run.flight.s.toFixed(0)}`);
    assert.ok(run.gatesPassed / (run.gatesPassed + run.gatesMissed) > 0.9, 'and threads nearly every gate on the way');
    assert.ok(run.score > run.flight.s * 3, 'chains multiply the distance score');
  }
});

test('the warm-up forgives: ground contact in the first 20 s bounces, after that it is a crash', () => {
  const course = L.createCourse(4, rng);
  const run = L.createRun(course);
  const events = [];
  while (!events.some(e => e.type === 'bounce') && run.time < L.GRACE_TIME) L.stepRun(run, { pitch: -1, roll: 0 }, 1 / 60, events);
  assert.ok(events.some(e => e.type === 'bounce'), 'a nose-dive into the valley floor bounces');
  assert.equal(run.crashed, false);
  assert.ok(run.agl > 5 && run.flight.gamma > 0, 'the bounce throws the suit clear and climbing');
  events.length = 0;
  while (!run.crashed && run.time < 120) L.stepRun(run, { pitch: run.time < L.GRACE_TIME ? 0 : -1, roll: 0 }, 1 / 60, events);
  assert.ok(events.some(e => e.type === 'grace-over'));
  assert.equal(run.crashed, true, 'after the warm-up the ground is solid');
  assert.ok(run.time > L.GRACE_TIME);
  const crash = events.find(e => e.type === 'crash');
  assert.equal(crash.wall, false);
  // Steering hard into the side ends on a wall.
  const wallRun = L.createRun(L.createCourse(4, rng));
  wallRun.time = L.GRACE_TIME;
  const wallEvents = [];
  while (!wallRun.crashed && wallRun.time < 80) L.stepRun(wallRun, { pitch: 0, roll: 1 }, 1 / 60, wallEvents);
  assert.equal(wallEvents.find(e => e.type === 'crash')?.wall, true);
});

test('the first segment teaches the rhythm: dive gate, climb gate, then a thermal, with no ridges or wind', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const course = L.createCourse(seed, rng);
    const run = L.createRun(course);
    const [first, second] = course.gates;
    assert.ok(Math.abs(L.lineAgl(course, first.s) - (first.r + 6)) < 0.5, 'the first gate is at the bottom of a dive');
    assert.ok(first.y < run.flight.y - 30 - (first.s - run.flight.s) * 0.2, 'below the plain glide path: it takes a dive');
    assert.ok(second.y - L.floorY(second.s) > first.y - L.floorY(first.s) + 15, 'the second is a climb');
    const thermal = course.thermals[0];
    assert.ok(thermal.s > second.s - 150 && thermal.s < 600, 'a thermal follows the first climb');
    assert.ok(course.ridges.every(r => r.s - r.half > L.FIRST_SEGMENT), 'no ridge in the warm-up');
    for (let s = 0; s < L.FIRST_SEGMENT; s += 10) assert.equal(L.windAt(course, s), 0);
  }
});

test('difficulty rises by segment: tighter gates, narrower valley, flatter floor, wind and ridges', () => {
  let previous = null;
  for (let index = 0; index < 12; index++) {
    const s = L.segmentStart(index) + 400;
    const now = { r: L.gateRadiusAt(s), w: L.halfWidthAt(s), descent: L.descentAt(s), wind: L.maxWindAt(s) };
    if (previous) {
      assert.ok(now.r <= previous.r && now.w <= previous.w && now.descent <= previous.descent && now.wind >= previous.wind, `segment ${index}`);
    }
    previous = now;
  }
  assert.equal(L.segmentInfo(0).ridges, false);
  assert.equal(L.segmentInfo(1).ridges, true);
  assert.equal(L.segmentInfo(1).wind, false);
  assert.equal(L.segmentInfo(2).wind, true);
  assert.ok(L.gateRadiusAt(20000) < L.gateRadiusAt(100) * 0.65);
  // The floor is continuous across segment boundaries.
  for (let index = 1; index < 10; index++) {
    const s = L.segmentStart(index);
    assert.ok(Math.abs(L.floorY(s + 0.01) - L.floorY(s - 0.01)) < 0.01);
  }
  // Crosswind never outruns what crabbing at stall speed can cancel.
  assert.ok(L.maxWindAt(1e6) < L.STALL_SPEED * Math.sin(L.HEADING_MAX) * 0.5);
});

test('courses are reproducible from a seed, whatever order they are queried in', () => {
  const a = L.createCourse(77, rng);
  const b = L.createCourse(77, rng);
  // Query b backwards and terrain-first, a in order.
  for (let s = 6000; s > 0; s -= 500) L.terrainHeight(b, s, 10);
  L.ensureCourse(b, 6000);
  for (let s = 0; s <= 6000; s += 500) L.ensureCourse(a, s);
  assert.deepEqual(a.gates, b.gates);
  assert.deepEqual(a.thermals, b.thermals);
  assert.deepEqual(a.ridges, b.ridges);
  for (let s = 0; s < 6000; s += 37) assert.equal(L.surfaceHeight(a, s, 13), L.surfaceHeight(b, s, 13));
  const other = L.createCourse(78, rng);
  L.ensureCourse(other, 6000);
  assert.notDeepEqual(other.gates.map(g => g.x), a.gates.map(g => g.x));
});

test('scoring: distance times the chain multiplier, doubled while skimming the ground', () => {
  const run = L.createRun(L.createCourse(6, rng));
  const events = [];
  const s = run.flight.s;
  L.stepRun(run, { pitch: 0, roll: 0 }, 1, events);
  assert.ok(Math.abs(run.score - (run.flight.s - s)) < 1e-6, 'one point per metre at x1');
  run.chain = 6;
  const before = run.score;
  const s2 = run.flight.s;
  L.stepRun(run, { pitch: 0, roll: 0 }, 0.5, events);
  assert.ok(Math.abs(run.score - before - 3 * (run.flight.s - s2)) < 1e-6, 'x3 at a chain of six');
});
