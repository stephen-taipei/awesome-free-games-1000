import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/games/action/game-324-wind-ninja/logic.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const logic = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const {
  TAU, HEX, EDGE_MARGIN, MAX_DASH, MIN_DASH, CUT_R, PLAYER_R, MAX_CHARGES, CHARGE_TIME, SLOW, FOCUS_MAX, MAX_HEARTS, COMBO_TIME,
  COMBO_MIN_TIME, MAX_COMBO, SHIELD_HALF_ARC, BLAST_R, STATS, KINDS, CAMPAIGN_WAVES, AIM_LOCK, SPAWN_TIME, INTRODUCED, ARCHER_COOLDOWN,
  STAGGER_TIME, LUNGE_OVERREACH, REPOSITION_TIME, MAX_SPEED, ARENAS, hexAt, hexCenter, hexKey, walkable, clipDash, hitAlong,
  segmentDistance, shieldBlocks, wavePlan, arenaForWave, healsAfter, comboWindow, lungeLength, keyboardTarget, Sim,
} = logic;

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const DT = 1 / 60;
const IDLE = { aiming: false };

/** Steps the sim and returns every event produced, copied out of the reused array. */
function run(sim, seconds, input = IDLE) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) events.push(...sim.step(DT, typeof input === 'function' ? input(sim) : input));
  return events;
}

/** A sim in the fight phase of wave 1 with the natural spawner emptied, so a test can stage a scene. */
function arena(seed = 1, options = {}) {
  const sim = new Sim(seed, options);
  sim.queue = [];
  sim.holdWave = true;
  run(sim, 1.7);
  assert.equal(sim.phase, 'fight');
  return sim;
}

/** Places a foe that has already landed, facing `facing` (default: towards the player). */
function place(sim, kind, x, z, facing) {
  const e = sim.spawnEnemy(kind, x, z, true);
  if (facing !== undefined) e.facing = facing;
  return e;
}

const dash = (sim, x, z) => sim.step(DT, { aiming: false, dash: { x, z } });

/**
 * A simple, reflex-perfect but careless player: every 0.25 s it dashes along the line that cuts the most,
 * flanks shield-bearers it cannot cut from where it stands, and never dodges or uses slow motion.
 */
function bot(random) {
  let wait = 0;
  return sim => {
    wait -= DT;
    if (sim.phase === 'travel' || sim.phase === 'dead' || wait > 0 || sim.charges < 1) return IDLE;
    const p = sim.player;
    let best = null;
    const consider = (x, z, bonus) => {
      const plan = sim.planDash(x, z);
      if (!plan.valid || plan.blocked) return;
      const value = (plan.cuts.length + plan.chain.length) * 10 + plan.arrows.length * 4 + bonus;
      if (plan.cuts.length + plan.arrows.length > 0 && (!best || value > best.value)) best = { x, z, value };
    };
    for (const e of sim.enemies) {
      if (e.state === 'spawn') continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
      consider(e.x + (dx / d) * 0.6, e.z + (dz / d) * 0.6, -d * 0.3);
    }
    for (const a of sim.arrows) {
      const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz) || 1;
      if (d < 3) consider(a.x + (dx / d) * 0.5, a.z + (dz / d) * 0.5, 5);
    }
    wait = 0.25;
    if (best) return { aiming: false, dash: { x: best.x, z: best.z } };
    const targets = sim.enemies.filter(e => e.state !== 'spawn');
    if (!targets.length) return IDLE;
    targets.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
    const e = targets[0];
    for (const side of [1.9, -1.9, Math.PI, 0]) {
      const a = e.facing + side;
      const o = side === 0 ? { x: e.x, z: e.z } : { x: e.x + Math.cos(a) * 2.2, z: e.z + Math.sin(a) * 2.2 };
      const plan = sim.planDash(o.x, o.z);
      if (plan.valid && !plan.blocked && plan.length > 0.8) return { aiming: false, dash: o };
    }
    const a = random() * TAU;
    return { aiming: false, dash: { x: p.x + Math.cos(a) * 3, z: p.z + Math.sin(a) * 3 } };
  };
}

// ---------------------------------------------------------------- geometry

test('hex tiles round-trip between axial and world coordinates', () => {
  for (let q = -6; q <= 6; q++) {
    for (let r = -6; r <= 6; r++) {
      const c = hexCenter(q, r);
      assert.deepEqual(hexAt(c.x, c.z), [q, r]);
      // A point well inside the tile, towards a corner, still belongs to it.
      assert.deepEqual(hexAt(c.x + HEX * 0.8, c.z), [q, r]);
    }
  }
});

