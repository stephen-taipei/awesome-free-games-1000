import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/games/runner/game-383-parkour-master/logic.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const logic = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const {
  SUB_STEP, HALF_WIDTH, STAND_HEIGHT, LOW_HEIGHT, VAULT_MAX, WALL_MIN, PIPE_LOW, PIPE_HIGH, HARD_FALL, CANOPY_DROP, CORNER,
  TAKEOFF_SLACK, LEAD_START, LEAD_MAX, LEAD_WARN, WINDOW_START, WINDOW_END, DISTRICT_LENGTH, DISTRICT_BLEND, SET_PIECES, COYOTE,
  SWIPE_CREDIT, ROLL_LATE,
  speedsAt, districtAt, districtKey, timingWindow, boostedSpeed, stumbleSpeed, relaxSpeed, advanceLead, airStep, flightTime, jumpApex, maxGap,
  longestJump, signatureOf, signatureCount, Course, RunSim,
} = logic;

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const DT = 1 / 60;
const idle = () => ({ jump: false, slide: false, jumpPressed: false, slidePressed: false });

/** A bot that presses each cued move halfway into its window (or `early(cue)` seconds before contact) and holds a jump only as long as it needs. */
function makeBot(early = cue => cue.window * 0.5) {
  const state = { hold: false, done: '' };
  return sim => {
    const input = { jump: state.hold, slide: false, jumpPressed: false, slidePressed: false };
    if (sim.mode === 'air' && sim.holding) {
      const landing = sim.predict(false);
      const roof = landing.landed ? sim.roofAt(landing.x) : null;
      if (landing.landed && (!roof || landing.x - roof.x0 >= 0.9)) { input.jump = false; state.hold = false; } else input.jump = true;
    }
    if (sim.mode !== 'air') state.hold = false;
    const cue = sim.cue(2.5);
    if (cue && cue.tau <= early(cue) && cue.tau >= -cue.late) {
      const key = `${cue.move}:${Math.round(cue.x * 10)}`;
      if (state.done !== key) {
        state.done = key;
        if (cue.move === 'slide' || cue.move === 'roll') { input.slidePressed = true; input.slide = true; }
        else { input.jumpPressed = true; input.jump = true; state.hold = cue.move === 'edge' || cue.move === 'kick' || cue.move === 'zip'; }
      }
    }
    return input;
  };
}

function run(sim, bot, { seconds = 600, until = Infinity } = {}) {
  const events = [];
  for (let t = 0; t < seconds && sim.alive && sim.distance < until; t += DT) events.push(...sim.step(DT, bot(sim)));
  return events;
}

/** A sim on a hand-built course: `roofs` as [x0, x1, top, extra], plus obstacles, with generation switched off. */
function staged({ roofs, obstacles = [], speed, options = {} }) {
  const sim = new RunSim(seeded(1), { pursuit: false, ...options });
  let id = 1000;
  sim.course.roofs = roofs.map(([x0, x1, top, extra = {}], i) => ({
    id: id++, x0, x1, top, kind: 'roof', wall: false, oneWay: false, district: 0, seed: 0.5,
    gap: i ? x0 - roofs[i - 1][1] : 0, dh: i ? top - roofs[i - 1][2] : 0, zipIn: false, zipOut: false, ...extra,
  }));
  sim.course.obstacles = obstacles.map(o => ({ id: id++, district: 0, seed: 0.5, hit: false, scored: false, ...o }));
  sim.course.zips = [];
  sim.course.panels = [];
  sim.course.cursor = 1e9;
  sim.x = 0;
  sim.y = sim.course.roofs.find(r => r.x0 <= 0 && r.x1 >= 0)?.top ?? 0;
  if (speed !== undefined) sim.speed = speed;
  sim.support = sim.supportAt(sim.x, sim.y);
  return sim;
}

const step = (sim, seconds, input = idle) => { const events = []; for (let t = 0; t < seconds - 1e-9; t += DT) events.push(...sim.step(DT, typeof input === 'function' ? input(sim) : input)); return events; };
const press = (key, held = true) => ({ jump: key === 'jump' && held, slide: key === 'slide' && held, jumpPressed: key === 'jump', slidePressed: key === 'slide' });
const perfects = (events, move) => events.filter(e => e.type === 'perfect' && (!move || e.move === move)).length;
const stumbles = (events, reason) => events.filter(e => e.type === 'stumble' && (!reason || e.reason === reason)).length;

/** Simulates a jump from an edge at `speed`, holding for `hold` seconds; reports where it comes down relative to the gap. */
function flight({ fromTop, edge, roof, speed, hold = Infinity, early = 0 }) {
  const state = { y: fromTop, vy: 9.5, holding: true };
  // Supported until the centre passes the edge by HALF_WIDTH; the jump may start `early` seconds before that.
  let x = edge + HALF_WIDTH - early * speed;
  for (let t = SUB_STEP; t < 5; t += SUB_STEP) {
    const prevY = state.y;
    airStep(state, t <= hold, SUB_STEP);
    const nx = x + speed * SUB_STEP;
    // Meeting the far face below its top (beyond the corner allowance) ends the jump.
    if (!roof.oneWay && x + HALF_WIDTH <= roof.x0 && nx + HALF_WIDTH > roof.x0 && Math.min(prevY, state.y) < roof.top - CORNER) return { ok: false, why: 'face', x: nx };
    x = nx;
    if (state.vy <= 0 && prevY >= roof.top && state.y <= roof.top) {
      if (x + HALF_WIDTH > roof.x0 && x - HALF_WIDTH < roof.x1) return { ok: true, x };
      if (x - HALF_WIDTH >= roof.x1) return { ok: false, why: 'over', x };
    }
    if (state.y < roof.top - 12) return { ok: false, why: 'short', x };
  }
  return { ok: false, why: 'time', x };
}

