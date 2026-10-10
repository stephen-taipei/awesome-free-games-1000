import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync('src/games/action/game-344-hydra-slayer/logic.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const logic = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const {
  BEASTS, ATTACKS, ATTACK_IDS, TIERS, PARRY, DODGE, COMBO, FINISHER, MIN_WINDUP, MIN_ACTIVE_GAP, HURT_TIME, RAGE_SPEEDUP,
  WALL_X, EDGE_X, EDGE_STOP, HERO_HALF, FOCUS_MAX, FALL_DAMAGE, FALL_TIME, RESPAWN_X, GUARD_MULT, STAGGER_BONUS, SONG_WINDUP,
  HOUND_GAP, HYDRA_DOUBLE_GAP, BURST_GAP, NOTE_GAP, HYDRA_REST,
  Duel, NO_INPUT, windupFor, phaseOf, botInput, createBot,
  LADDER, rungOf, isUnlocked, nightmareOpen, nextRung, rungAt, encodeTime, decodeTime, formatTime, timeKey, medalKey, PROGRESS_KEY,
} = logic;

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const DT = 1 / 120;
const HARDEST = 1;
const BEAST_OF = { hydra: 'hydra', hound: 'hound', siren: 'siren', kraken: 'kraken' };
const ownerOf = attack => BEASTS.find(beast => attack.startsWith(beast));
const press = (extra = {}) => ({ ...NO_INPUT, ...extra });

/** A duel whose beast never attacks on its own, so a test can stage single strikes. */
function quiet(beast, tier = 0, seed = 1) {
  const duel = new Duel(beast, tier, seeded(seed));
  duel.beast.cooldown = Infinity;
  return duel;
}

/** Stages one strike, steps until `when(strike)`, sends `input` once, then runs until it resolves. */
function stage(duel, attack, input, lead, setup = () => {}) {
  setup(duel);
  const s = duel.beast.strike(attack, 0);
  const events = [];
  let sent = false;
  for (let i = 0; i < 2000 && !s.outcome; i++) {
    const due = !sent && s.t >= 0 && s.windup - s.t <= lead;
    if (due) sent = true;
    events.push(...duel.step(DT, due ? input : NO_INPUT));
    if (due && input.dodge) duel.hero.dodgeDir = 0; // roll in place: only the i-frames may save the hero
  }
  return { s, events };
}

/** Where the hero must stand for each attack to reach them. */
function placeFor(attack) {
  return duel => {
    const h = duel.hero;
    if (attack === 'houndBite' || attack === 'houndSnap') h.x = duel.beast.front - 1;
    else if (attack === 'sirenShriek' || attack === 'krakenBeak') h.x = EDGE_X - 1;
    else if (attack === 'hydraSpit') h.x = -3;
    else h.x = 1;
    if (attack === 'krakenBeak') { duel.beast.head = 1; duel.beast.up = 99; }
  };
}

const fight = (beast, tier, seed, makeInput, limit = 300) => {
  const duel = new Duel(beast, tier, seeded(seed));
  const actives = [];
  while (duel.state === 'fight' && duel.time < limit) {
    for (const event of duel.step(DT, makeInput(duel))) if (event.type === 'strike') actives.push(duel.time);
  }
  return { duel, actives };
};

test('every attack winds up for at least 300 ms at the hardest tier, fully enraged', () => {
  assert.equal(TIERS.length, 2);
  for (const id of ATTACK_IDS) {
    for (const tier of [0, 1]) for (const rage of [0, 0.5, 1]) {
      const windup = windupFor(ATTACKS[id].windup, tier, rage);
      assert.ok(windup >= MIN_WINDUP, `${id} winds up for ${windup.toFixed(3)} s at tier ${tier}, rage ${rage}`);
    }
  }
  assert.ok(windupFor(SONG_WINDUP, HARDEST, 1) >= MIN_WINDUP, 'the song has a tell too');
  assert.ok(windupFor(1, HARDEST, 1) === TIERS[HARDEST].windup * (1 - RAGE_SPEEDUP));
  // Rage can never push past the cap.
  assert.equal(windupFor(1, 0, 5), windupFor(1, 0, 1));
});