test('every island tile is walkable, the void and the rim pillars are not', () => {
  for (const a of ARENAS) {
    assert.ok(a.tiles.length >= 40, `arena ${a.index} is big enough`);
    for (const tile of a.tiles) assert.ok(walkable(a, tile.x, tile.z, 0), `tile ${tile.q},${tile.r}`);
    for (const wall of a.walls) assert.equal(walkable(a, wall.x, wall.z, 0), false, 'pillars are walls');
    assert.ok(walkable(a, a.start.x, a.start.z), 'the player starts on solid ground');
    assert.equal(walkable(a, a.bounds.maxX + 1, 0), false);
    // Rim tiles: their centre is walkable, but not the far side of the edge that faces the void.
    const rim = a.tiles.find(tile => tile.rim);
    assert.ok(rim);
  }
  // The ring island has a chasm in the middle.
  assert.equal(walkable(ARENAS[2], 0, 0, 0), false);
  assert.equal(walkable(ARENAS[0], 0, 0), true);
});

test('a dash never leaves the island: it stops short of the void, the chasm and the pillars', () => {
  const random = seeded(5);
  for (const a of ARENAS) {
    let clippedCount = 0;
    for (let i = 0; i < 1500; i++) {
      const tile = a.tiles[Math.floor(random() * a.tiles.length)];
      const x = tile.x + (random() - 0.5) * HEX, z = tile.z + (random() - 0.5) * HEX;
      if (!walkable(a, x, z)) continue;
      const angle = random() * TAU;
      const dx = Math.cos(angle), dz = Math.sin(angle);
      const want = MAX_DASH * (0.2 + random() * 0.8);
      const len = clipDash(a, x, z, dx, dz, want);
      assert.ok(len >= 0 && len <= want + 1e-9);
      // Every point of the dash keeps the body on the island (a hair of sampling tolerance).
      for (let s = 0; s <= len; s += 0.01) {
        assert.ok(walkable(a, x + dx * s, z + dz * s, EDGE_MARGIN - 0.02), `arena ${a.index}: dash leaves the island at ${s.toFixed(2)} of ${len.toFixed(2)}`);
      }
      assert.ok(walkable(a, x + dx * len, z + dz * len, EDGE_MARGIN - 1e-6), 'the landing point is on the island');
      if (len < want - 1e-6) {
        clippedCount++;
        // It stops at the edge, not early: just past the landing point the body would be over the edge.
        let blocked = false;
        for (let s = len + 0.005; s <= len + 0.06 && !blocked; s += 0.005) blocked = !walkable(a, x + dx * s, z + dz * s);
        assert.ok(blocked, 'a clipped dash goes as far as it can');
      }
    }
    assert.ok(clippedCount > 50, `arena ${a.index}: the test exercised the edges (${clippedCount})`);
  }
});

test('a dash cannot jump the chasm of the ring island', () => {
  const a = ARENAS[2];
  // From the south side of the ring straight north across the middle.
  const len = clipDash(a, 0, 3.1, 0, -1, MAX_DASH);
  assert.ok(len < 1.5, `stops at the chasm (${len})`);
  assert.equal(clipDash(a, 0, 0, 1, 0, 3), 0, 'no dash starts in the void');
});

test('segment-vs-circle: bodies on the line are cut, bodies behind the start or past the end are not', () => {
  // Straight on, beside the line, and just out of reach.
  assert.ok(Math.abs(hitAlong(0, 0, 1, 0, 5, 3, 0, 0.5) - 2.5) < 1e-9);
  assert.ok(hitAlong(0, 0, 1, 0, 5, 3, 0.49, 0.5) >= 0);
  assert.equal(hitAlong(0, 0, 1, 0, 5, 3, 0.51, 0.5), -1);
  // Behind the start: dashing away from a foe never cuts it.
  assert.equal(hitAlong(0, 0, 1, 0, 5, -0.2, 0, 0.8), -1);
  // Past the end: only if the blade's tip reaches the body.
  assert.ok(hitAlong(0, 0, 1, 0, 5, 5.4, 0, 0.5) >= 0);
  assert.equal(hitAlong(0, 0, 1, 0, 5, 5.6, 0, 0.5), -1);
  assert.ok(Math.abs(segmentDistance(0, 0, 4, 0, 2, 3) - 3) < 1e-9);
  assert.ok(Math.abs(segmentDistance(0, 0, 4, 0, 7, 4) - 5) < 1e-9);
});

test('shield-bearers block cuts from the front only', () => {
  const facing = 0.3; // faces roughly +x
  const from = angle => [Math.cos(angle), Math.sin(angle)];
  // A dash that travels against the facing meets the shield head on.
  assert.equal(shieldBlocks(facing, ...from(facing + Math.PI)), true, 'straight on');
  assert.equal(shieldBlocks(facing, ...from(facing + Math.PI + SHIELD_HALF_ARC - 0.02)), true, 'just inside the arc');
  assert.equal(shieldBlocks(facing, ...from(facing + Math.PI + SHIELD_HALF_ARC + 0.02)), false, 'just outside the arc');
  assert.equal(shieldBlocks(facing, ...from(facing + Math.PI / 2)), false, 'from the side');
  assert.equal(shieldBlocks(facing, ...from(facing - Math.PI / 2)), false, 'from the other side');
  assert.equal(shieldBlocks(facing, ...from(facing)), false, 'from behind');
});

// ---------------------------------------------------------------- dashes