test('jump physics: a held jump goes higher and further than a tap, and an apex below a wall forces the wall-kick', () => {
  const apex = jumpApex();
  assert.ok(apex > 2.6 && apex < 3.2, `apex ${apex}`);
  assert.ok(apex < WALL_MIN - 0.5, 'a jump cannot reach the top of a kick wall');
  assert.ok(flightTime(0, 0.05) < 0.55 && flightTime(0) > 1, 'tap hop vs full jump');
  let previous = 0;
  for (const hold of [0, 0.1, 0.2, 0.3, 0.4, Infinity]) {
    const t = flightTime(0, hold);
    assert.ok(t >= previous - 1e-9, 'longer holds never shorten the flight');
    previous = t;
  }
  assert.equal(flightTime(apex + 0.5), Infinity, 'too high to reach');
  // The landing heights a big drop and a canopy collapse produce are hard landings.
  assert.ok(CANOPY_DROP >= HARD_FALL);
  // Pipes: a standing runner hits them, a sliding or rolling one passes under.
  assert.ok(STAND_HEIGHT > PIPE_LOW && LOW_HEIGHT < PIPE_LOW && PIPE_HIGH > PIPE_LOW);
});

test('districts: top speed climbs from 8 to 16 m/s, the drone sits between the pace and the top, nothing ever drops', () => {
  assert.equal(speedsAt(0).top, 8);
  assert.equal(speedsAt(4 * DISTRICT_LENGTH + 100).top, 16);
  assert.equal(speedsAt(20 * DISTRICT_LENGTH).top, 16);
  let prev = speedsAt(0);
  for (let d = 0; d <= 12000; d += 5) {
    const s = speedsAt(d);
    assert.ok(s.floor < s.pace && s.pace < s.drone && s.drone < s.top, `ordering at ${d}`);
    for (const key of ['top', 'floor', 'drone']) assert.ok(s[key] >= prev[key] - 1e-9, `${key} never falls (${d} m)`);
    // Without perfect moves the runner loses ground, and more of it later on.
    assert.ok(s.drone - s.pace >= prev.drone - prev.pace - 1e-9);
    prev = s;
  }
  assert.ok(speedsAt(8000).drone - speedsAt(8000).pace > 3 * (speedsAt(0).drone - speedsAt(0).pace));
  assert.equal(districtAt(499), 0);
  assert.equal(districtAt(500), 1);
});

test('timing windows shrink from 180 ms to 110 ms', () => {
  assert.equal(timingWindow(0), WINDOW_START);
  assert.ok(Math.abs(WINDOW_START - 0.18) < 1e-9 && Math.abs(WINDOW_END - 0.11) < 1e-9);
  assert.ok(Math.abs(timingWindow(2000) - 0.11) < 1e-9);
  assert.ok(Math.abs(timingWindow(9000) - 0.11) < 1e-9);
  for (let d = 0; d < 3000; d += 50) assert.ok(timingWindow(d + 50) <= timingWindow(d) + 1e-12);
});

test('momentum economy: perfects add speed up to the top, stumbles cut it but never below the floor', () => {
  for (const d of [0, 700, 1600, 2600, 6000]) {
    const { top, floor, pace } = speedsAt(d);
    for (let v = floor; v <= top; v += 0.25) {
      for (const combo of [1, 3, 9]) {
        const b = boostedSpeed(v, top, combo);
        assert.ok(b <= top + 1e-9 && b >= v);
        if (v < top - 0.01) assert.ok(b > v);
      }
      const s = stumbleSpeed(v, floor);
      assert.ok(s >= floor - 1e-9);
      if (v > floor + 1e-6) assert.ok(s < v, 'a stumble always costs speed above the floor');
      // Combos pay more.
      if (v < top - 2) assert.ok(boostedSpeed(v, top, 5) > boostedSpeed(v, top, 1));
      // Speed relaxes towards the pace from either side and never overshoots it.
      const r = relaxSpeed(v, pace, 0.5);
      assert.ok(v > pace ? r < v && r > pace : r >= v && r <= pace + 1e-9);
    }
  }
});

test('pursuit: the lead is the integral of runner speed minus drone speed, capped at LEAD_MAX', () => {
  let lead = 10;
  for (let i = 0; i < 120; i++) lead = advanceLead(lead, 7 / 60, 6.4, 1 / 60);
  assert.ok(Math.abs(lead - (10 + (7 - 6.4) * 2)) < 1e-9);
  lead = 10;
  for (let i = 0; i < 600; i++) lead = advanceLead(lead, 8 / 60, 6.4, 1 / 60);
  assert.equal(lead, LEAD_MAX);
  // In the sim: track travel and drone speed independently and compare.
  const sim = new RunSim(seeded(3));
  const bot = makeBot();
  let expected = sim.lead;
  for (let t = 0; t < 40 && sim.alive; t += DT) {
    const before = sim.x;
    const clock = sim.clock;
    sim.step(DT, bot(sim));
    const steps = Math.round((sim.clock - clock) / SUB_STEP);
    // Drone speed only changes at district blends, which are not reached in 40 s; travel is exact.
    expected = Math.min(LEAD_MAX, expected + (sim.x - before) - speedsAt(before).drone * steps * SUB_STEP);
  }
  assert.ok(Math.abs(sim.lead - expected) < 0.05, `lead ${sim.lead} vs integral ${expected}`);
});