test('the parry guard and the roll i-frames each cover every active window', () => {
  const iframes = DODGE.iEnd - DODGE.iStart;
  for (const id of ATTACK_IDS) {
    const active = ATTACKS[id].active;
    assert.ok(iframes >= active + 0.05, `${id}: a roll covers its ${active} s active window with room to spare`);
    if (ATTACKS[id].parryable) assert.ok(PARRY.guard >= active, `${id}: the parry guard outlasts its active window`);
    assert.ok(active > 0 && ATTACKS[id].recovery > 0);
  }
  for (const tier of [0, 1]) assert.ok(TIERS[tier].perfect >= 0.1 && TIERS[tier].perfect < PARRY.guard, 'perfect window is tight but humanly possible');
  // The roll can be started in time for any tell: i-frames begin almost at once.
  assert.ok(DODGE.iStart <= 0.05);
});

test('a parry pressed inside the perfect window turns every gold attack, at both tiers', () => {
  for (const id of ATTACK_IDS.filter(a => ATTACKS[a].parryable)) {
    for (const tier of [0, 1]) {
      const duel = quiet(ownerOf(id), tier);
      const { s, events } = stage(duel, id, press({ parry: true }), duel.perfectWindow / 2, placeFor(id));
      assert.equal(s.outcome, 'perfect', `${id} tier ${tier}`);
      assert.equal(duel.hero.hp, 100, `${id}: a perfect parry costs nothing`);
      assert.ok(events.some(e => e.type === 'perfect'));
      assert.ok(duel.hero.focus > 0, 'perfect parries build Focus');
    }
  }
});

test('a late parry blocks for chip damage, and crimson attacks ignore parries', () => {
  for (const id of ATTACK_IDS) {
    const duel = quiet(ownerOf(id), 0);
    const lead = ATTACKS[id].parryable ? duel.perfectWindow + 0.08 : duel.perfectWindow / 2;
    const { s } = stage(duel, id, press({ parry: true }), lead, placeFor(id));
    if (ATTACKS[id].parryable) {
      assert.equal(s.outcome, 'block', id);
      const chip = Math.max(1, Math.round(ATTACKS[id].damage * PARRY.chip));
      assert.equal(duel.hero.hp, 100 - chip, `${id} chip damage`);
    } else {
      assert.equal(s.outcome, 'hit', `${id} cannot be parried`);
      assert.equal(duel.hero.hp, 100 - ATTACKS[id].damage);
    }
  }
});

test('a roll in place started just before the hit avoids every attack, at both tiers', () => {
  for (const id of ATTACK_IDS) {
    for (const tier of [0, 1]) {
      const duel = quiet(ownerOf(id), tier);
      const { s, events } = stage(duel, id, press({ dodge: true }), 0.04, placeFor(id));
      assert.equal(s.outcome, 'evade', `${id} tier ${tier}`);
      assert.equal(duel.hero.hp, 100);
      assert.ok(events.some(e => e.type === 'evade'), 'a close roll is rewarded');
    }
  }
});

test('a roll that ends too early, or no defence at all, gets the hero hit', () => {
  const duel = quiet('kraken', 0);
  const { s } = stage(duel, 'krakenBurst', press({ dodge: true }), DODGE.iEnd + 0.1, placeFor('krakenBurst'));
  assert.equal(s.outcome, 'hit', 'i-frames had already ended');
  const idle = quiet('hound', 0);
  const r = stage(idle, 'houndSnap', NO_INPUT, 0, placeFor('houndSnap'));
  assert.equal(r.s.outcome, 'hit');
  assert.equal(idle.hero.action, 'hurt');
  assert.ok(idle.hero.vx < 0, 'hits knock the hero back from the beast');
});