test('a dash goes where it is aimed, capped at its maximum length; short aims cancel for free', () => {
  const sim = arena();
  const { x, z } = sim.player;
  let events = dash(sim, x + 2, z);
  assert.ok(events.some(e => e.type === 'dash'));
  assert.ok(Math.abs(sim.player.x - (x + 2)) < 1e-9 && Math.abs(sim.player.z - z) < 1e-9);
  assert.equal(sim.charges, MAX_CHARGES - 1);
  const before = { ...sim.player };
  events = dash(sim, before.x - 0.2, before.z);
  assert.ok(events.some(e => e.type === 'cancel'));
  assert.equal(sim.charges, MAX_CHARGES - 1, 'a cancel costs nothing');
  const plan = sim.planDash(before.x - 50, before.z);
  assert.ok(plan.want <= MAX_DASH + 1e-9 && plan.length <= MAX_DASH + 1e-9);
  assert.ok(walkable(sim.arena, plan.toX, plan.toZ, EDGE_MARGIN - 1e-6));
  // Aiming straight off the edge from the rim is a free cancel, not a wasted charge.
  sim.player.x = 0; sim.player.z = 0;
  const far = sim.arena.tiles.reduce((a, b) => (Math.hypot(b.x, b.z) > Math.hypot(a.x, a.z) ? b : a));
  const len = clipDash(sim.arena, 0, 0, far.x / Math.hypot(far.x, far.z), far.z / Math.hypot(far.x, far.z), 30);
  sim.player.x = (far.x / Math.hypot(far.x, far.z)) * len;
  sim.player.z = (far.z / Math.hypot(far.x, far.z)) * len;
  const edge = sim.planDash(sim.player.x * 3, sim.player.z * 3);
  assert.equal(edge.valid, false);
});

test('one dash cuts every foe on its line and refunds its charge', () => {
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  const a = place(sim, 'grunt', 1.5, 0);
  const b = place(sim, 'grunt', 3.0, 0.3);
  const c = place(sim, 'archer', 4.5, -0.2);
  const off = place(sim, 'grunt', 3, 2.5);
  const charges = sim.charges;
  const events = dash(sim, 5, 0);
  const kills = events.filter(e => e.type === 'kill').map(e => e.id);
  assert.deepEqual(kills, [a.id, b.id, c.id]);
  assert.ok(!kills.includes(off.id));
  assert.equal(sim.charges, charges, 'a dash that kills refunds its charge');
  assert.equal(sim.combo, 3, 'three kills raise the multiplier by two');
  assert.equal(sim.score, STATS.grunt.score * 2 + STATS.archer.score, 'cuts in the dash score at the multiplier it started with');
});

test('a shield-bearer stops a cut from the front and dies to one from the side or behind', () => {
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  const shield = place(sim, 'shield', 3, 0, Math.PI); // faces the player
  const before = sim.charges;
  let events = dash(sim, 5, 0);
  assert.ok(events.some(e => e.type === 'clang'));
  assert.ok(!events.some(e => e.type === 'kill'));
  assert.equal(shield.state, 'move');
  assert.ok(sim.player.x < 3 - STATS.shield.r - PLAYER_R + 0.05, 'the player stops at the shield');
  assert.equal(sim.charges, before - 1, 'a blocked dash costs its charge');
  // From the side.
  sim.player.x = 3; sim.player.z = -2.5;
  events = dash(sim, 3, 1);
  assert.ok(events.some(e => e.type === 'kill' && e.id === shield.id));
  // From behind.
  const back = place(sim, 'shield', 0, 0, 0); // faces +x
  sim.player.x = -2.5; sim.player.z = 0;
  events = dash(sim, 1.5, 0);
  assert.ok(events.some(e => e.type === 'kill' && e.id === back.id));
});

test('a blocked dash spares foes behind the shield but cuts those before it', () => {
  const sim = arena();
  sim.player.x = -3; sim.player.z = 0;
  const near = place(sim, 'grunt', -1.5, 0);
  place(sim, 'shield', 0.5, 0, Math.PI);
  const behind = place(sim, 'grunt', 2, 0);
  const events = dash(sim, 2.4, 0);
  const kills = events.filter(e => e.type === 'kill').map(e => e.id);
  assert.deepEqual(kills, [near.id]);
  assert.notEqual(behind.state, 'dead');
});

test('a cut bomber explodes and the blast chains through other bombers', () => {
  const sim = arena();
  sim.player.x = -3; sim.player.z = 0;
  const first = place(sim, 'bomber', -1, 0);
  const second = place(sim, 'bomber', 0.8, 1.2);
  const third = place(sim, 'bomber', 2.6, 2.2);
  const shield = place(sim, 'shield', 4.2, 2.6, Math.PI); // a blast ignores shields
  const outside = place(sim, 'grunt', -1, -BLAST_R - 1);
  const hearts = sim.hearts;
  const plan = sim.planDash(0, 0);
  assert.deepEqual(plan.cuts.map(e => e.id), [first.id]);
  assert.deepEqual(new Set(plan.chain.map(e => e.id)), new Set([second.id, third.id, shield.id]), 'the preview shows the whole chain');
  const events = dash(sim, 0, 0);
  const explosions = events.filter(e => e.type === 'explode');
  assert.deepEqual(explosions.map(e => e.depth), [0, 1, 2]);
  assert.ok(explosions.every(e => !e.harmful));
  assert.deepEqual(new Set(events.filter(e => e.type === 'kill').map(e => e.id)), new Set([first.id, second.id, third.id, shield.id]));
  assert.equal(outside.state, 'move');
  assert.equal(sim.hearts, hearts, 'your own cuts never hurt you');
  assert.equal(sim.combo, 4);
  assert.equal(sim.bestCut, 4);
});