test('every generated gap can be cleared at the slowest possible speed, and at every speed up to the top', () => {
  let gaps = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const course = new Course(seeded(seed));
    course.extend(6500);
    const roofs = course.roofs;
    for (let i = 1; i < roofs.length; i++) {
      const prev = roofs[i - 1];
      const roof = roofs[i];
      if (roof.zipIn || roof.gap < 0.01) continue;
      gaps++;
      const { floor } = speedsAt(Math.max(0, prev.x1 - 6));
      const { top } = speedsAt(prev.x1);
      // The bound the generator promises: a full jump at the floor speed, started TAKEOFF_SLACK early.
      assert.ok(roof.gap <= maxGap(floor, roof.top - prev.top) + 1e-9, `gap ${i} seed ${seed} exceeds maxGap`);
      const slow = flight({ fromTop: prev.top, edge: prev.x1, roof, speed: floor, early: TAKEOFF_SLACK });
      assert.ok(slow.ok, `seed ${seed}: gap of ${roof.gap.toFixed(2)} m (dh ${roof.dh.toFixed(2)}) at ${prev.x1.toFixed(0)} m fails at floor speed: ${slow.why}`);
      // Faster runners can always find a hold that lands (never sailing past a crane boom).
      for (let v = floor; v <= top + 1e-9; v += 0.5) {
        let ok = false;
        for (const hold of [Infinity, 0.5, 0.35, 0.25, 0.15, 0.08, 0.02]) {
          for (const early of [0, 0.15, 0.3]) {
            if (flight({ fromTop: prev.top, edge: prev.x1, roof, speed: v, hold, early }).ok) { ok = true; break; }
          }
          if (ok) break;
        }
        assert.ok(ok, `seed ${seed}: no hold clears the gap at ${prev.x1.toFixed(0)} m at ${v.toFixed(1)} m/s`);
      }
    }
  }
  assert.ok(gaps > 2000, `checked ${gaps} gaps`);
});

test('course layout: obstacles sit inside roofs with run-up room, walls join their roof, zips and canopies are safe', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const course = new Course(seeded(seed));
    course.extend(7000);
    const roofs = course.roofs;
    const roofOf = x => roofs.find(r => x >= r.x0 && x <= r.x1);
    for (const ob of course.obstacles) {
      const roof = roofOf(ob.x0);
      assert.ok(roof && ob.x1 <= roof.x1, 'obstacle on a roof');
      assert.ok(roof.kind === 'roof', 'no obstacles on booms or canopy decks');
      const top = speedsAt(roof.x0).top;
      assert.ok(ob.x0 - roof.x0 >= 4 && roof.x1 - ob.x1 >= 0.3 * top + 2, 'room to land before and to line up after');
      if (ob.kind === 'vault') assert.ok(ob.y0 === roof.top && ob.y1 - ob.y0 <= VAULT_MAX && ob.y1 - ob.y0 >= 0.7);
      else assert.ok(Math.abs(ob.y0 - (roof.top + PIPE_LOW)) < 1e-9 && Math.abs(ob.y1 - (roof.top + PIPE_HIGH)) < 1e-9);
    }
    // Obstacles on a roof never crowd each other: about a second of running apart.
    for (const roof of roofs) {
      const on = course.obstacles.filter(o => o.x0 >= roof.x0 && o.x1 <= roof.x1).sort((a, b) => a.x0 - b.x0);
      for (let i = 1; i < on.length; i++) assert.ok(on[i].x0 - on[i - 1].x1 >= 0.75 * speedsAt(roof.x0).top + 2 - 1e-9);
    }
    for (let i = 1; i < roofs.length; i++) {
      const roof = roofs[i];
      const prev = roofs[i - 1];
      if (roof.wall) {
        assert.equal(roof.gap, 0, 'kick walls join the roof before them');
        assert.ok(roof.top - prev.top >= WALL_MIN && roof.top - prev.top <= WALL_MIN + 1.01);
        assert.ok(roof.district >= SET_PIECES.wall);
      }
      if (roof.gap === 0 && !roof.wall && roof.dh > 0) assert.ok(roof.dh <= VAULT_MAX, 'a joined step up is vaultable');
      if (roof.kind === 'boom') assert.ok(roof.oneWay && roof.district >= SET_PIECES.crane);
    }
    for (const zip of course.zips) {
      const launch = roofs.find(r => Math.abs(r.x1 - 0.4 - zip.grabX) < 1e-9);
      const landing = roofs.find(r => r.zipIn && r.x0 < zip.x1 && r.x1 > zip.x1 + 8);
      assert.ok(launch && launch.zipOut && landing, 'a zip leaves from a roof edge and ends above a roof');
      assert.ok(zip.y1 < zip.y0 && zip.y0 - zip.launchTop > STAND_HEIGHT, 'the cable runs downhill, above head height at the start');
      assert.ok(zip.district >= SET_PIECES.zip);
    }
    const groups = new Map();
    for (const panel of course.panels) groups.set(panel.group, [...(groups.get(panel.group) ?? []), panel]);
    for (const panels of groups.values()) {
      const deck = roofOf(panels[0].x0 + 0.01);
      assert.ok(deck && deck.kind === 'deck' && deck.district >= SET_PIECES.canopy);
      assert.ok(Math.abs(panels[0].top - deck.top - CANOPY_DROP) < 1e-9);
      // Falling from the canopy's far end at top speed still lands on the deck.
      const last = panels[panels.length - 1];
      const top = speedsAt(deck.x0).top;
      assert.ok(deck.x1 - last.x1 >= top * (0.22 + Math.sqrt(2 * CANOPY_DROP / 34)));
    }
    // Every kind of set piece turns up on every seed (each one's own district is checked above).
    assert.ok(course.counts.wall > 0 && course.counts.crane > 0 && course.counts.zip > 0 && course.counts.canopy > 0, `seed ${seed}: ${JSON.stringify(course.counts)}`);
  }
});

