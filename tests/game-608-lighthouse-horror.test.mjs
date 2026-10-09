import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/games/horror/game-608-lighthouse-horror/logic.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const logic = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const {
  TAU, MAX_LIVES, OIL_MAX, OIL_DRAIN, OIL_RELIGHT, BARREL_OIL, WIDE_HALF, FOCUS_HALF, DOOR_RADIUS, SPAWN_RADIUS, STATS, KINDS,
  wrap, turnToward, beamHalf, inBeam, speedFactor, nightPlan, pickKind, introducedOn, scoreFor, nightBonus, WatchSim,
} = logic;

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const DT = 1 / 60;

/** Steps the sim and returns every event produced, copied out of the reused array. */
function run(sim, seconds, input) {
  const events = [];
  for (let t = 0; t < seconds; t += DT) events.push(...sim.step(DT, typeof input === 'function' ? input(sim) : input));
  return events;
}

/** A sim that has started night 1, with the natural spawner and flotsam timer frozen so tests can stage scenes. */
function quietNight(seed = 1) {
  const sim = new WatchSim(seeded(seed));
  run(sim, 1.3, { beam: 0, focus: false });
  assert.equal(sim.phase, 'night');
  assert.equal(sim.night, 1);
  sim.spawnTimer = Infinity;
  sim.flotsamTimer = Infinity;
  return sim;
}

test('angles wrap and the beam turns the short way round', () => {
  for (const a of [-10, -Math.PI, 0, 1, Math.PI, 7, 100]) {
    const w = wrap(a);
    assert.ok(w > -Math.PI - 1e-9 && w <= Math.PI + 1e-9, `wrap(${a}) = ${w}`);
    assert.ok(Math.abs(Math.sin(w) - Math.sin(a)) < 1e-9 && Math.abs(Math.cos(w) - Math.cos(a)) < 1e-9);
  }
  // From just below +PI to just above -PI is a tiny step across the seam, not a full sweep back.
  const turned = turnToward(3.1, -3.1, 0.2);
  assert.ok(Math.abs(wrap(turned - -3.1)) < 1e-9, 'reaches the target across the seam');
  assert.ok(Math.abs(turnToward(0, 2, 0.5) - 0.5) < 1e-9, 'turn rate is capped');
  assert.equal(beamHalf(0), WIDE_HALF);
  assert.ok(Math.abs(beamHalf(1) - FOCUS_HALF) < 1e-9);
});

test('beam hits respect the half-angle, the target size, the seam and the range', () => {
  assert.ok(inBeam(0, FOCUS_HALF, 0.05, 15, 0.6));
  assert.ok(!inBeam(0, FOCUS_HALF, 0.4, 15, 0.6), 'outside the focused beam');
  assert.ok(inBeam(0, WIDE_HALF, 0.4, 15, 0.6), 'inside the wide beam');
  assert.ok(!inBeam(0, WIDE_HALF, 0.6, 15, 0.6), 'outside the wide beam');
  assert.ok(inBeam(Math.PI - 0.02, FOCUS_HALF, -Math.PI + 0.02, 15, 0.6), 'works across the +-PI seam');
  assert.ok(inBeam(0, FOCUS_HALF, 0.15, 15, 1.0) && !inBeam(0, FOCUS_HALF, 0.15, 15, 0.1), 'bigger bodies are easier to hit');
  assert.ok(!inBeam(0, WIDE_HALF, 0, 40, 0.6), 'beyond the beam range');
});

test('light slows wraiths, the focused beam slows most, and watchers only move unseen', () => {
  assert.equal(speedFactor('drifter', 0), 1);
  assert.ok(speedFactor('drifter', 1) < 1 && speedFactor('drifter', 1) > 0, 'wide beam slows without stopping');
  for (const kind of ['drifter', 'skitter', 'brute']) assert.ok(speedFactor(kind, 2) < speedFactor(kind, 1));
  assert.equal(speedFactor('watcher', 0), 1);
  assert.equal(speedFactor('watcher', 1), 0);
  assert.equal(speedFactor('watcher', 2), 0);
  assert.equal(speedFactor('watcher', 0, true), 0, 'lightning freezes watchers too');
});