test('a lit fuse that finishes hurts the player inside the blast', () => {
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  const bomb = place(sim, 'bomber', 1.5, 0);
  const grunt = place(sim, 'grunt', 1.5, 1.6);
  const events = run(sim, STATS.bomber.windup + 0.3);
  assert.ok(events.some(e => e.type === 'windup' && e.id === bomb.id), 'the fuse is telegraphed');
  const blast = events.find(e => e.type === 'explode' && e.id === bomb.id);
  assert.ok(blast && blast.harmful);
  assert.equal(sim.hearts, MAX_HEARTS - 1);
  assert.ok(events.some(e => e.type === 'kill' && e.id === grunt.id), 'it takes its neighbours with it');
});

test('arrows fly straight, hurt on contact, and can be cut out of the air', () => {
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  const archer = place(sim, 'archer', 6, 0);
  archer.cooldown = 0;
  let events = run(sim, STATS.archer.windup + 0.05);
  assert.ok(events.some(e => e.type === 'windup' && e.id === archer.id));
  assert.ok(events.some(e => e.type === 'shoot'));
  assert.equal(sim.arrows.length, 1);
  archer.state = 'dead'; // keep the archer out of the rest of the scene
  sim.enemies = [];
  const arrow = sim.arrows[0];
  // Cut it when it is close.
  run(sim, (Math.hypot(arrow.x, arrow.z) - 1.2) / 7.2 / sim.plan.speed);
  assert.equal(sim.arrows.length, 1);
  events = dash(sim, arrow.x + 0.5, arrow.z);
  assert.ok(events.some(e => e.type === 'deflect'));
  assert.equal(sim.arrows.length, 0);
  assert.equal(sim.hearts, MAX_HEARTS);
  // An arrow left alone hits.
  sim.player.x = 0; sim.player.z = 0;
  sim.arrows.push({ id: 999, x: 3, z: 0, dx: -1, dz: 0, travelled: 0 });
  sim.grace = 0;
  events = run(sim, 0.6);
  assert.ok(events.some(e => e.type === 'hurt' && e.source === 'arrow'));
  assert.equal(sim.hearts, MAX_HEARTS - 1);
});

test('grunts wind up, then lunge along a locked line; dashing aside dodges it', () => {
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  const grunt = place(sim, 'grunt', 2.2, 0);
  let events = run(sim, 0.1);
  assert.ok(events.some(e => e.type === 'windup' && e.id === grunt.id));
  const windup = STATS.grunt.windup * sim.plan.tempo;
  run(sim, windup * AIM_LOCK + 0.05);
  // The direction is locked now. Step aside.
  dash(sim, 0, 2.2);
  sim.grace = 0;
  events = run(sim, windup + STATS.grunt.strike + 0.3);
  assert.ok(events.some(e => e.type === 'strike' && e.id === grunt.id));
  assert.equal(sim.hearts, MAX_HEARTS, 'the lunge went where it was aimed and missed');
  // Standing still in front of a grunt gets you hit.
  const sim2 = arena();
  sim2.player.x = 0; sim2.player.z = 0;
  place(sim2, 'grunt', 2.2, 0);
  run(sim2, windup + STATS.grunt.strike + 0.2);
  assert.equal(sim2.hearts, MAX_HEARTS - 1);
});

// ---------------------------------------------------------------- charges, focus, combo

test('no softlock: dash charges always regrow, even after wasting every one', () => {
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  for (let i = 0; i < MAX_CHARGES; i++) dash(sim, sim.player.x + (i % 2 ? -2 : 2), sim.player.z);
  assert.equal(sim.charges, 0);
  assert.ok(dash(sim, sim.player.x + 2, sim.player.z).some(e => e.type === 'denied'), 'no charge, no dash');
  const events = run(sim, CHARGE_TIME + 0.05);
  assert.ok(events.some(e => e.type === 'charge'));
  assert.equal(sim.charges, 1);
  run(sim, CHARGE_TIME * MAX_CHARGES);
  assert.equal(sim.charges, MAX_CHARGES, 'refills to full and stops there');
  run(sim, 10);
  assert.equal(sim.charges, MAX_CHARGES);
});