test('chained strikes are always far enough apart to answer each one', () => {
  // Inside one plan: Hydra double bite, Hound triple bite, Kraken twin burst, Siren notes.
  for (const tier of [0, 1]) {
    for (const rage of [0, 1]) {
      const g = TIERS[tier].gap;
      const gaps = {
        hydra: HYDRA_DOUBLE_GAP * g,
        hound: HOUND_GAP * g * (1 - 0.15 * rage),
        kraken: BURST_GAP * g,
        siren: NOTE_GAP * g * (1 - 0.2 * rage),
      };
      for (const [beast, gap] of Object.entries(gaps)) {
        assert.ok(gap >= MIN_ACTIVE_GAP, `${beast} chain gap ${gap.toFixed(3)} at tier ${tier}, rage ${rage}`);
      }
    }
  }
  // A hit stuns for less than the gap, and a perfect parry recovers in time to catch the next strike perfectly.
  assert.ok(HURT_TIME + 0.02 < MIN_ACTIVE_GAP);
  assert.ok(PARRY.recover + TIERS[1].perfect < MIN_ACTIVE_GAP);
  // And in real fights, across every plan, no two strikes ever land closer together.
  for (const beast of BEASTS) for (const tier of [0, 1]) for (const seed of [1, 2, 3]) {
    for (const mode of ['bot', 'idle']) {
      const random = seeded(seed + 50);
      const bot = createBot(random);
      const { actives } = fight(beast, tier, seed, duel => (mode === 'bot' ? botInput(duel, bot, random) : NO_INPUT), 120);
      for (let i = 1; i < actives.length; i++) {
        assert.ok(actives[i] - actives[i - 1] >= MIN_ACTIVE_GAP - DT, `${beast} tier ${tier} seed ${seed}: strikes ${(actives[i] - actives[i - 1]).toFixed(3)} s apart`);
      }
    }
  }
});

test('every beast is beatable by a scripted parry-and-roll bot, at both tiers', () => {
  for (const beast of BEASTS) for (const tier of [0, 1]) {
    for (let seed = 1; seed <= 10; seed++) {
      const random = seeded(seed * 31 + tier);
      const bot = createBot(random);
      const { duel } = fight(beast, tier, seed, d => botInput(d, bot, random));
      assert.equal(duel.state, 'won', `${beast} tier ${tier} seed ${seed} (hero hp ${duel.hero.hp}, ${duel.time.toFixed(1)} s)`);
      assert.ok(duel.hero.hp > 0);
      assert.ok(duel.time > 8, `${beast} should not melt in ${duel.time.toFixed(1)} s`);
    }
  }
});

test('a sloppy bot that mostly blocks still clears every Normal beast', () => {
  for (const beast of BEASTS) {
    for (let seed = 1; seed <= 6; seed++) {
      const random = seeded(seed * 17 + 3);
      const bot = createBot(random, { reaction: 0.3 });
      const duel = new Duel(beast, 0, seeded(seed));
      while (duel.state === 'fight' && duel.time < 600) {
        bot.lead = 0.2 + random() * 1.9;
        duel.step(1 / 60, botInput(duel, bot, random));
      }
      assert.equal(duel.state, 'won', `${beast} seed ${seed}`);
    }
  }
});

test('a hero who does nothing loses to every beast: there is no safe corner', () => {
  for (const beast of BEASTS) for (const tier of [0, 1]) {
    for (const start of [WALL_X + HERO_HALF, -2.2, 2]) {
      const duel = new Duel(beast, tier, seeded(5));
      duel.hero.x = start;
      while (duel.state === 'fight' && duel.time < 150) duel.step(DT, NO_INPUT);
      assert.equal(duel.state, 'lost', `${beast} tier ${tier} from x ${start}`);
    }
  }
});

test('Hydra heads regrow unless a Focus finisher burns them', () => {
  const duel = quiet('hydra', 0);
  const hydra = duel.beast;
  const head = hydra.heads[0];
  // Sever head 0 with normal hits while it lies low.
  head.low = 99;
  head.x = 1.8;
  duel.hero.x = 0.5;
  for (let i = 0; i < 4000 && head.state === 'alive'; i++) duel.step(DT, press({ attack: i % 6 === 0 }));
  assert.equal(head.state, 'stump');
  assert.ok(hydra.hurtboxes(false).every(b => b.part !== 0), 'normal swings cannot touch a stump');
  for (let t = 0; t < TIERS[0].regrow + 0.1; t += DT) duel.step(DT, NO_INPUT);
  assert.equal(head.state, 'alive', 'the severed head grew back');
  assert.equal(head.hp, head.max);
  assert.ok(hydra.rage > 0, 'regrowth enrages the Hydra');
  // Burn it: a finisher removes it for good, even from full health.
  duel.hero.focus = FOCUS_MAX;
  duel.hero.x = HYDRA_REST[0] - 2;
  let burned = false;
  for (let i = 0; i < 240 && !burned; i++) burned = duel.step(DT, press({ finisher: i === 0 })).some(e => e.type === 'burn');
  assert.ok(burned);
  assert.equal(head.state, 'gone');
  for (let t = 0; t < 20; t += DT) duel.step(DT, NO_INPUT);
  assert.equal(head.state, 'gone', 'burned heads never return');
  assert.equal(duel.hero.focus, 0, 'the finisher spent the Focus');
});