test('nights get longer, faster and introduce one new kind at a time', () => {
  let previous = null;
  for (let n = 1; n <= 12; n++) {
    const plan = nightPlan(n);
    assert.ok(plan.count > 0, 'every night has wraiths');
    for (const kind of KINDS) assert.equal(plan.weights[kind] > 0, n >= STATS[kind].firstNight, `${kind} on night ${n}`);
    if (previous) {
      assert.ok(plan.count > previous.count);
      assert.ok(plan.interval <= previous.interval && plan.speed >= previous.speed && plan.hpScale >= previous.hpScale);
    }
    previous = plan;
  }
  assert.deepEqual([1, 2, 3, 4, 5].map(introducedOn), [null, 'skitter', 'brute', 'watcher', null]);
  const random = seeded(3);
  for (let i = 0; i < 500; i++) assert.ok(['drifter', 'skitter'].includes(pickKind(nightPlan(2), random)));
  assert.ok(scoreFor('brute', 5) > scoreFor('brute', 1) && scoreFor('brute', 1) > scoreFor('drifter', 1));
});

test('the wide beam only slows a wraith; holding the focused beam on it banishes it for points', () => {
  const sim = quietNight();
  const w = sim.spawnWraith('drifter', 0, 18);
  run(sim, 2, { beam: 0, focus: false });
  assert.equal(w.burn, 0, 'wide light does not burn');
  assert.equal(w.light, 1);
  // 2 s at 0.4x speed, minus the first second spent rising out of the water.
  assert.ok(w.dist > 18 - STATS.drifter.speed * 2 * 0.5 && w.dist < 18, `slowed, dist ${w.dist}`);
  assert.ok(sim.wraiths.includes(w));

  const events = run(sim, 1.5, { beam: 0, focus: true });
  const banish = events.find(e => e.type === 'banish');
  assert.ok(banish && banish.wraith === w, 'banished');
  assert.equal(banish.points, scoreFor('drifter', 1));
  assert.equal(sim.score, banish.points);
  assert.equal(sim.banished, 1);
  assert.ok(!sim.wraiths.includes(w));
});

test('a brute needs a longer burn, and burn fades once the beam moves away', () => {
  const sim = quietNight();
  const brute = sim.spawnWraith('brute', 0, 20);
  run(sim, 1, { beam: 0, focus: true });
  assert.ok(sim.wraiths.includes(brute), 'one second is not enough for a brute');
  const burn = brute.burn;
  assert.ok(burn > 0.5);
  run(sim, 1, { beam: Math.PI, focus: false });
  assert.ok(brute.burn < burn, 'burn decays in the dark');
});

test('watchers freeze in the beam and creep in the dark', () => {
  const sim = quietNight();
  const watcher = sim.spawnWraith('watcher', 0, 20);
  run(sim, 2, { beam: 0, focus: false });
  assert.equal(watcher.dist, 20);
  assert.equal(watcher.moving, false);
  run(sim, 2, { beam: Math.PI, focus: false });
  assert.ok(watcher.dist < 20 && watcher.moving);
  const held = watcher.dist;
  run(sim, 1, { beam: Math.PI, focus: false, flash: true });
  assert.equal(watcher.dist, held, 'lightning pins it too');
});

test('a wraith at the door snuffs a lantern, throws the others back, and the third ends the watch', () => {
  const sim = quietNight();
  const near = sim.spawnWraith('drifter', 1.5, 7);
  sim.spawnWraith('drifter', Math.PI, DOOR_RADIUS + 0.05).age = 5;
  let events = run(sim, 0.2, { beam: 0, focus: false });
  assert.equal(events.filter(e => e.type === 'door').length, 1);
  assert.equal(sim.lives, MAX_LIVES - 1);
  assert.ok(near.dist > 10 && near.dist <= SPAWN_RADIUS - 6, 'the flare pushes nearby wraiths back');

  sim.spawnWraith('skitter', Math.PI, DOOR_RADIUS + 0.05).age = 5;
  run(sim, 0.2, { beam: 0, focus: false });
  assert.equal(sim.lives, 1);
  assert.equal(sim.phase, 'night');

  sim.spawnWraith('skitter', Math.PI, DOOR_RADIUS + 0.05).age = 5;
  events = run(sim, 0.2, { beam: 0, focus: false });
  assert.equal(sim.lives, 0);
  assert.equal(sim.phase, 'over');
  assert.ok(events.some(e => e.type === 'over'));
  const score = sim.score;
  assert.equal(sim.step(DT, { beam: 0, focus: true }).length, 0, 'nothing happens after the watch ends');
  assert.equal(sim.score, score);
});