test('no softlock: holding slow motion forever still lets time and charges move on', () => {
  const sim = arena();
  sim.charges = 0;
  sim.chargeTimer = 0;
  run(sim, 0.5, { aiming: true });
  assert.ok(Math.abs(sim.timeScale - SLOW) < 1e-9, 'aiming slows time');
  // Hold for long after the focus meter runs dry: time returns to normal and charges regrow.
  run(sim, FOCUS_MAX + 1, { aiming: true });
  assert.equal(sim.focus, 0);
  assert.equal(sim.timeScale, 1);
  run(sim, CHARGE_TIME + 0.2, { aiming: true });
  assert.ok(sim.charges >= 1);
  // Letting go refills focus.
  run(sim, FOCUS_MAX / 0.55 + 0.2);
  assert.equal(sim.focus, FOCUS_MAX);
});

test('slow motion scales the simulation: foes cover 15% of the ground while you aim', () => {
  const measure = aiming => {
    const sim = arena();
    sim.player.x = 0; sim.player.z = 3;
    const grunt = place(sim, 'grunt', 0, -3.5);
    run(sim, 0.3, { aiming }); // let the time scale settle
    const z0 = grunt.z;
    run(sim, 1, { aiming });
    return grunt.z - z0;
  };
  const normal = measure(false);
  const slow = measure(true);
  assert.ok(normal > 1.5, `walks normally (${normal})`);
  assert.ok(Math.abs(slow / normal - SLOW) < 0.02, `slow motion ratio ${slow / normal}`);
});

test('the combo multiplier rises with multi-kills, decays without kills, and resets on a hit', () => {
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  place(sim, 'grunt', 1.5, 0);
  place(sim, 'grunt', 3, 0);
  dash(sim, 4, 0);
  assert.equal(sim.combo, 2);
  assert.equal(sim.maxCombo, 2);
  const events = run(sim, COMBO_TIME + 0.4); // plus the hit-stop of the double cut
  assert.ok(events.some(e => e.type === 'comboDrop'));
  assert.equal(sim.combo, 1);
  sim.combo = 5;
  sim.grace = 0;
  sim.arrows.push({ id: 77, x: sim.player.x + 1, z: sim.player.z, dx: -1, dz: 0, travelled: 0 });
  run(sim, 0.3);
  assert.equal(sim.combo, 1, 'a hit breaks the combo');
  sim.combo = MAX_COMBO;
  for (let i = 0; i < 4; i++) place(sim, 'grunt', sim.player.x + 1 + i * 1.1, sim.player.z);
  dash(sim, sim.player.x + 5.2, sim.player.z);
  assert.equal(sim.combo, MAX_COMBO, 'capped');
});

test('a hit grants a moment of invulnerability; three hits end the run and nothing happens after', () => {
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  const shoot = () => sim.arrows.push({ id: Math.random(), x: 1, z: 0, dx: -1, dz: 0, travelled: 0 });
  shoot();
  run(sim, 0.3);
  assert.equal(sim.hearts, 2);
  shoot();
  run(sim, 0.3);
  assert.equal(sim.hearts, 2, 'still invulnerable');
  run(sim, 1);
  shoot();
  run(sim, 0.3);
  shoot();
  run(sim, 1.3);
  shoot();
  const events = run(sim, 0.3);
  assert.equal(sim.hearts, 0);
  assert.equal(sim.phase, 'dead');
  assert.ok(events.some(e => e.type === 'dead'));
  const score = sim.score;
  assert.equal(sim.step(DT, { aiming: true, dash: { x: 2, z: 0 } }).length, 0);
  assert.equal(sim.score, score);
});

// ---------------------------------------------------------------- waves