test('the course regenerates identically from a seed and prunes what is behind', () => {
  const a = new Course(seeded(9));
  const b = new Course(seeded(9));
  a.extend(3000);
  b.extend(3000);
  assert.deepEqual(a.roofs.map(r => [r.x0, r.top]), b.roofs.map(r => [r.x0, r.top]));
  a.prune(2000);
  assert.ok(a.roofs.every(r => r.x1 >= 2000) && a.obstacles.every(o => o.x1 >= 2000));
});

test('coyote time: a jump a moment after running off the edge still counts (as an edge jump), a late one does not', () => {
  const layout = { roofs: [[-20, 10, 0], [13, 40, 0]], speed: 6 };
  const sim = staged(layout);
  step(sim, (10 + HALF_WIDTH - sim.x) / 6 + 0.05);
  assert.equal(sim.mode, 'air');
  const events = step(sim, DT, press('jump'));
  assert.ok(sim.vy > 5, 'coyote jump fired');
  assert.equal(perfects(events, 'edge'), 1);
  const late = staged(layout);
  step(late, (10 + HALF_WIDTH) / 6 + COYOTE + 0.08);
  step(late, DT, press('jump'));
  assert.ok(late.vy < 0, 'too late: still falling');
});

test('input buffer: jump pressed just before landing fires on landing', () => {
  const sim = staged({ roofs: [[-20, 60, 0]], speed: 6 });
  step(sim, DT, press('jump'));
  step(sim, 0.2, { jump: false, slide: false, jumpPressed: false, slidePressed: false });
  // Coming down from a hop: press about 0.08 s before touching down.
  while (sim.predict(false).time > 0.08) step(sim, DT, idle);
  step(sim, DT, press('jump', false));
  const events = step(sim, 0.2, idle);
  assert.ok(events.filter(e => e.type === 'jump').length === 1, 'buffered jump fired after landing');
});

test('a held jump clears a gap a tapped hop falls into', () => {
  const layout = { roofs: [[-20, 8, 0], [12.5, 40, 0]], speed: 6.5 };
  const held = staged(layout);
  const jumpAt = (8 + HALF_WIDTH - 0.3) / 6.5;
  step(held, jumpAt);
  step(held, DT, press('jump'));
  step(held, 2, { jump: true, slide: false, jumpPressed: false, slidePressed: false });
  assert.ok(held.alive && held.x > 13 && Math.abs(held.y) < 1e-6, 'held jump landed');
  const tapped = staged(layout);
  step(tapped, jumpAt);
  step(tapped, DT, press('jump', false));
  step(tapped, 2);
  assert.equal(tapped.status, 'fell');
});

test('vault: jumping inside the window vaults with a boost; jumping early is a plain hop; no input stumbles', () => {
  const layout = () => ({ roofs: [[-20, 60, 0]], obstacles: [{ kind: 'vault', x0: 10, x1: 11.4, y0: 0, y1: 1 }], speed: 6 });
  const contact = (10 - HALF_WIDTH) / 6;
  const w = timingWindow(0);
  const timed = staged(layout());
  step(timed, contact - w * 0.5);
  const v0 = timed.speed;
  const events = step(timed, 1, sim => (sim.clock < contact - w * 0.5 + DT ? press('jump') : idle()));
  assert.equal(perfects(events, 'vault'), 1);
  assert.equal(stumbles(events), 0);
  assert.ok(timed.speed > v0 - 0.2 && timed.x > 11.4);
  const early = staged(layout());
  step(early, contact - w - 0.12);
  const earlyEvents = step(early, 1.2, sim => (sim.clock < contact - w - 0.1 ? press('jump', false) : idle()));
  assert.equal(perfects(earlyEvents, 'vault'), 0, 'outside the window: no vault');
  const blind = staged(layout());
  const blindEvents = step(blind, 3);
  assert.equal(stumbles(blindEvents, 'vault'), 1);
  assert.ok(blind.speed < v0 && blind.combo === 0);
  assert.ok(blind.x > 11.4, 'the stumble still gets over the unit');
});

test('the vault window narrows with distance: a press at 150 ms is perfect at the start, not after 2 km', () => {
  for (const [offset, expected] of [[0, 1], [2400, 0]]) {
    const sim = staged({ roofs: [[offset - 20, offset + 60, 0]], obstacles: [{ kind: 'vault', x0: offset + 10, x1: offset + 11.4, y0: 0, y1: 1 }], options: { floorSpeed: true } });
    sim.x = offset;
    sim.support = sim.supportAt(sim.x, sim.y);
    const speed = speedsAt(offset).floor;
    step(sim, (10 - HALF_WIDTH) / speed - 0.15 - DT / 2);
    const events = step(sim, 1.2, s => (s.clock < 0.01 + (10 - HALF_WIDTH) / speed - 0.15 ? press('jump', false) : idle()));
    assert.equal(perfects(events, 'vault'), expected, `offset ${offset}`);
  }
});

test('pipes: a standing runner stumbles under them, a slide in the window passes clean with a boost', () => {
  const layout = () => ({ roofs: [[-20, 60, 0]], obstacles: [{ kind: 'pipe', x0: 10, x1: 10.5, y0: PIPE_LOW, y1: PIPE_HIGH }], speed: 6 });
  const blind = staged(layout());
  const events = step(blind, 2.5);
  assert.equal(stumbles(events, 'pipe'), 1);
  const slid = staged(layout());
  const at = (10 - HALF_WIDTH) / 6 - timingWindow(0) * 0.5;
  step(slid, at);
  const slideEvents = step(slid, 2.5, s => (s.clock < at + DT ? press('slide') : idle()));
  assert.equal(stumbles(slideEvents), 0);
  assert.equal(perfects(slideEvents, 'slide'), 1);
  // Jumping into a pipe is a stumble too: collisions match what is drawn.
  const hopped = staged(layout());
  step(hopped, (10 - HALF_WIDTH) / 6 - 0.15);
  const hopEvents = step(hopped, 2, s => (s.clock < (10 - HALF_WIDTH) / 6 - 0.13 ? press('jump', false) : idle()));
  assert.equal(stumbles(hopEvents, 'pipe'), 1);
});

