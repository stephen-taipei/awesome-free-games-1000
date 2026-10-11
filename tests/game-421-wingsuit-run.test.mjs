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
const trimmed = () => { const f = L.createFlight(0, 0, 2000, L.TRIM_SPEED, L.GLIDE_GAMMA, 0); fly(f, { pitch: 0, roll: 0 }, 30); return f; };

test('a neutral stick settles into a steady glide of about 4.5 : 1, and flying slower glides further', () => {
  for (const [v, gamma] of [[20, 0.3], [36, -0.1], [70, -0.9]]) {
    const f = L.createFlight(0, 0, 3000, v, gamma, 0);
    fly(f, { pitch: 0, roll: 0 }, 40);
    assert.ok(Math.abs(f.v - L.TRIM_SPEED) < 2, `settles near trim speed from ${v} m/s (got ${f.v.toFixed(1)})`);
    const ratio = 1 / Math.tan(-f.gamma);
    assert.ok(ratio > 4.2 && ratio < 4.8, `glide ratio ${ratio.toFixed(2)}`);
  }
  // A light, steady pull slows the suit toward its best glide: hands-off is never the most efficient way to fly.
  let best = 0;
  for (let pitch = 0.05; pitch <= 0.6; pitch += 0.05) {
    const f = trimmed();
    fly(f, { pitch, roll: 0 }, 20);
    const s = f.s, y = f.y;
    fly(f, { pitch, roll: 0 }, 20);
    if (!f.stalled) best = Math.max(best, (f.s - s) / (y - f.y));
  }
  assert.ok(best > 5.2, `best glide ${best.toFixed(2)} : 1 beats the neutral 4.5 : 1`);
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

test('a stalled wing drops its nose even at full pull, and holding a full pull glides worse than letting go', () => {
  const f = L.createFlight(0, 0, 1000, 14, 0.4, 0);
  const gamma = f.gamma;
  fly(f, { pitch: 1, roll: 0 }, 0.8);
  assert.ok(f.stalled, 'below stall speed the wing is stalled');
  assert.ok(f.gamma < gamma - 0.3, `nose dropped from ${gamma} to ${f.gamma.toFixed(2)}`);
  fly(f, { pitch: 0, roll: 0 }, 6);
  assert.ok(!f.stalled && f.v > L.STALL_SPEED + L.STALL_RECOVERY, 'the dive gets the speed back and the wing flies again');
  // Hold a full pull from a trimmed glide: it ends in a cycle of stalls and dives that wastes height.
  const held = trimmed();
  const s0 = held.s, y0 = held.y;
  let stalls = 0, wasStalled = false;
  for (let i = 0; i < 120 * 60; i++) {
    L.stepFlight(held, { pitch: 1, roll: 0 }, 1 / 120, still);
    if (held.stalled && !wasStalled) stalls++;
    wasStalled = held.stalled;
  }
  const ratio = (held.s - s0) / (y0 - held.y);
  assert.ok(stalls >= 5, `${stalls} stalls in a minute`);
  assert.ok(ratio < 3.6, `holding full pull glides only ${ratio.toFixed(2)} : 1`);
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
  fly(f, { pitch: 0, roll: 0 }, 8);
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
    // 16 km reaches past segment 15, where the difficulty tables stop: the hardest course is still flyable.
    while (run.flight.s < 16000 && !run.crashed) {
      events.length = 0;
      L.stepRun(run, L.autopilot(course, run.flight, { mode: 'survive' }), 1 / 30, events);
      lowest = Math.min(lowest, run.agl);
    }
    assert.equal(run.crashed, false, `seed ${seed} crashed at s ${run.flight.s.toFixed(0)}`);
    assert.ok(run.segment >= L.SEGMENT_COUNT, `seed ${seed} reached segment ${run.segment + 1}`);
    assert.equal(run.bounces, 0);
    assert.ok(lowest > 15, `seed ${seed}: lowest ${lowest.toFixed(1)} m above ground`);
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
  for (let index = 0; index < L.SEGMENT_COUNT + 3; index++) {
    const s = L.segmentStart(index) + 400;
    const now = { r: L.gateRadiusAt(s), w: L.halfWidthAt(s), descent: L.descentAt(s), wind: L.maxWindAt(s), gust: L.gustAt(s) };
    if (previous) {
      assert.ok(now.r <= previous.r && now.w <= previous.w && now.descent <= previous.descent && now.wind >= previous.wind && now.gust >= previous.gust, `segment ${index}`);
      // Past segment 9 it keeps tightening every segment until the tables stop.
      if (index >= 9 && index < L.SEGMENT_COUNT) assert.ok(now.r < previous.r && now.wind > previous.wind && now.gust > previous.gust, `segment ${index + 1} still gets harder`);
      if (index >= L.SEGMENT_COUNT) assert.deepEqual(now, previous, 'then it holds at the ceiling');
    }
    previous = now;
  }
  // Every new segment's toast names what changed, and the last step announces the top difficulty.
  for (let index = 1; index < L.SEGMENT_COUNT; index++) assert.notEqual(L.segmentNews(index), null, `segment ${index + 1} has news`);
  assert.equal(L.segmentNews(1), 'ridges');
  assert.equal(L.segmentNews(2), 'wind');
  assert.equal(L.segmentNews(L.SEGMENT_COUNT - 1), 'top');
  assert.equal(L.segmentNews(L.SEGMENT_COUNT + 2), null);
  // Deep in the canyon the ridges are higher and wider, with narrower saddles.
  const course = L.createCourse(12, rng);
  L.ensureCourse(course, 16000);
  const ridges = (a, b) => course.ridges.filter(r => r.s > L.segmentStart(a) && r.s < L.segmentStart(b));
  const mean = (list, f) => list.reduce((sum, r) => sum + f(r), 0) / list.length;
  const early = ridges(3, 7), late = ridges(12, 16);
  assert.ok(mean(late, r => r.height) > mean(early, r => r.height) + 10, 'higher ridges');
  assert.ok(mean(late, r => r.half) > mean(early, r => r.half) + 10, 'wider ridges');
  assert.ok(mean(late, r => r.notchWidth) < mean(early, r => r.notchWidth) - 2, 'narrower saddles');
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
  for (let s = 0; s < 20000; s += 7) assert.ok(Math.abs(L.windAt(course, s)) <= L.maxWindAt(s) + 1e-9, 'gusts never exceed the segment\'s wind');
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

// ---------------------------------------------------------------------------------------------------------
// Balance and telegraphs

/** Flies a run with `policy(run, course, memory)` at 60 Hz until it crashes or `maxTime` passes. */
function flyRun(seed, policy, maxTime = 400) {
  const course = L.createCourse(seed, rng);
  const run = L.createRun(course);
  const events = [];
  const memory = { history: [] };
  while (!run.crashed && run.time < maxTime) {
    events.length = 0;
    L.stepRun(run, policy(run, course, memory), 1 / 60, events);
  }
  return run;
}

const handsOff = () => ({ pitch: 0, roll: 0 });

/**
 * A sloppy ring chaser on a keyboard: full on/off keys aimed at the next ring, seeing the world `lag` seconds
 * late, no thermal hunting, no burst. It knows nothing about the ground except the HUD: once "Pull up!" has
 * been showing for `reaction` seconds it pulls until the warning clears.
 */
const sloppy = (reaction = 0.3, lag = 0.25) => (run, course, m) => {
  const f = run.flight;
  m.history.push({ s: f.s, x: f.x, y: f.y, gamma: f.gamma, heading: f.heading, v: f.v });
  if (m.history.length > 60) m.history.shift();
  const seen = m.history[Math.max(0, m.history.length - 1 - Math.round(lag * 60))];
  m.warning ??= L.createWarning();
  m.clock = (m.clock ?? 0) + 1 / 60;
  if (m.clock >= 0.05) {
    if (L.updateWarning(m.warning, run, m.last ?? { pitch: 0, roll: 0 }, m.clock) === 'pull') m.since ??= run.time;
    else m.since = null;
    m.clock = 0;
  }
  let pitch = 0, roll = 0;
  const gate = course.gates[run.nextGate];
  if (gate) {
    const ds = Math.max(5, gate.s - seen.s);
    const climb = Math.atan((gate.y - seen.y) / ds), turn = Math.atan((gate.x - seen.x) / ds);
    pitch = seen.gamma < climb - 0.06 ? 1 : seen.gamma > climb + 0.06 ? -1 : 0;
    roll = seen.heading < turn - 0.06 ? 1 : seen.heading > turn + 0.06 ? -1 : 0;
  }
  if (seen.v < 21 && pitch > 0) pitch = 0;
  if (m.since != null && run.time - m.since >= reaction) { pitch = 1; roll = 0; }
  m.last = { pitch, roll };
  return m.last;
};

test('hands-off flight does not last: a neutral stick runs out of height within about a minute after the warm-up', () => {
  const times = [];
  for (let seed = 1; seed <= 8; seed++) {
    const run = flyRun(seed, handsOff);
    assert.ok(run.crashed, `seed ${seed}: the hands-off glide ends`);
    times.push(run.time);
    // Holding a full pull is no better: the stalls eat the height even sooner.
    const pulled = flyRun(seed, () => ({ pitch: 1, roll: 0 }));
    assert.ok(pulled.crashed && pulled.time < 45, `seed ${seed}: holding a full pull lasts ${pulled.time.toFixed(0)} s`);
  }
  times.sort((a, b) => a - b);
  assert.ok(times[4] < 90, `median hands-off flight ${times[4].toFixed(0)} s`);
  assert.ok(times[7] < 160, `longest hands-off flight ${times[7].toFixed(0)} s`);
  // In every segment the floor falls more slowly than the neutral glide sinks: no free ride on the descent.
  for (let index = 0; index < L.SEGMENT_COUNT; index++) assert.ok(L.descentAt(L.segmentStart(index) + 400) < -Math.tan(L.GLIDE_GAMMA) - 0.02, `segment ${index + 1}`);
});

test('a sloppy ring chaser who answers the warning outlasts and outscores the hands-off run on every course', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const passive = flyRun(seed, handsOff);
    const chaser = flyRun(seed, sloppy(0.35));
    assert.ok(chaser.time > passive.time * 1.3, `seed ${seed}: ${chaser.time.toFixed(0)} s vs ${passive.time.toFixed(0)} s hands-off`);
    assert.ok(chaser.score > passive.score * 1.3, `seed ${seed}: ${Math.floor(chaser.score)} vs ${Math.floor(passive.score)} hands-off`);
    assert.ok(chaser.gatesPassed > 8, `seed ${seed}: threads ${chaser.gatesPassed} rings`);
  }
});

test('"Pull up!" comes early enough to act on: a full pull 0.3 s after it shows clears the ground', () => {
  const DT = 1 / 60;
  let dives = 0, saved = 0;
  const leads = [];
  for (let seed = 1; seed <= 10; seed++) {
    for (const start of [24, 45, 70]) {
      // Fly the racing line to the start, then push over and keep pushing.
      const course = L.createCourse(seed, rng);
      const base = L.createRun(course);
      const events = [];
      while (base.time < start) { events.length = 0; L.stepRun(base, L.autopilot(course, base.flight, { mode: 'line' }), DT, events); }
      for (const push of [1, 0.5]) {
        for (const reaction of [null, 0.3]) {
          const run = { ...base, flight: { ...base.flight }, air: { ...base.air } };
          const warning = L.createWarning();
          let warnedAt = null, clock = 0, t = 0;
          while (!run.crashed && t < 20 && !(warnedAt !== null && reaction !== null && t > warnedAt + reaction + 4)) {
            const controls = warnedAt !== null && reaction !== null && t >= warnedAt + reaction ? { pitch: 1, roll: 0 } : { pitch: -push, roll: 0 };
            clock += DT;
            if (clock >= 0.05) { if (L.updateWarning(warning, run, controls, clock) === 'pull') warnedAt ??= t; clock = 0; }
            events.length = 0;
            L.stepRun(run, controls, DT, events);
            t += DT;
          }
          if (reaction === null) {
            assert.ok(run.crashed && warnedAt !== null, `seed ${seed} t ${start}: the dive is warned before it hits`);
            leads.push(t - warnedAt);
          } else {
            dives++;
            if (!run.crashed) saved++;
          }
        }
      }
    }
  }
  leads.sort((a, b) => a - b);
  assert.ok(leads[0] > 0.8, `the warning shows at least ${leads[0].toFixed(2)} s before impact`);
  assert.ok(leads[leads.length >> 1] > 1, `median lead ${leads[leads.length >> 1].toFixed(2)} s`);
  assert.ok(saved / dives >= 0.9, `${saved}/${dives} dives saved by pulling 0.3 s after the warning`);
});

test('the warning does not flicker and does not nag level skimming', () => {
  // Skimming level a few metres over the warm-up's flat floor (a ridge-free stretch) is not a warning.
  const course = L.createCourse(5, rng);
  const run = L.createRun(course);
  run.time = L.GRACE_TIME;
  const s = 300;
  const x = L.centerX(course, s);
  run.flight = L.createFlight(s, x, L.surfaceHeight(course, s, x) + 5, 40, -Math.atan(L.descentAt(s)), L.courseHeading(course, s));
  run.agl = 5;
  const warning = L.createWarning();
  assert.equal(L.updateWarning(warning, run, { pitch: 0.2, roll: 0 }, 0.05), null, 'level at 5 m: no warning');
  // Random stick work over many runs: once on, a warning stays on for at least WARN_HOLD.
  const random = rng(8);
  let periods = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const r = L.createRun(L.createCourse(seed, rng));
    const w = L.createWarning();
    const events = [];
    let controls = { pitch: 0, roll: 0 }, onSince = null, clock = 0;
    while (!r.crashed && r.time < 90) {
      if (Math.floor(r.time * 60) % 30 === 0) controls = { pitch: random() * 2 - 1.1, roll: random() * 2 - 1 };
      clock += 1 / 60;
      if (clock >= 0.05) {
        const level = L.updateWarning(w, r, controls, clock);
        clock = 0;
        if (level && onSince === null) onSince = r.time;
        if (!level && onSince !== null) { assert.ok(r.time - onSince >= L.WARN_HOLD - 1e-9, `on for only ${(r.time - onSince).toFixed(2)} s`); onSince = null; periods++; }
      }
      events.length = 0;
      L.stepRun(r, controls, 1 / 60, events);
    }
  }
  assert.ok(periods > 5, `${periods} warnings checked`);
});

test('a broken chain is reported as a miss, never as a multiplier event', () => {
  const course = L.createCourse(5, rng);
  const run = L.createRun(course);
  const events = [];
  while (run.chain < 4) { events.length = 0; L.stepRun(run, L.autopilot(course, run.flight, { mode: 'line' }), 1 / 60, events); }
  // Now fly 25 m above the line, so the next ring passes underneath.
  run.flight.y += 25;
  let missStep = null;
  while (!missStep && !run.crashed) {
    events.length = 0;
    L.stepRun(run, { pitch: 0, roll: 0 }, 1 / 60, events);
    if (events.some(e => e.type === 'miss')) missStep = [...events];
  }
  assert.ok(missStep, 'the ring was missed');
  assert.equal(missStep.find(e => e.type === 'miss').chain, 4, 'the miss carries the chain it broke');
  assert.equal(missStep.some(e => e.type === 'mult'), false, 'no multiplier fanfare for a broken chain');
  assert.equal(run.chain, 0);
  // A warm-up bounce resets the chain the same way.
  const bounceRun = L.createRun(L.createCourse(4, rng));
  bounceRun.chain = 5;
  const bounceEvents = [];
  while (!bounceEvents.some(e => e.type === 'bounce')) L.stepRun(bounceRun, { pitch: -1, roll: 0 }, 1 / 60, bounceEvents);
  assert.equal(bounceEvents.find(e => e.type === 'bounce').chain, 5);
  assert.equal(bounceEvents.some(e => e.type === 'mult'), false);
});

test('the crash cause names what was hit: the wall, a ridge flank or the valley floor', () => {
  const course = L.createCourse(9, rng);
  L.ensureCourse(course, 6000);
  const ridge = course.ridges.find(r => r.s > 1500);
  const flankX = L.lineX(course, ridge.s) + (L.swayAt(course, ridge.s) > 0 ? -1 : 1) * 30;
  assert.equal(L.crashCause(course, ridge.s, flankX), 'ridge');
  // The foot of a ridge, where it barely raises the ground, is the floor.
  assert.equal(L.crashCause(course, ridge.s - ridge.half * 0.97, L.centerX(course, ridge.s - ridge.half * 0.97)), 'ground');
  const between = (ridge.s + ridge.half + course.ridges[course.ridges.indexOf(ridge) + 1].s - course.ridges[course.ridges.indexOf(ridge) + 1].half) / 2;
  assert.equal(L.crashCause(course, between, L.centerX(course, between)), 'ground');
  assert.equal(L.crashCause(course, between, L.centerX(course, between) + L.halfWidthAt(between) + 3), 'wall');
  // And the run reports it: diving straight down onto the floor is a ground crash, wherever it happens.
  const run = L.createRun(L.createCourse(9, rng));
  run.time = L.GRACE_TIME;
  const events = [];
  while (!run.crashed) L.stepRun(run, { pitch: -1, roll: 0 }, 1 / 60, events);
  const crash = events.find(e => e.type === 'crash');
  assert.equal(crash.cause, L.crashCause(run.course, run.flight.s, run.flight.x));
});