test('twelve campaign waves over three islands, then an endless storm that cycles them', () => {
  const arenas = Array.from({ length: CAMPAIGN_WAVES }, (_, i) => arenaForWave(i + 1));
  assert.deepEqual(arenas, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
  assert.deepEqual([13, 15, 16, 19, 22].map(arenaForWave), [0, 0, 1, 2, 0]);
  let previous = 0;
  let previousArena = -1;
  for (let w = 1; w <= 40; w++) {
    const plan = wavePlan(w, seeded(w));
    // Threat: archers and shield-bearers weigh more than grunts and bombers.
    const total = plan.groups.reduce((n, g) => n + g.count * { grunt: 1, bomber: 1, archer: 1.5, shield: 2 }[g.kind], 0);
    assert.ok(plan.groups.every(g => g.count >= 1 && g.count <= plan.maxAlive), `wave ${w}: every group fits on the island at once`);
    assert.ok(plan.endless === w > CAMPAIGN_WAVES);
    if (w <= CAMPAIGN_WAVES) {
      // Each island opens a little lighter (it brings a new foe), then every wave on it grows.
      if (plan.arena === previousArena) assert.ok(total >= previous, `wave ${w} does not shrink`);
      previous = total;
      previousArena = plan.arena;
      for (const g of plan.groups) assert.ok(INTRODUCED[g.kind] <= w, `wave ${w}: ${g.kind} only after its introduction`);
    }
    assert.ok(plan.speed >= 1 && plan.speed <= MAX_SPEED);
    assert.ok(plan.tempo <= 1 && plan.tempo >= 0.65);
  }
  assert.ok(wavePlan(12).groups.length > wavePlan(1).groups.length);
});

test('every attack is telegraphed for long enough, at every wave', () => {
  for (let w = 1; w <= 60; w++) {
    const tempo = wavePlan(w, seeded(w)).tempo;
    // Time from the start of the warning to the strike, and from the locked direction to the strike.
    assert.ok(STATS.grunt.windup * tempo >= 0.55, `wave ${w}: grunt wind-up`);
    assert.ok(STATS.grunt.windup * tempo * (1 - AIM_LOCK) >= 0.19, `wave ${w}: grunt locked line`);
    assert.ok(STATS.shield.windup * tempo >= 0.48, `wave ${w}: shield bash`);
    assert.ok(STATS.archer.windup * tempo >= 0.65, `wave ${w}: bow draw`);
    assert.ok(STATS.bomber.windup * tempo >= 0.8, `wave ${w}: fuse`);
    assert.ok(ARCHER_COOLDOWN * tempo * 0.85 >= 1.2, `wave ${w}: archers pause between shots`);
  }
  assert.ok(SPAWN_TIME >= 0.8, 'foes take a moment to land');
});

test('every wave is clearable: a careless bot that cannot be hurt clears waves 1 to 16 on every island', () => {
  for (const seed of [1, 2, 3, 7, 11, 2026]) {
    const random = seeded(seed * 13);
    const sim = new Sim(seed, { god: true });
    const play = bot(random);
    const cleared = [];
    let t = 0;
    let waveStart = 0;
    while (sim.wave <= 16 && t < 1200) {
      for (const e of sim.step(DT, play(sim))) {
        if (e.type === 'fight') waveStart = t;
        if (e.type === 'clear') {
          cleared.push(e.wave);
          assert.ok(t - waveStart < 150, `seed ${seed}: wave ${e.wave} took ${(t - waveStart).toFixed(0)} s`);
        }
        if (e.type === 'spawn') assert.ok(walkable(sim.arena, e.x, e.z), 'foes land on the island');
      }
      for (const e of sim.enemies) assert.ok(walkable(sim.arena, e.x, e.z, EDGE_MARGIN - 0.02), 'foes stay on the island');
      assert.ok(walkable(sim.arena, sim.player.x, sim.player.z, EDGE_MARGIN - 0.02), 'the player stays on the island');
      assert.ok(sim.charges >= 0 && sim.charges <= MAX_CHARGES);
      t += DT;
    }
    assert.deepEqual(cleared, Array.from({ length: 16 }, (_, i) => i + 1), `seed ${seed}`);
  }
});

test('the opening waves are gentle: the same bot, which never dodges, survives the first island', () => {
  let survived = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const sim = new Sim(seed);
    const play = bot(seeded(seed));
    let t = 0;
    while (sim.wave <= 4 && sim.phase !== 'dead' && t < 400) { sim.step(DT, play(sim)); t += DT; }
    assert.ok(sim.wave >= 4, `seed ${seed} died before the last wave of the first island`);
    if (sim.phase !== 'dead') survived++;
  }
  assert.ok(survived >= 10, `survived the first island on ${survived} of 12 seeds`);
});

test('clearing a wave heals one heart and pays a bonus; flying to the next island resets the field', () => {
  const sim = new Sim(3, { startWave: 4 });
  sim.hearts = 1;
  sim.queue = [];
  let events = run(sim, 1.8);
  assert.equal(sim.phase, 'clear');
  const clear = events.find(e => e.type === 'clear');
  assert.ok(clear && clear.flawless && clear.healed);
  assert.equal(sim.hearts, 2);
  events = run(sim, 2.3);
  assert.equal(sim.phase, 'travel');
  assert.ok(events.some(e => e.type === 'travel' && e.arena === 1));
  // No dashing or slow motion mid-flight.
  const charges = sim.charges;
  events = run(sim, 3.3, s => (s.phase === 'travel' ? { aiming: true, dash: { x: 3, z: 0 } } : IDLE));
  assert.equal(sim.charges, charges);
  assert.ok(events.some(e => e.type === 'arena' && e.arena === 1));
  assert.equal(sim.arenaIndex, 1);
  assert.equal(sim.wave, 5);
  assert.ok(events.some(e => e.type === 'wave' && e.wave === 5 && e.intro === 'bomber'));
  assert.deepEqual([sim.player.x, sim.player.z], [ARENAS[1].start.x, ARENAS[1].start.z]);
});

test('kinds, stats and arenas are consistent', () => {
  assert.deepEqual([...KINDS].sort(), Object.keys(STATS).sort());
  assert.ok(MIN_DASH < MAX_DASH);
  assert.ok(CUT_R > 0 && PLAYER_R > 0);
  const keys = new Set(ARENAS[0].tiles.map(t => hexKey(t.q, t.r)));
  assert.equal(keys.size, ARENAS[0].tiles.length);
});

// ---------------------------------------------------------------- review fixes