test('wall-kick: a timed jump kicks up the wall with a boost; no input scrambles up slowly', () => {
  const layout = () => ({ roofs: [[-20, 12, 0], [12, 60, 4.2, { wall: true }]], speed: 6 });
  const blind = staged(layout());
  const blindEvents = step(blind, 4);
  assert.equal(stumbles(blindEvents, 'wall'), 1);
  assert.ok(blind.y === 4.2 && blind.x > 12, 'scrambled up');
  const kicked = staged(layout());
  const contact = (12 - HALF_WIDTH) / 6;
  step(kicked, contact - 0.05);
  const events = step(kicked, 3, s => (s.clock < contact - 0.05 + DT ? press('jump') : idle()));
  assert.equal(perfects(events, 'kick'), 1);
  assert.equal(stumbles(events), 0);
  assert.ok(kicked.y === 4.2 && kicked.x > 13);
  // Kicking late, after touching the wall, still works inside the window.
  const late = staged(layout());
  step(late, contact + 0.03);
  assert.equal(late.mode, 'cling');
  const lateEvents = step(late, 3, s => (s.mode === 'cling' && s.modeTime > 0.04 && s.modeTime < 0.07 ? press('jump') : idle()));
  assert.equal(perfects(lateEvents, 'kick'), 1);
});

test('hard landings: rolling in the window keeps speed, missing it stumbles', () => {
  const layout = () => ({ roofs: [[-20, 8, 0], [8, 60, -5.5]], speed: 6 });
  const blind = staged(layout());
  const events = step(blind, 3);
  assert.ok(events.some(e => e.type === 'land' && e.hard));
  assert.equal(stumbles(events, 'hard'), 1);
  const rolled = staged(layout());
  const rollEvents = step(rolled, 3, s => {
    const cue = s.cue();
    return cue && cue.move === 'roll' && cue.tau <= cue.window * 0.5 && !s.events.length && s.lastSlidePress < 0 ? press('slide') : idle();
  });
  assert.equal(perfects(rollEvents, 'roll'), 1);
  assert.equal(stumbles(rollEvents), 0);
  // A soft landing needs no roll and never stumbles.
  const soft = staged({ roofs: [[-20, 8, 0], [8, 60, -2]], speed: 6 });
  assert.equal(stumbles(step(soft, 3)), 0);
});

test('missing a gap is a fall; a near miss within the ledge reach mantles with a stumble instead', () => {
  const fall = staged({ roofs: [[-20, 8, 0], [14, 60, 0]], speed: 5 });
  const events = step(fall, 3);
  assert.equal(fall.status, 'fell');
  assert.ok(events.some(e => e.type === 'fell'));
  // Sweep the hold time on a jump across a gap: every outcome is a landing, a mantle (a stumble, alive) or a
  // fall, in that order as the hold shortens, and at least one hold ends in a mantle.
  const outcomes = [];
  for (let hold = 0.4; hold >= 0; hold -= 0.01) {
    const near = staged({ roofs: [[-20, 8, 0], [12.4, 60, 0.6]], speed: 6 });
    const at = (8 + HALF_WIDTH - 0.05) / 6;
    step(near, at);
    const start = near.clock;
    const nearEvents = step(near, 3, s => (s.clock < start + DT ? press('jump') : { jump: s.clock < start + hold, slide: false, jumpPressed: false, slidePressed: false }));
    outcomes.push(!near.alive ? 'fall' : stumbles(nearEvents, 'ledge') ? 'mantle' : 'land');
  }
  assert.ok(outcomes.includes('mantle') && outcomes.includes('land') && outcomes.includes('fall'), outcomes.join(' '));
  const order = { land: 0, mantle: 1, fall: 2 };
  for (let i = 1; i < outcomes.length; i++) assert.ok(order[outcomes[i]] >= order[outcomes[i - 1]], outcomes.join(' '));
});

test('zip-lines catch a runner who simply runs off the launch edge', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const sim = new RunSim(seeded(seed), { pursuit: false, floorSpeed: true });
    // Run with a perfect bot that never presses for zips: it must still be carried across.
    const bot = makeBot(cue => (cue.move === 'zip' ? -99 : cue.window * 0.5));
    const events = run(sim, bot, { until: 2400 });
    assert.ok(sim.alive, `seed ${seed}: ${sim.status} at ${sim.distance.toFixed(0)} m`);
    const zips = events.filter(e => e.type === 'zip').length;
    assert.ok(zips >= 1 && zips === events.filter(e => e.type === 'release').length, `seed ${seed}: ${zips} zips`);
    assert.equal(perfects(events, 'zip'), 0);
  }
});

test('collapsing canopies drop the runner onto the deck: a hard landing to roll', () => {
  let checked = 0;
  for (let seed = 1; seed <= 12 && checked < 3; seed++) {
    const sim = new RunSim(seeded(seed), { pursuit: false });
    const events = run(sim, makeBot(), { until: 2600 });
    assert.ok(sim.alive);
    const collapse = events.findIndex(e => e.type === 'collapse');
    if (collapse < 0) continue;
    checked++;
    const after = events.slice(collapse);
    const land = after.find(e => e.type === 'land');
    assert.ok(land && land.hard, 'falling through the canopy is a hard landing');
    assert.ok(after.some(e => e.type === 'perfect' && e.move === 'roll'));
  }
  assert.ok(checked >= 2, `canopies seen on ${checked} runs`);
});