test('the Hydra cannot be beaten without finishers', () => {
  for (const tier of [0, 1]) {
    const random = seeded(9);
    const bot = createBot(random, { useFinisher: false });
    const { duel } = fight('hydra', tier, 9, d => botInput(d, bot, random), 240);
    assert.equal(duel.state, 'fight');
    assert.ok(duel.beast.heads.some(h => h.state !== 'gone'));
  }
});

test('the Siren song drags the hero over the edge, and parrying a note breaks it', () => {
  // Pull: a hero standing near the edge during the song is dragged off.
  const duel = new Duel('siren', 0, seeded(2));
  duel.beast.cooldown = 0;
  duel.beast.sinceSong = 5;
  duel.hero.x = EDGE_X - EDGE_STOP;
  let fell = null;
  for (let i = 0; i < 2400 && !fell; i++) fell = duel.step(DT, NO_INPUT).find(e => e.type === 'fall');
  assert.ok(fell, 'the song dragged the hero off the cliff');
  assert.equal(fell.damage, FALL_DAMAGE);
  assert.equal(duel.hero.hp, 100 - FALL_DAMAGE);
  assert.equal(duel.pull, 0, 'falling ends the song');
  for (let t = 0; t < FALL_TIME + 0.1; t += DT) duel.step(DT, NO_INPUT);
  assert.equal(duel.hero.action, 'idle');
  assert.equal(duel.hero.x, RESPAWN_X);
  // Walking alone never takes you over the edge.
  const walker = quiet('siren', 0);
  for (let t = 0; t < 4; t += DT) walker.step(DT, press({ move: 1 }));
  assert.ok(walker.hero.x <= EDGE_X - EDGE_STOP + 1e-9 && walker.hero.action !== 'fall');
  // Parry a note: the pull stops at once and the Siren drops onto the ledge.
  const parry = new Duel('siren', 0, seeded(3));
  parry.beast.cooldown = 0;
  parry.beast.sinceSong = 5;
  parry.hero.x = 0;
  let broke = false;
  let pulled = false;
  for (let i = 0; i < 2400 && !broke; i++) {
    const note = parry.beast.strikes.find(s => s.attack === 'sirenNote' && phaseOf(s) === 'windup');
    const due = note && note.windup - note.t <= parry.perfectWindow / 2 && parry.heroReady();
    if (parry.pull > 0) pulled = true;
    broke = parry.step(DT, press({ parry: !!due })).some(e => e.type === 'songBreak');
  }
  assert.ok(pulled && broke);
  assert.equal(parry.pull, 0);
  assert.equal(parry.beast.mode, 'ground');
  assert.ok(parry.beast.stagger > 0);
  assert.ok(!parry.beast.strikes.some(s => s.attack === 'sirenNote' && !s.outcome && s.t < s.windup), 'remaining notes are cancelled');
});

test('Kraken bursts land exactly where their floor tell appeared', () => {
  for (const tier of [0, 1]) {
    const duel = new Duel('kraken', tier, seeded(4));
    const random = seeded(8);
    const seen = new Map();
    let bursts = 0;
    while (duel.state === 'fight' && duel.time < 90) {
      const move = Math.sin(duel.time * 1.7); // keep wandering so pinned tells are tested against a moving hero
      for (const event of duel.step(DT, press({ move }))) {
        if (event.type === 'telegraph' && event.strike.attack === 'krakenBurst') {
          const s = event.strike;
          assert.ok(Math.abs(s.target - Math.max(WALL_X + 1, Math.min(EDGE_X - 0.9, duel.hero.x))) < 0.06, 'the tell appears under the hero');
          seen.set(s.id, [s.x0, s.x1]);
          assert.ok(s.windup >= MIN_WINDUP);
        }
        if (event.type === 'strike' && event.strike.attack === 'krakenBurst') {
          const s = event.strike;
          assert.deepEqual([s.x0, s.x1], seen.get(s.id), 'the hitbox never moved after the tell');
          bursts++;
        }
      }
      void random;
    }
    assert.ok(bursts >= 3, `saw ${bursts} bursts`);
  }
});