test('no pocket of the rim is safe: an idle player anywhere on any island is reached by grunts and shield-bearers', () => {
  // Pockets the review found, where lunges used to stop short at the edge forever, then a grid over every island.
  const spots = [[0, 4.36, -3.67], [0, 5.7, -1.74], [0, -1.5, 5.46], [1, 4.35, 4.09], [2, -1.5, -2.34], [2, -1.8, -2.04]];
  for (const arena of ARENAS) {
    for (let x = arena.bounds.minX; x <= arena.bounds.maxX; x += 0.45) {
      for (let z = arena.bounds.minZ; z <= arena.bounds.maxZ; z += 0.45) spots.push([arena.index, x, z]);
    }
  }
  let tested = 0;
  let slowest = 0;
  for (const kind of ['grunt', 'shield']) {
    for (const [index, x, z] of spots) {
      const arena = ARENAS[index];
      if (!walkable(arena, x, z)) continue;
      const sim = new Sim(7, { startWave: index * 4 + 1 });
      sim.queue = [];
      sim.holdWave = true;
      run(sim, 1.7);
      sim.player.x = x; sim.player.z = z;
      let placed = 0;
      for (let k = 0; k < 24 && placed < 2; k++) {
        const a = (k * Math.PI) / 12;
        const fx = x + Math.cos(a) * 3, fz = z + Math.sin(a) * 3;
        if (walkable(arena, fx, fz)) { place(sim, kind, fx, fz); placed++; k += 5; }
      }
      if (!placed) continue;
      tested++;
      let hurtAt = -1;
      for (let t = 0; t < 8 && hurtAt < 0; t += DT) if (sim.step(DT, IDLE).some(e => e.type === 'hurt')) hurtAt = t;
      assert.ok(hurtAt >= 0, `island ${index}: a ${kind} never reaches an idle player at (${x.toFixed(2)}, ${z.toFixed(2)})`);
      slowest = Math.max(slowest, hurtAt);
      for (const e of sim.enemies) assert.ok(walkable(arena, e.x, e.z, EDGE_MARGIN - 0.02), 'the foe stays on the island');
    }
  }
  assert.ok(tested > 2000, `scanned ${tested} spots`);
  assert.ok(slowest < REPOSITION_TIME + 2, `slowest hit after ${slowest.toFixed(2)} s`);
});

test('a lunge cut short by the edge still reaches a little past where the body stops, never across a gap', () => {
  const ring = ARENAS[2];
  // From the south side of the ring towards the chasm: the body stops at the edge, the blow reaches only a bit further.
  const { body, front } = lungeLength(ring, 0, 3.1, 0, -1, STATS.grunt.reach);
  assert.ok(body < 1.5, `the body stops at the chasm (${body})`);
  assert.ok(Math.abs(front - (body + LUNGE_OVERREACH)) < 1e-9);
  // On open ground the blow is exactly the reach.
  assert.equal(lungeLength(ARENAS[0], 0, 0, 1, 0, 1.5).front, 1.5);
  // Anywhere, any way: the body stays on the island and the blow ends at most a hair past the edge, so it can never
  // reach across the chasm or the void to someone standing beyond.
  const random = seeded(17);
  const over = LUNGE_OVERREACH - EDGE_MARGIN;
  for (const a of ARENAS) {
    for (let i = 0; i < 1500; i++) {
      const tile = a.tiles[Math.floor(random() * a.tiles.length)];
      const x = tile.x + (random() - 0.5) * HEX, z = tile.z + (random() - 0.5) * HEX;
      if (!walkable(a, x, z)) continue;
      const angle = random() * TAU, dx = Math.cos(angle), dz = Math.sin(angle);
      const reach = random() < 0.5 ? STATS.grunt.reach : STATS.shield.reach;
      const length = lungeLength(a, x, z, dx, dz, reach);
      assert.ok(length.body <= length.front && length.front <= reach + 1e-9);
      assert.ok(walkable(a, x + dx * length.body, z + dz * length.body, EDGE_MARGIN - 1e-6));
      for (let s = length.body; s <= length.front - over - 0.01; s += 0.02) {
        assert.ok(walkable(a, x + dx * s, z + dz * s, 0), `island ${a.index}: the blow crosses the void at ${s.toFixed(2)}`);
      }
    }
  }
});

test('a blocked cut rocks a shield-bearer back and breaks its wind-up, so it cannot bash the player at the shield', () => {
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  const shield = place(sim, 'shield', 1.8, 0, Math.PI); // faces the player, in bash range
  run(sim, 0.05);
  assert.equal(shield.state, 'windup');
  const events = dash(sim, 3, 0);
  const clang = events.find(e => e.type === 'clang');
  assert.ok(clang && clang.interrupted, 'the block interrupts the wind-up');
  assert.equal(shield.state, 'move');
  assert.ok(shield.stagger > 0);
  // Standing still in front of it: safe while it staggers and winds up again; a fresh bash comes later.
  const windup = STATS.shield.windup * sim.plan.tempo;
  run(sim, STAGGER_TIME + windup - 0.1);
  assert.equal(sim.hearts, MAX_HEARTS, 'the player has the stagger plus a whole wind-up to get out');
  run(sim, 1);
  assert.equal(sim.hearts, MAX_HEARTS - 1, 'then the shield-bearer bashes again');
});