test('focusing drains oil; a dry lamp cannot focus until it has trickled back', () => {
  const sim = quietNight();
  sim.oil = OIL_MAX;
  run(sim, 1, { beam: 0, focus: true });
  assert.ok(Math.abs(sim.oil - (OIL_MAX - OIL_DRAIN)) < 0.5, `drained ${sim.oil}`);
  const events = run(sim, OIL_MAX / OIL_DRAIN, { beam: 0, focus: true });
  assert.ok(events.some(e => e.type === 'empty'), 'warns once the lamp runs dry');
  assert.equal(events.filter(e => e.type === 'empty').length, 1, 'warns only once per press');
  assert.equal(sim.focused, false);
  assert.ok(sim.oil < OIL_RELIGHT);
  run(sim, 0.5, { beam: 0, focus: true });
  assert.equal(sim.focused, false, 'still too dry to relight');
  run(sim, 4, { beam: 0, focus: false });
  assert.ok(sim.oil >= OIL_RELIGHT);
  run(sim, 0.1, { beam: 0, focus: true });
  assert.equal(sim.focused, true);
});

test('holding the focused beam on drifting oil hauls it in and refills the lamp; crates relight a lantern', () => {
  const sim = quietNight();
  sim.oil = 20;
  sim.flotsam.push({ id: 900, kind: 'oil', angle: 0, dist: 12, drift: 0, life: 16, pull: 0, caught: false });
  const wide = run(sim, 1, { beam: 0, focus: false });
  assert.ok(!wide.some(e => e.type === 'caught'), 'the wide beam does not haul');
  let events = run(sim, 0.8, { beam: 0, focus: true });
  assert.ok(events.some(e => e.type === 'caught' && e.item.id === 900));
  const before = sim.oil;
  events = run(sim, 1.5, { beam: Math.PI, focus: false });
  const collect = events.find(e => e.type === 'collect');
  assert.ok(collect && collect.item.id === 900, 'reeled in even after the beam moves on');
  assert.ok(sim.oil > before + BARREL_OIL - 1, `refilled to ${sim.oil}`);
  assert.equal(sim.flotsam.length, 0);

  sim.lives = 1;
  sim.flotsam.push({ id: 901, kind: 'crate', angle: 2, dist: 9, drift: 0, life: 16, pull: 0, caught: false });
  events = run(sim, 2, { beam: 2, focus: true });
  assert.ok(events.some(e => e.type === 'collect' && e.relit));
  assert.equal(sim.lives, 2);

  sim.flotsam.push({ id: 902, kind: 'oil', angle: -2, dist: 12, drift: 0, life: 0.5, pull: 0, caught: false });
  events = run(sim, 1, { beam: 0, focus: false });
  assert.ok(events.some(e => e.type === 'sink' && e.item.id === 902), 'ignored flotsam sinks');
});

test('a keeper who burns every wraith clears night 1 and meets the new kind first on night 2', () => {
  for (const seed of [1, 7, 42, 2026]) {
    const sim = new WatchSim(seeded(seed));
    const aim = s => {
      let target = null;
      for (const w of s.wraiths) if (!target || w.dist < target.dist) target = w;
      return { beam: target ? target.angle : 0, focus: !!target };
    };
    const events = [];
    for (let t = 0; t < 120 && sim.nightsSurvived < 1; t += DT) events.push(...sim.step(DT, aim(sim)));
    assert.equal(sim.nightsSurvived, 1, `seed ${seed} cleared night 1`);
    assert.equal(sim.lives, MAX_LIVES);
    const spawns = events.filter(e => e.type === 'spawn');
    assert.equal(spawns.length, nightPlan(1).count, 'the night spawns its full count');
    assert.ok(spawns.every(e => e.wraith.kind === 'drifter'));
    for (let i = 1; i < spawns.length; i++) {
      assert.ok(Math.abs(wrap(spawns[i].wraith.angle - spawns[i - 1].wraith.angle)) > 0.85, 'risings change quarter');
    }
    const clear = events.find(e => e.type === 'clear');
    assert.equal(clear.bonus, nightBonus(1));
    assert.equal(sim.score, nightPlan(1).count * scoreFor('drifter', 1) + nightBonus(1));
    assert.equal(sim.phase, 'dusk');

    const next = [];
    for (let t = 0; t < 30 && !next.some(e => e.type === 'spawn'); t += DT) next.push(...sim.step(DT, { beam: 0, focus: false }));
    const night = next.find(e => e.type === 'night');
    assert.equal(night.night, 2);
    assert.equal(night.intro, 'skitter');
    assert.equal(next.find(e => e.type === 'spawn').wraith.kind, 'skitter');
  }
});

test('angles stay finite over a long unattended watch', () => {
  const sim = new WatchSim(seeded(11));
  let t = 0;
  while (sim.phase !== 'over' && t < 600) {
    sim.step(DT, { beam: (t * 0.7) % TAU, focus: Math.sin(t) > 0.3 });
    for (const w of sim.wraiths) assert.ok(Number.isFinite(w.angle) && Number.isFinite(w.dist));
    t += DT;
  }
  assert.equal(sim.phase, 'over', 'an idle keeper eventually loses');
});