test('perfect play outruns the drone through every district without a stumble', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const sim = new RunSim(seeded(seed));
    const events = run(sim, makeBot(), { until: 2700 });
    assert.ok(sim.alive, `seed ${seed}: ${sim.status} at ${sim.distance.toFixed(0)} m`);
    assert.equal(sim.stumbles, 0, `seed ${seed}`);
    assert.ok(sim.lead > LEAD_MAX * 0.6, `seed ${seed}: lead ${sim.lead.toFixed(1)}`);
    const moves = new Set(events.filter(e => e.type === 'perfect').map(e => e.move));
    for (const move of ['vault', 'slide', 'edge', 'kick', 'roll']) assert.ok(moves.has(move), `seed ${seed} used ${[...moves]}`);
    assert.ok(events.filter(e => e.type === 'district').length >= 5);
  }
});

test('every gap and set piece is passable at the floor speed (no drone)', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const sim = new RunSim(seeded(seed), { pursuit: false, floorSpeed: true });
    run(sim, makeBot(), { until: 3200, seconds: 900 });
    assert.ok(sim.alive && sim.distance >= 3200, `seed ${seed}: ${sim.status} at ${sim.distance.toFixed(0)} m`);
    assert.equal(sim.stumbles, 0);
  }
});

test('the light closes in on a runner who never times a move: warned, then caught', () => {
  for (const seed of [1, 2, 3]) {
    const sim = new RunSim(seeded(seed));
    // Presses everything 0.32 s early: clean, but never perfect.
    const events = run(sim, makeBot(cue => (cue.move === 'kick' ? cue.window * 0.5 : 0.32)), { seconds: 400 });
    assert.equal(sim.status, 'caught', `seed ${seed}`);
    const warn = events.findIndex(e => e.type === 'warn');
    const caught = events.findIndex(e => e.type === 'caught');
    assert.ok(warn >= 0 && warn < caught, 'a warning comes first');
    assert.ok(sim.distance < 1500, `caught at ${sim.distance.toFixed(0)} m`);
    assert.ok(sim.distance > 250, 'but not instantly');
  }
  // Stumbling everywhere is caught much sooner than clean play.
  const blind = new RunSim(seeded(1));
  run(blind, makeBot(cue => (cue.move === 'edge' || cue.move === 'zip' ? 0.2 : -99)), { seconds: 300 });
  assert.equal(blind.status, 'caught');
  assert.ok(blind.distance < 400 && blind.stumbles > 0);
});

test('more precise play lasts longer', () => {
  const reach = share => {
    let total = 0;
    for (const seed of [1, 2, 3]) {
      const random = seeded(seed + 50);
      const decided = new Map();
      const sim = new RunSim(seeded(seed));
      run(sim, makeBot(cue => {
        const key = `${cue.move}${Math.round(cue.x * 10)}`;
        if (!decided.has(key)) decided.set(key, random() < share);
        return cue.move === 'kick' || decided.get(key) ? cue.window * 0.5 : 0.3;
      }), { seconds: 700 });
      total += sim.distance;
    }
    return total / 3;
  };
  const low = reach(0.2);
  const mid = reach(0.5);
  const high = reach(0.85);
  assert.ok(low < mid && mid < high, `${low.toFixed(0)} < ${mid.toFixed(0)} < ${high.toFixed(0)}`);
});

test('the start is fair: a long runway, a full lead and no obstacles before the first gap', () => {
  const sim = new RunSim(seeded(4));
  assert.equal(sim.lead, LEAD_START);
  assert.ok(LEAD_START > LEAD_WARN * 2);
  const first = sim.course.roofs[0];
  assert.ok(first.x1 >= 25);
  assert.ok(sim.course.obstacles.every(o => o.x0 > first.x1));
  const start = sim.speed;
  assert.ok(start > speedsAt(0).drone, 'starts out faster than the drone');
});

/** A sim on a copy of part of a generated course (roofs i-1 to i+2 and their canopy panels; no obstacles or zips). */
function slice(course, i) {
  const sim = new RunSim(seeded(1), { pursuit: false });
  const roofs = course.roofs.slice(i - 1, i + 3).map(r => ({ ...r }));
  const x0 = roofs[0].x0;
  const x1 = roofs[roofs.length - 1].x1;
  sim.course.roofs = roofs;
  sim.course.obstacles = [];
  sim.course.zips = [];
  sim.course.panels = course.panels.filter(p => p.x0 >= x0 && p.x1 <= x1).map(p => ({ ...p }));
  sim.course.cursor = 1e9;
  return sim;
}

/** Jumps off the end of roof i-1 at a steady `speed`, pressing `tau` s before its edge (negative: in coyote time) and holding jump until touchdown. */
function fullHold(course, i, speed, tau) {
  const sim = slice(course, i);
  const prev = sim.course.roofs[0];
  const edge = prev.x1 + HALF_WIDTH;
  sim.x = edge - Math.max(tau, 0) * speed - 1.5;
  sim.y = sim.lastTop = prev.top;
  sim.speed = speed;
  sim.support = sim.supportAt(sim.x, sim.y);
  let pressed = null;
  for (let k = 0; k < 900 && sim.alive; k++) {
    const input = { jump: pressed !== null, slide: false, jumpPressed: false, slidePressed: false };
    if (pressed === null && sim.x >= edge - tau * speed) { pressed = sim.clock; input.jump = input.jumpPressed = true; }
    sim.speed = speed;
    sim.step(SUB_STEP, input);
    if (pressed !== null && sim.clock - pressed > 0.05 && sim.grounded && !sim.support?.panel) break;
  }
  return sim;
}