test('keyboard aim never starts on a dash that would be cancelled while a valid one exists', () => {
  const random = seeded(9);
  let pockets = 0;
  for (const a of ARENAS) {
    for (let i = 0; i < 400; i++) {
      const sim = new Sim(i, { startWave: a.index * 4 + 1 });
      sim.queue = [];
      sim.holdWave = true;
      run(sim, 1.7);
      // Stand somewhere at the very edge of the walkable ground (where clipped dashes end).
      const tile = a.tiles[Math.floor(random() * a.tiles.length)];
      const angle = random() * TAU;
      const len = clipDash(a, tile.x, tile.z, Math.cos(angle), Math.sin(angle), 30);
      if (!walkable(a, tile.x, tile.z)) continue;
      sim.player.x = tile.x + Math.cos(angle) * len;
      sim.player.z = tile.z + Math.sin(angle) * len;
      for (let k = 0; k < 3; k++) {
        const b = random() * TAU, r = 1 + random() * 4;
        const fx = sim.player.x + Math.cos(b) * r, fz = sim.player.z + Math.sin(b) * r;
        if (walkable(a, fx, fz)) place(sim, KINDS[k % 4], fx, fz);
      }
      const target = keyboardTarget(sim);
      const anyValid = Array.from({ length: 72 }, (_, k) => sim.planDash(sim.player.x + Math.cos((k / 72) * TAU) * MAX_DASH, sim.player.z + Math.sin((k / 72) * TAU) * MAX_DASH).valid).some(Boolean);
      if (!anyValid) continue;
      assert.ok(target, 'a target exists');
      assert.ok(sim.planDash(target.x, target.z).valid, `island ${a.index}: keyboard target from (${sim.player.x.toFixed(2)}, ${sim.player.z.toFixed(2)}) is a valid dash`);
      if (sim.enemies.some(e => !sim.planDash(e.x, e.z).valid)) pockets++;
    }
  }
  assert.ok(pockets > 20, `exercised spots where some foe is out of line (${pockets})`);
  // With a foe in a clear line, it still picks the cut.
  const sim = arena();
  sim.player.x = 0; sim.player.z = 0;
  const grunt = place(sim, 'grunt', 2.5, 0);
  const target = keyboardTarget(sim);
  assert.deepEqual(sim.planDash(target.x, target.z).cuts.map(e => e.id), [grunt.id]);
});

test('the focus meter running dry while aiming is announced once', () => {
  const sim = arena();
  let events = run(sim, FOCUS_MAX - 0.2, { aiming: true });
  assert.equal(events.filter(e => e.type === 'focusOut').length, 0);
  events = run(sim, 2, { aiming: true });
  assert.equal(events.filter(e => e.type === 'focusOut').length, 1);
  run(sim, 1);
  events = run(sim, 0.5, { aiming: true });
  assert.equal(events.filter(e => e.type === 'focusOut').length, 0, 'a partly refilled meter is not empty yet');
});

test('endless keeps escalating well past the campaign, and long runs heal and hold multipliers less easily', () => {
  // Speed and the shield turn rate keep rising for about twenty endless waves; waves grow longer too.
  const at = w => wavePlan(w, seeded(w));
  assert.ok(at(30).speed > at(22).speed && at(22).speed > at(16).speed);
  assert.ok(at(26).turn > at(18).turn);
  assert.ok(at(30).groups.length > at(22).groups.length);
  assert.ok(at(40).speed <= MAX_SPEED && at(40).maxAlive <= 12);
  // Every campaign wave heals; in endless, every other wave.
  for (let w = 1; w <= CAMPAIGN_WAVES; w++) assert.ok(healsAfter(w));
  assert.deepEqual([13, 14, 15, 16].map(healsAfter), [false, true, false, true]);
  const sim = new Sim(3, { startWave: 13 });
  sim.hearts = 1;
  sim.queue = [];
  const clear = run(sim, 1.8).find(e => e.type === 'clear');
  assert.ok(clear && !clear.healed);
  assert.equal(sim.hearts, 1);
  // A high multiplier must be fed: its window narrows from 5 s to 2.5 s.
  assert.equal(comboWindow(2), COMBO_TIME);
  assert.equal(comboWindow(5), COMBO_TIME);
  assert.ok(comboWindow(15) < comboWindow(10) && comboWindow(10) < COMBO_TIME);
  assert.equal(comboWindow(MAX_COMBO), COMBO_MIN_TIME);
  const hot = arena();
  hot.combo = 20;
  hot.comboTimer = comboWindow(20);
  const events = run(hot, comboWindow(20) + 0.1);
  assert.ok(events.some(e => e.type === 'comboDrop'), '×20 drops after its shorter window');
  assert.ok(MAX_COMBO > 20);
});