test('the Hound bites in a staggered rhythm, and parrying it staggers the Hound', () => {
  const duel = quiet('hound', 0);
  const hound = duel.beast;
  duel.hero.x = hound.front - 1.2;
  const gap = hound.chainGap();
  for (let i = 0; i < 3; i++) { const s = hound.strike('houndBite', i, i * gap); s.last = i === 2; }
  const actives = [];
  for (let i = 0; i < 600 && hound.stagger === 0; i++) {
    const next = hound.strikes.filter(s => !s.outcome && s.t >= 0).sort((a, b) => (a.windup - a.t) - (b.windup - b.t))[0];
    const due = next && next.windup - next.t <= duel.perfectWindow / 2 && duel.heroReady();
    for (const event of duel.step(DT, press({ parry: !!due }))) if (event.type === 'strike') actives.push(duel.time);
  }
  assert.equal(duel.stats.perfects, 3);
  assert.ok(hound.stagger > 1.5, 'three perfect parries earn a long stagger');
  assert.equal(actives.length, 3);
  assert.ok(Math.abs(actives[1] - actives[0] - gap) < 0.02 && Math.abs(actives[2] - actives[1] - gap) < 0.02);
});

test('hits glance off a guarded beast and bite deep into a staggered one', () => {
  const guarded = quiet('hound', 0);
  guarded.hero.x = guarded.beast.front - 1;
  const hp0 = guarded.beast.hp;
  let land = null;
  for (let i = 0; i < 60 && !land; i++) land = guarded.step(DT, press({ attack: i === 0 })).find(e => e.type === 'land');
  assert.ok(land.guarded);
  assert.equal(hp0 - guarded.beast.hp, Math.max(1, Math.round(COMBO[0].damage * GUARD_MULT)));
  const open = quiet('hound', 0);
  open.hero.x = open.beast.front - 1;
  open.beast.stagger = 2;
  const hp1 = open.beast.hp;
  land = null;
  for (let i = 0; i < 60 && !land; i++) land = open.step(DT, press({ attack: i === 0 })).find(e => e.type === 'land');
  assert.ok(!land.guarded && land.staggered);
  assert.equal(hp1 - open.beast.hp, Math.round(COMBO[0].damage * STAGGER_BONUS));
});

test('hero rules: buffered combo, parry recovery, stamina-gated rolls, Focus-gated finisher', () => {
  const duel = quiet('hound', 0);
  duel.hero.x = duel.beast.front - 1;
  const swings = [];
  for (let i = 0; i < 180; i++) for (const e of duel.step(DT, press({ attack: i % 10 === 0 }))) if (e.type === 'swing') swings.push(e.combo);
  assert.deepEqual(swings.slice(0, 3), [0, 1, 2], 'presses during a hit chain the next one');
  // Rolls: three in a row empty the stamina, the fourth is refused.
  const roller = quiet('hound', 0);
  roller.hero.x = 0;
  let tired = 0;
  let rolls = 0;
  for (let i = 0; i < 400; i++) for (const e of roller.step(DT, press({ dodge: i % 25 === 0 }))) { if (e.type === 'tired') tired++; if (e.type === 'dodge') rolls++; }
  assert.ok(rolls >= 3 && tired >= 1);
  // A whiffed parry leaves a recovery where nothing else can start.
  const parrier = quiet('hound', 0);
  parrier.hero.x = 0;
  parrier.step(DT, press({ parry: true }));
  for (let t = 0; t < PARRY.guard + 0.05; t += DT) parrier.step(DT, NO_INPUT);
  assert.equal(parrier.hero.action, 'parry');
  assert.equal(parrier.heroReady(), false);
  // Finisher: refused without Focus, refused out of reach (Focus kept), and refunded when it whiffs.
  const finisher = quiet('hound', 0);
  finisher.hero.x = -4;
  finisher.step(DT, press({ finisher: true }));
  assert.equal(finisher.hero.action, 'idle');
  finisher.hero.focus = FOCUS_MAX;
  assert.ok(finisher.step(DT, press({ finisher: true })).some(e => e.type === 'far'));
  assert.equal(finisher.hero.focus, FOCUS_MAX);
  finisher.hero.x = finisher.beast.front - 1;
  finisher.step(DT, press({ finisher: true }));
  assert.equal(finisher.hero.action, 'finisher');
  assert.equal(finisher.hero.focus, 0);
  assert.equal(finisher.invulnerable(), true, 'the finisher cannot be interrupted');
  let landed = null;
  for (let i = 0; i < 120 && !landed; i++) landed = finisher.step(DT, NO_INPUT).find(e => e.type === 'land');
  assert.ok(landed.finisher && landed.damage === FINISHER.damage && !landed.guarded, 'finishers ignore the guard');
});