test('a jump held until touchdown never falls: at any speed, from the earliest perfect press to the end of coyote time', () => {
  let checked = 0;
  let booms = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const course = new Course(seeded(seed));
    course.extend(5600);
    const roofs = course.roofs;
    for (let i = 1; i < roofs.length - 3; i++) {
      const prev = roofs[i - 1];
      const roof = roofs[i];
      // Kick walls are climbed and zip-lines carry the runner: neither is jumped.
      if (roof.wall || roof.zipIn) continue;
      const { floor } = speedsAt(Math.max(0, prev.x1 - 6));
      const { top } = speedsAt(prev.x1 + 1);
      for (const speed of [floor, (floor + top) / 2, top]) {
        for (const tau of [timingWindow(prev.x1), 0, -(COYOTE - 0.02)]) {
          const sim = fullHold(course, i, speed, tau);
          checked++;
          if (roof.kind === 'boom') booms++;
          assert.ok(sim.alive, `seed ${seed}: full hold at ${speed.toFixed(1)} m/s, ${(tau * 1000).toFixed(0)} ms before the edge at ${prev.x1.toFixed(0)} m onto a ${roof.kind} fell (${sim.fallReason})`);
        }
      }
    }
  }
  assert.ok(checked > 3000 && booms > 150, `checked ${checked} jumps, ${booms} onto crane booms`);
  // The generator's promise behind it: whatever follows a gap reaches past the furthest full-hold landing.
  assert.ok(longestJump(16, 0) > longestJump(8, 0) && longestJump(16, -5) > longestJump(16, 0));
});

test('a fall says how it happened: ran off the edge, came up short, or flew past the landing', () => {
  const gap = { roofs: [[-20, 8, 0], [14, 60, 0]], speed: 6 };
  const runoff = staged(gap);
  const runEvents = step(runoff, 4);
  assert.equal(runoff.status, 'fell');
  assert.equal(runoff.fallReason, 'runoff');
  assert.equal(runEvents.find(e => e.type === 'fell')?.fall, 'runoff');
  const short = staged(gap);
  step(short, (8 + HALF_WIDTH) / 6 - 0.1);
  step(short, DT, press('jump', false));
  step(short, 4);
  assert.equal(short.fallReason, 'short');
  // A short one-way boom with a high roof well past it: a held jump passes over the boom and meets the roof's face.
  const long = staged({ roofs: [[-20, 8, 0], [10, 13, -0.5, { kind: 'boom', oneWay: true }], [21, 60, 1.5]], speed: 10 });
  step(long, (8 + HALF_WIDTH) / 10 - 0.05);
  step(long, DT, press('jump'));
  step(long, 4, { jump: true, slide: false, jumpPressed: false, slidePressed: false });
  assert.equal(long.status, 'fell');
  assert.equal(long.fallReason, 'long');
});

test('keyboard: a slide pressed just after a jump buffers for the landing and never slams the runner into the gap', () => {
  for (const after of [0.05, 0.1, 0.14]) {
    const sim = staged({ roofs: [[-20, 10, 0], [13, 60, -1]], speed: 7 });
    step(sim, (10 + HALF_WIDTH) / 7 - 0.06);
    const start = sim.clock;
    let slid = false;
    const events = step(sim, 2.5, s => {
      if (s.clock < start + DT / 2) return press('jump');
      if (!slid && s.clock >= start + after - 1e-9) { slid = true; return { jump: true, slide: true, jumpPressed: false, slidePressed: true }; }
      return { jump: true, slide: false, jumpPressed: false, slidePressed: false };
    });
    assert.ok(sim.alive && sim.x > 13, `S ${after * 1000} ms after the jump: ${sim.status}`);
    assert.ok(!events.some(e => e.type === 'tuck' || e.type === 'bonk'));
  }
});

/** A touch that comes down at `down` (a jump press) and is read as a swipe `lag` s later, then stays down. */
const touch = (down, lag, { swipe = true, held = true } = {}) => {
  let swiped = false;
  return s => {
    const age = s.clock - down;
    if (age < DT / 2) return { jump: true, slide: false, jumpPressed: true, slidePressed: false, undecided: true };
    if (age < lag - 1e-9) return { jump: true, slide: false, jumpPressed: false, slidePressed: false, undecided: true };
    if (swipe && !swiped) { swiped = true; return { jump: true, slide: true, jumpPressed: false, slidePressed: true, swipeAge: age, sameTouch: true }; }
    return { jump: held, slide: false, jumpPressed: false, slidePressed: false };
  };
};

test('touch: a swipe is timed from when the finger came down, and takes back the hop that touch began', () => {
  const w = timingWindow(0);
  const pipe = () => staged({ roofs: [[-20, 60, 0]], obstacles: [{ kind: 'pipe', x0: 10, x1: 10.5, y0: PIPE_LOW, y1: PIPE_HIGH }], speed: 8 });
  // Runs until the pipe is `before` seconds away (speed drifts towards the pace, so go by distance).
  const until = (sim, before) => { while (10 - (sim.x + HALF_WIDTH) > before * sim.speed) sim.step(SUB_STEP, idle()); };
  for (const lag of [0.05, 0.083, 0.12]) {
    for (const before of [w - 0.01, w * 0.5, 0.03]) {
      const sim = pipe();
      until(sim, before);
      const events = step(sim, 2, touch(sim.clock, lag));
      const label = `finger down ${(before * 1000).toFixed(0)} ms before the pipe, swipe read after ${lag * 1000} ms`;
      assert.equal(stumbles(events), 0, label);
      assert.equal(perfects(events, 'slide'), 1, label);
      assert.ok(events.some(e => e.type === 'tuck'), `${label}: the hop is taken back`);
    }
  }
  // Swiping well before the window still ducks under, just without the boost.
  const early = pipe();
  until(early, w + 0.15);
  const earlyEvents = step(early, 2, touch(early.clock, 0.08));
  assert.equal(stumbles(earlyEvents), 0);
  assert.equal(perfects(earlyEvents, 'slide'), 0);
  // A touch that stays a tap hops into the pipe: one stumble, once the touch is read.
  const tap = pipe();
  until(tap, 0.05);
  const tapEvents = step(tap, 2, touch(tap.clock, 0.14, { swipe: false, held: false }));
  assert.equal(stumbles(tapEvents, 'pipe'), 1);
  // A held long jump that later swipes down is not taken back: the slide waits for the landing.
  const heldSim = staged({ roofs: [[-20, 60, 0]], speed: 8 });
  step(heldSim, 0.3);
  const heldEvents = step(heldSim, 2, touch(heldSim.clock, SWIPE_CREDIT + 0.15));
  assert.ok(!heldEvents.some(e => e.type === 'tuck'));
});

test('touch: a swipe at a gap edge never takes back the leap', () => {
  for (const lag of [0.05, 0.1]) {
    const sim = staged({ roofs: [[-20, 10, 0], [13.5, 60, 0]], speed: 8 });
    step(sim, (10 + HALF_WIDTH) / 8 - 0.05);
    const events = step(sim, 2.5, touch(sim.clock, lag));
    assert.ok(sim.alive && sim.x > 14, `swipe read after ${lag * 1000} ms: ${sim.status}`);
    assert.ok(!events.some(e => e.type === 'tuck'));
    assert.equal(perfects(events, 'edge'), 1);
  }
});

test('touch: a swipe begun around a hard landing rolls even when it is read after touchdown, with no extra hop', () => {
  const layout = { roofs: [[-20, 8, 0], [8, 60, -5.5]], speed: 6 };
  // [seconds before touchdown the finger comes down (negative: after), recognition lag, rolls?]
  for (const [early, lag, rolls] of [[0.1, 0.12, true], [0.05, 0.08, true], [0.02, 0.06, true], [-0.04, 0.07, true], [-ROLL_LATE - 0.04, 0.07, false]]) {
    const sim = staged(layout);
    const events = [];
    const wait = () => events.push(...sim.step(SUB_STEP, idle()));
    if (early >= 0) {
      while (!(sim.mode === 'air' && sim.predict().landed && sim.predict().time <= early + 1e-9)) wait();
    } else {
      while (!events.some(e => e.type === 'land' && e.hard)) wait();
      for (let t = SUB_STEP; t < -early - 1e-9; t += SUB_STEP) wait();
    }
    const input = touch(sim.clock, lag);
    for (let k = 0; k < 240; k++) events.push(...sim.step(SUB_STEP, input(sim)));
    const label = `finger down ${(early * 1000).toFixed(0)} ms before touchdown, read after ${lag * 1000} ms`;
    assert.equal(perfects(events, 'roll'), rolls ? 1 : 0, label);
    assert.equal(stumbles(events), rolls ? 0 : 1, label);
    if (rolls) assert.equal(events.filter(e => e.type === 'jump').length, 0, `${label}: no hop`);
  }
});

test('the edge cue stays up through coyote time', () => {
  const sim = staged({ roofs: [[-20, 10, 0], [13, 60, 0]], speed: 6 });
  while (sim.mode !== 'air') sim.step(SUB_STEP, idle());
  sim.step(SUB_STEP * 4, idle());
  assert.ok(sim.coyote > 0);
  const cue = sim.cue();
  assert.ok(cue && cue.move === 'edge' && cue.tau < 0 && cue.tau >= -cue.late, JSON.stringify(cue));
  while (sim.coyote > 0) sim.step(SUB_STEP, idle());
  assert.notEqual(sim.cue()?.move, 'edge');
});

test('every district shows its own set piece several times, and set pieces get denser with distance', () => {
  const seeds = 20;
  const districts = 10;
  const total = Array.from({ length: districts }, () => 0);
  for (let seed = 1; seed <= seeds; seed++) {
    const course = new Course(seeded(seed));
    course.extend(districts * DISTRICT_LENGTH + 300);
    const counts = Array.from({ length: districts }, () => ({ wall: 0, crane: 0, zip: 0, canopy: 0 }));
    const add = (kind, d) => {
      if (d >= districts) return;
      assert.ok(d >= SET_PIECES[kind], `seed ${seed}: ${kind} in district ${d}, before it is introduced`);
      counts[d][kind]++;
      total[d]++;
    };
    for (const roof of course.roofs) {
      if (roof.wall) add('wall', roof.district);
      if (roof.kind === 'boom') add('crane', districtAt(roof.x0 - roof.gap));
    }
    for (const zip of course.zips) add('zip', zip.district);
    for (const group of new Set(course.panels.map(p => p.group))) add('canopy', course.panels.find(p => p.group === group).district);
    for (let d = 1; d < districts; d++) {
      const signature = signatureOf(d);
      if (signature) assert.ok(counts[d][signature] >= signatureCount(d), `seed ${seed}: ${districtKey(d)} (district ${d + 1}) has ${counts[d][signature]} × ${signature}`);
    }
  }
  assert.equal(signatureOf(0), null);
  assert.ok(signatureCount(2) >= 3 && signatureCount(7) >= 2);
  const early = (total[1] + total[2]) / 2 / seeds;
  const late = (total[6] + total[7] + total[8]) / 3 / seeds;
  assert.ok(late > early + 0.5, `set pieces per district: ${early.toFixed(1)} early, ${late.toFixed(1)} later`);
});