test('the hero stays inside the arena and never passes through a beast', () => {
  for (const beast of BEASTS) {
    const random = seeded(77);
    const { duel } = fight(beast, 1, 77, d => {
      const input = press({ move: random() * 2 - 1, attack: random() < 0.1, parry: random() < 0.05, dodge: random() < 0.04 });
      const h = d.hero;
      if (h.action !== 'fall') {
        assert.ok(h.x >= WALL_X + HERO_HALF - 1e-9, `${beast}: hero past the wall at ${h.x}`);
        assert.ok(h.x <= d.beast.frontX() - HERO_HALF + 1e-6, `${beast}: hero inside the beast at ${h.x}`);
        assert.ok(Number.isFinite(h.x) && h.hp >= 0 && h.stamina >= 0 && h.focus <= FOCUS_MAX);
      }
      return input;
    }, 60);
    assert.ok(['fight', 'won', 'lost'].includes(duel.state));
  }
});

test('ladder: beat one beast to open the next, Nightmare opens after all four', () => {
  assert.equal(LADDER, 8);
  assert.equal(rungOf(0, 0), 1);
  assert.equal(rungOf(3, 1), 8);
  assert.ok(isUnlocked(0, 0, 0));
  assert.ok(!isUnlocked(0, 1, 0));
  assert.ok(isUnlocked(1, 1, 0));
  assert.ok(!isUnlocked(3, 0, 1));
  assert.ok(!nightmareOpen(3));
  assert.ok(nightmareOpen(4) && isUnlocked(4, 0, 1) && !isUnlocked(4, 1, 1));
  assert.ok(isUnlocked(8, 3, 1));
  assert.deepEqual(nextRung(0), { beast: 0, tier: 0 });
  assert.deepEqual(nextRung(4), { beast: 0, tier: 1 });
  assert.deepEqual(nextRung(8), { beast: 3, tier: 1 });
  assert.deepEqual(rungAt(-5), { beast: 0, tier: 0 });
  assert.ok(isUnlocked(Number.NaN, 0, 0) && !isUnlocked(Number.NaN, 1, 0), 'bad storage falls back to the first rung');
  for (let r = 1; r <= LADDER; r++) { const { beast, tier } = rungAt(r); assert.equal(rungOf(beast, tier), r); }
});

test('best times are stored so that faster is larger, and keys are namespaced', () => {
  for (const seconds of [1.04, 63.27, 600, 3599]) {
    const value = encodeTime(seconds);
    assert.ok(value > 0);
    assert.ok(Math.abs(decodeTime(value) - seconds) <= 0.05);
  }
  assert.ok(encodeTime(30) > encodeTime(31), 'a faster clear is a bigger number');
  assert.equal(encodeTime(0), 0);
  assert.equal(encodeTime(5000), 0, 'absurdly slow clears are not recorded');
  assert.equal(decodeTime(0), 0);
  assert.equal(formatTime(63.27), '1:03.3');
  assert.equal(formatTime(0), '0:00.0');
  assert.equal(PROGRESS_KEY, 'afg-beastfall-best');
  assert.equal(timeKey('hydra', 1), 'afg-beastfall-best-time-hydra-1');
  assert.equal(medalKey('kraken', 0), 'afg-beastfall-best-nohit-kraken-0');
  assert.deepEqual(Object.keys(BEAST_OF), [...BEASTS]);
});
