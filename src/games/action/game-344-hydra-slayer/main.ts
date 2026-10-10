import { Sfx, best, setupI18n, focusIfActive, onFocusLost, bindSoundButton, trackPointer, prefersTouch, prefersReducedMotion, clamp } from '../../../shared/three/kit';
import { BeastfallGame, type Action, type Hud, type PopupKind, type Result } from './game';
import {
  BEASTS, LADDER, PROGRESS_KEY, isUnlocked, nightmareOpen, nextRung, rungOf, rungAt, encodeTime, decodeTime, timeKey, medalKey, formatTime,
  type BeastId, type DuelEvent, type Tier,
} from './logic';
import { translations } from './i18n';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stageEl = $('stage');
const overlay = $('overlay');
const startBtn = $<HTMLButtonElement>('start-btn');
const retryBtn = $<HTMLButtonElement>('retry-btn');
const ladderBtn = $<HTMLButtonElement>('ladder-btn');
const pauseBtn = $<HTMLButtonElement>('pause-btn');
const soundBtn = $<HTMLButtonElement>('sound-btn');
const languageSelect = $<HTMLSelectElement>('language-select');
const toast = $('toast');
const popups = $('popups');
const cards = $('cards');
const touchEl = $('touch');
const hudEl = $('hud');
const pad = $('pad');
const stick = $('stick');
const knob = $('knob');
const finisherBtn = $<HTMLButtonElement>('btn-finisher');
const sfx = new Sfx();
const touch = prefersTouch();
const reduced = prefersReducedMotion();

type Mode = 'menu' | 'playing' | 'paused' | 'over';
let mode: Mode = 'menu';
let progress = best.read(PROGRESS_KEY);
const first = nextRung(progress);
const selected: { beast: number; tier: Tier } = { beast: first.beast, tier: first.tier };
/** What the last fight was and how it went. */
let current = { beast: selected.beast, tier: selected.tier };
interface Outcome {
  result: Result;
  bestTime: number;
  isNewBest: boolean;
  medal: 'new' | 'have' | 'none';
  unlocked: 'beast' | 'nightmare' | 'all' | '';
}
let outcome: Outcome | null = null;
let overAt = 0;

const t = setupI18n(translations, languageSelect, () => { renderOverlay(); renderBeastName(); });
const beastName = (index: number) => t(`beast.${BEASTS[index]}`);

// ------------------------------------------------------------------ toasts and popups

let toastUntil = 0;
function showToast(text: string, kind: '' | 'warn' | 'gold' | 'song' = '', ms = 1500) {
  toast.textContent = text;
  toast.className = `g3d-toast show ${kind}`.trim();
  toastUntil = performance.now() + ms;
  window.clearTimeout(Number(toast.dataset.timer));
  toast.dataset.timer = String(window.setTimeout(() => toast.classList.remove('show'), ms));
}
/** A lesser toast does not cut off a fresh one. */
function softToast(text: string, kind: '' | 'warn' | 'gold' | 'song' = '', ms = 1200) {
  if (performance.now() < toastUntil - 700) return;
  showToast(text, kind, ms);
}

function popup(kind: PopupKind, x: number, y: number, value: number) {
  if (popups.childElementCount > 14) popups.firstElementChild?.remove();
  const el = document.createElement('span');
  el.className = `pop pop-${kind}`;
  if (kind === 'perfect' || kind === 'block' || kind === 'evade' || kind === 'stagger') el.textContent = t(`pop.${kind}`);
  else if (kind === 'hurt') el.textContent = `-${value}`;
  else el.textContent = kind === 'crit' || kind === 'finisher' ? `${value}!` : String(value);
  el.style.left = `${Math.round(clamp(x, 24, window.innerWidth - 24))}px`;
  el.style.top = `${Math.round(clamp(y, 24, window.innerHeight - 24))}px`;
  popups.append(el);
  window.setTimeout(() => el.remove(), 950);
}

// ------------------------------------------------------------------ sound

function telegraphSound(e: DuelEvent) {
  const s = e.strike;
  if (!s) return;
  if (s.attack === 'sirenNote') { sfx.tone(988, 0.28, { type: 'sine', gain: 0.07 }); sfx.tone(1319, 0.22, { type: 'sine', gain: 0.04, delay: 0.08 }); }
  else if (s.spec.parryable) { sfx.tone(440, 0.24, { type: 'triangle', slideTo: 880, gain: 0.09 }); sfx.tone(1760, 0.08, { type: 'sine', gain: 0.03, delay: 0.2 }); }
  else { sfx.tone(150, 0.4, { type: 'sawtooth', slideTo: 95, gain: 0.1 }); sfx.noise(0.32, { frequency: 420, gain: 0.12 }); }
}

let lastHigh = 0;
let hints = new Set<string>();
function onEvent(e: DuelEvent) {
  switch (e.type) {
    case 'telegraph': {
      telegraphSound(e);
      const s = e.strike;
      if (s && !hints.has('gold') && s.spec.parryable && s.attack !== 'sirenNote') { hints.add('gold'); softToast(t('toast.gold'), 'gold'); }
      else if (s && !hints.has('crimson') && !s.spec.parryable) { hints.add('crimson'); softToast(t('toast.crimson'), 'warn'); }
      else if (s && !hints.has('note') && s.attack === 'sirenNote') { hints.add('note'); softToast(t('toast.note'), 'song'); }
      break;
    }
    case 'strike':
      if (e.strike && !e.strike.spec.parryable) sfx.noise(0.22, { frequency: 520, gain: 0.22 });
      break;
    case 'swing': sfx.noise(0.07, { frequency: 2600, type: 'highpass', gain: 0.1 }); sfx.tone(300 + (e.combo ?? 0) * 60, 0.08, { type: 'triangle', slideTo: 170, gain: 0.05 }); break;
    case 'land':
      if (e.finisher) { sfx.tone(92, 0.6, { type: 'sawtooth', slideTo: 38, gain: 0.24 }); sfx.noise(0.45, { frequency: 760, gain: 0.34 }); }
      else if (e.guarded) sfx.tone(980, 0.06, { type: 'triangle', gain: 0.07 });
      else { sfx.tone(150 - (e.combo ?? 0) * 18, 0.12, { type: 'square', slideTo: 70, gain: 0.14 }); sfx.noise(0.08, { frequency: 1800, gain: 0.18 }); }
      break;
    case 'whiff': if (e.finisher) sfx.tone(240, 0.2, { type: 'triangle', slideTo: 120, gain: 0.06 }); break;
    case 'high':
      sfx.tone(260, 0.08, { type: 'triangle', gain: 0.05 });
      if (performance.now() - lastHigh > 5000) { lastHigh = performance.now(); softToast(t('toast.high')); }
      break;
    case 'perfect':
      sfx.tone(1318, 0.18, { type: 'triangle', gain: 0.15 });
      sfx.tone(1976, 0.3, { type: 'sine', gain: 0.09, delay: 0.04 });
      sfx.noise(0.06, { frequency: 5200, type: 'highpass', gain: 0.12 });
      break;
    case 'block': sfx.tone(640, 0.08, { type: 'square', gain: 0.07 }); sfx.noise(0.07, { frequency: 3000, type: 'highpass', gain: 0.1 }); break;
    case 'hurt': sfx.tone(120, 0.22, { type: 'sawtooth', slideTo: 55, gain: 0.18 }); sfx.noise(0.16, { frequency: 640, gain: 0.24 }); break;
    case 'evade': sfx.tone(720, 0.12, { type: 'sine', slideTo: 1150, gain: 0.06 }); break;
    case 'dodge': sfx.noise(0.2, { frequency: 900, type: 'bandpass', gain: 0.12 }); break;
    case 'parry': sfx.tone(1100, 0.05, { type: 'triangle', gain: 0.04 }); break;
    case 'tired': sfx.tone(160, 0.14, { type: 'square', gain: 0.06 }); softToast(t('toast.tired'), 'warn', 900); break;
    case 'finisher': sfx.tone(220, 0.35, { type: 'sawtooth', slideTo: 660, gain: 0.1 }); break;
    case 'far': sfx.tone(200, 0.1, { type: 'square', gain: 0.05 }); softToast(t('toast.far'), 'warn', 1000); break;
    case 'ready':
      [660, 880, 1320].forEach((f, i) => sfx.tone(f, 0.16, { type: 'triangle', gain: 0.08, delay: i * 0.07 }));
      showToast(t('toast.ready', { key: touch ? t('game.finisherTouch') : t('game.finisherKeys') }), 'gold', 1600);
      break;
    case 'sever':
      sfx.noise(0.28, { frequency: 1500, gain: 0.3 });
      sfx.tone(210, 0.25, { type: 'sawtooth', slideTo: 80, gain: 0.12 });
      if (!hints.has('sever')) { hints.add('sever'); showToast(t('toast.sever'), 'warn'); }
      break;
    case 'burn': {
      sfx.noise(0.6, { frequency: 700, gain: 0.32 });
      sfx.tone(82, 0.7, { type: 'sawtooth', slideTo: 40, gain: 0.2 });
      const hydra = game?.duel.beast as { burned?: number } | undefined;
      showToast(t('toast.burn', { n: hydra?.burned ?? 1 }), 'gold');
      break;
    }
    case 'regrow': sfx.tone(170, 0.5, { type: 'sawtooth', slideTo: 340, gain: 0.08 }); softToast(t('toast.regrow'), 'warn'); break;
    case 'song':
      [440, 523, 659, 880].forEach((f, i) => sfx.tone(f, 0.5, { type: 'sine', gain: 0.06, delay: i * 0.16 }));
      showToast(t('toast.song'), 'song');
      break;
    case 'songBreak': sfx.tone(1400, 0.3, { type: 'triangle', slideTo: 380, gain: 0.1 }); sfx.noise(0.2, { frequency: 4000, type: 'highpass', gain: 0.12 }); showToast(t('toast.songBreak'), 'song'); break;
    case 'fall': sfx.tone(620, 0.9, { type: 'sine', slideTo: 70, gain: 0.14 }); showToast(t('toast.fall'), 'warn'); break;
    case 'respawn': sfx.tone(440, 0.2, { type: 'triangle', slideTo: 880, gain: 0.07 }); break;
    case 'enrage':
      sfx.tone(68, 0.9, { type: 'sawtooth', slideTo: 48, gain: 0.24 });
      sfx.noise(0.7, { frequency: 300, gain: 0.3 });
      showToast(t('toast.enrage', { beast: beastName(current.beast) }), 'warn');
      break;
    case 'stagger': sfx.tone(320, 0.26, { type: 'triangle', slideTo: 150, gain: 0.1 }); break;
    case 'surface':
      sfx.noise(0.7, { frequency: 900, gain: 0.3 });
      if (!hints.has('surface')) { hints.add('surface'); showToast(t('toast.surface'), 'gold'); }
      break;
    case 'victory':
      [523, 659, 784, 1046].forEach((f, i) => sfx.tone(f, 0.32, { type: 'triangle', gain: 0.1, delay: 0.25 + i * 0.12 }));
      showToast(t('game.victory'), 'gold', 2000);
      break;
    case 'defeat':
      [330, 262, 196].forEach((f, i) => sfx.tone(f, 0.45, { type: 'sine', gain: 0.1, delay: i * 0.22 }));
      showToast(t('game.defeat'), 'warn', 1800);
      break;
    default: break;
  }
}

// ------------------------------------------------------------------ HUD

const hpBar = $('hp-bar');
const staminaBar = $('stamina-bar');
const focusBar = $('focus-bar');
const beastBar = $('beast-bar');
const focusChip = $('focus-chip');
const heroChip = $('hero-chip');
const beastChip = $('beast-chip');
const timeEl = $('time');
const headsEl = $('heads');
const last = { hp: -1, stamina: -1, focus: -1, beast: -1, time: '', ready: false, enraged: false, heads: '' };
function renderHud(hud: Hud) {
  if (hud.hp !== last.hp) { last.hp = hud.hp; hpBar.style.transform = `scaleX(${hud.hp})`; heroChip.classList.toggle('low', hud.hp < 0.3); }
  if (hud.stamina !== last.stamina) { last.stamina = hud.stamina; staminaBar.style.transform = `scaleX(${hud.stamina})`; }
  if (hud.focus !== last.focus) {
    last.focus = hud.focus;
    focusBar.style.transform = `scaleX(${hud.focus})`;
    finisherBtn.style.setProperty('--focus', String(hud.focus));
  }
  if (hud.ready !== last.ready) { last.ready = hud.ready; focusChip.classList.toggle('ready', hud.ready); finisherBtn.classList.toggle('ready', hud.ready); }
  if (hud.beastHp !== last.beast) { last.beast = hud.beastHp; beastBar.style.transform = `scaleX(${hud.beastHp})`; }
  if (hud.enraged !== last.enraged) { last.enraged = hud.enraged; beastChip.classList.toggle('enraged', hud.enraged); }
  const time = formatTime(hud.time);
  if (time !== last.time) { last.time = time; timeEl.textContent = time; }
  const heads = hud.heads ? hud.heads.join(',') : '';
  if (heads !== last.heads) {
    last.heads = heads;
    headsEl.hidden = !hud.heads;
    hud.heads?.forEach((state, i) => { (headsEl.children[i] as HTMLElement).className = state; });
  }
}

function renderBeastName() { $('beast-name').textContent = beastName(current.beast); }

// ------------------------------------------------------------------ menu, ladder and results

const recordTime = (beast: number, tier: Tier) => decodeTime(best.read(timeKey(BEASTS[beast], tier)));
const hasMedal = (beast: number, tier: Tier) => best.read(medalKey(BEASTS[beast], tier)) > 0;
const ROMAN = ['I', 'II', 'III', 'IV'];

const cardButtons = BEASTS.map((_id, i) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `card card-${BEASTS[i]}`;
  button.innerHTML = '<span class="card-rung"></span><b class="card-name"></b><small class="card-status"></small>';
  button.addEventListener('click', () => {
    if (!isUnlocked(progress, i, selected.tier)) {
      sfx.tone(160, 0.1, { type: 'square', gain: 0.05 });
      const before = rungAt(rungOf(i, selected.tier) - 1);
      showHint(t('game.lockedHint', { beast: beastName(before.beast) }));
      return;
    }
    sfx.unlock();
    sfx.tone(520 + i * 80, 0.08, { type: 'triangle', gain: 0.06 });
    selected.beast = i;
    selectionChanged();
  });
  cards.append(button);
  return button;
});
const tierButtons = [0, 1].map(tier => {
  const button = $<HTMLButtonElement>(`tier-${tier}`);
  button.addEventListener('click', () => {
    if (tier === 1 && !nightmareOpen(progress)) { sfx.tone(160, 0.1, { type: 'square', gain: 0.05 }); showHint(t('game.nightmareLocked')); return; }
    selected.tier = tier as Tier;
    if (!isUnlocked(progress, selected.beast, selected.tier)) selected.beast = 0;
    selectionChanged();
  });
  return button;
});

/** Locked cards explain themselves in the hint line under the ladder (a toast would sit behind the menu). */
function showHint(text: string) {
  const hint = $('ladder-hint');
  hint.textContent = text;
  hint.classList.add('warn');
}

function selectionChanged() {
  current = { beast: selected.beast, tier: selected.tier };
  game?.preview(BEASTS[selected.beast], selected.tier);
  document.body.dataset.tier = String(selected.tier);
  renderBeastName();
  renderOverlay();
}

function renderLadder() {
  const open = nightmareOpen(progress);
  tierButtons.forEach((button, tier) => {
    button.setAttribute('aria-pressed', String(selected.tier === tier));
    button.classList.toggle('locked', tier === 1 && !open);
  });
  cardButtons.forEach((button, i) => {
    const unlocked = isUnlocked(progress, i, selected.tier);
    const time = recordTime(i, selected.tier);
    button.setAttribute('aria-pressed', String(selected.beast === i));
    button.classList.toggle('locked', !unlocked);
    button.setAttribute('aria-disabled', String(!unlocked));
    (button.querySelector('.card-rung') as HTMLElement).textContent = ROMAN[i];
    (button.querySelector('.card-name') as HTMLElement).textContent = beastName(i);
    const status = button.querySelector('.card-status') as HTMLElement;
    status.textContent = !unlocked ? `🔒 ${t('game.locked')}` : time > 0 ? `${formatTime(time)}${hasMedal(i, selected.tier) ? ' ★' : ''}` : t('game.fresh');
  });
  $('ladder-hint').textContent = t(`hint.${BEASTS[selected.beast]}`);
  $('ladder-hint').classList.remove('warn');
}

function renderOverlay() {
  const result = $('result');
  const lead = $('overlay-lead');
  const ladder = $('ladder');
  const more = $('more-btns');
  const note = $('result-note');
  const controls = $('controls');
  const kicker = $('overlay-kicker');
  $('overlay-note').hidden = mode !== 'menu';
  const title = $('overlay-title');
  const tierName = (tier: Tier) => t(tier === 1 ? 'game.nightmare' : 'game.normal');
  if (mode === 'over' && outcome) {
    const r = outcome.result;
    const index = BEASTS.indexOf(r.beast);
    kicker.textContent = `${beastName(index)} · ${tierName(r.tier)}`;
    title.textContent = t(r.won ? 'game.victory' : 'game.defeat');
    $('result-time').textContent = formatTime(r.time);
    $('result-perfects').textContent = String(r.stats.perfects);
    $('result-hits').textContent = String(r.stats.hitsTaken);
    if (r.won) {
      $('result-best-label').textContent = t('game.bestTime');
      $('result-best').textContent = outcome.bestTime > 0 ? formatTime(outcome.bestTime) : t('game.none');
      $('new-best').hidden = !outcome.isNewBest;
    } else {
      $('result-best-label').textContent = t('game.beastLeft');
      $('result-best').textContent = `${Math.ceil(r.beastHp * 100)}%`;
      $('new-best').hidden = true;
    }
    const lines: string[] = [];
    if (outcome.medal === 'new') lines.push(`★ ${t('game.medalNew')}`);
    else if (outcome.medal === 'have') lines.push(`★ ${t('game.medalHave')}`);
    else lines.push(t('game.medalHint'));
    if (outcome.unlocked === 'beast') { const next = rungAt(rungOf(index, r.tier) + 1); lines.push(t('game.unlocked', { beast: beastName(next.beast) })); }
    if (outcome.unlocked === 'nightmare') lines.push(t('game.nightmareUnlocked'));
    if (outcome.unlocked === 'all') lines.push(t('game.allClear'));
    note.textContent = lines.join('  ·  ');
    note.classList.toggle('medal', outcome.medal !== 'none');
    note.hidden = false;
    result.hidden = false;
    lead.hidden = true;
    ladder.hidden = true;
    controls.hidden = true;
    more.hidden = false;
    const next = nextAfter(r);
    const nextName = next ? (next.tier === 1 ? `${beastName(next.beast)} · ${t('game.nightmare')}` : beastName(next.beast)) : '';
    startBtn.textContent = next ? t('game.next', { beast: nextName }) : t('game.retry');
    retryBtn.hidden = !next;
    retryBtn.textContent = t('game.retry');
    ladderBtn.textContent = t('game.ladderBtn');
  } else if (mode === 'paused') {
    kicker.textContent = `${beastName(current.beast)} · ${tierName(current.tier)}`;
    title.textContent = t('game.paused');
    result.hidden = true;
    note.hidden = true;
    lead.hidden = true;
    ladder.hidden = true;
    controls.hidden = false;
    more.hidden = false;
    startBtn.textContent = t('game.resume');
    retryBtn.hidden = false;
    retryBtn.textContent = t('game.restart');
    ladderBtn.textContent = t('game.quit');
  } else {
    kicker.textContent = t('game.kicker');
    title.textContent = t('game.title');
    result.hidden = true;
    note.hidden = true;
    lead.hidden = false;
    ladder.hidden = false;
    controls.hidden = false;
    more.hidden = true;
    renderLadder();
    startBtn.textContent = t('game.fight', { beast: selected.tier === 1 ? `${beastName(selected.beast)} · ${t('game.nightmare')}` : beastName(selected.beast) });
  }
}

/** The rung a win leads to, if it is a different fight that is now open. */
function nextAfter(r: Result): { beast: number; tier: Tier } | null {
  if (!r.won) return null;
  const rung = rungOf(BEASTS.indexOf(r.beast), r.tier);
  if (rung >= LADDER) return null;
  const next = rungAt(rung + 1);
  return isUnlocked(progress, next.beast, next.tier) ? next : null;
}

function setMode(next: Mode, focusStart = true) {
  mode = next;
  document.body.dataset.mode = next;
  overlay.hidden = next === 'playing';
  pauseBtn.disabled = next !== 'playing';
  renderOverlay();
  if (overlay.hidden) (document.activeElement as HTMLElement | null)?.blur();
  else if (focusStart) focusIfActive(startBtn);
  measure();
}

function record(r: Result): Outcome {
  const index = BEASTS.indexOf(r.beast);
  if (!r.won) return { result: r, bestTime: recordTime(index, r.tier), isNewBest: false, medal: hasMedal(index, r.tier) ? 'have' : 'none', unlocked: '' };
  const before = progress;
  const rung = rungOf(index, r.tier);
  progress = best.submit(PROGRESS_KEY, rung).best;
  const time = best.submit(timeKey(r.beast, r.tier), encodeTime(r.time));
  const hadMedal = hasMedal(index, r.tier);
  let medal: Outcome['medal'] = hadMedal ? 'have' : 'none';
  if (r.stats.hitsTaken === 0) medal = best.submit(medalKey(r.beast, r.tier), 1).isNew ? 'new' : 'have';
  let unlocked: Outcome['unlocked'] = '';
  if (rung > before) {
    if (rung === LADDER) unlocked = 'all';
    else if (rung === BEASTS.length) unlocked = 'nightmare';
    else unlocked = 'beast';
  }
  return { result: r, bestTime: decodeTime(time.best), isNewBest: time.isNew, medal, unlocked };
}

// ------------------------------------------------------------------ game wiring

const game = BeastfallGame.create(stageEl);

function measure() {
  if (!game) return;
  const hud = hudEl.getBoundingClientRect();
  const top = hud.bottom + 8;
  // The collection navigation sits in the bottom-right corner.
  let bottom = 64;
  let right = 0;
  if (getComputedStyle(touchEl).display !== 'none') {
    const rect = touchEl.getBoundingClientRect();
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Landscape: keep the arena left of the button column. Portrait: above the buttons.
    if (w > h * 1.25) { right = w - rect.left + 6; bottom = 12; }
    else bottom = Math.max(bottom, h - rect.top + 6);
  }
  document.documentElement.style.setProperty('--hud-bottom', `${Math.round(hud.bottom)}px`);
  game.setInsets(top, bottom, right);
}

function fight(beast: number, tier: Tier) {
  if (!game) return;
  sfx.unlock();
  current = { beast, tier };
  selected.beast = beast;
  selected.tier = tier;
  document.body.dataset.tier = String(tier);
  renderBeastName();
  hints = new Set([...hints].filter(h => h === 'gold' || h === 'crimson' || h === 'note'));
  game.start(BEASTS[beast], tier);
  setMode('playing');
  showToast(`${beastName(beast)} — ${t(`hint.${BEASTS[beast]}`)}`, '', 2600);
  sfx.tone(110, 0.7, { type: 'sawtooth', slideTo: 70, gain: 0.14 });
}

if (!game) {
  const note = document.createElement('div');
  note.className = 'g3d-fallback';
  note.setAttribute('role', 'alert');
  note.dataset.i18n = 'game.fallback';
  note.textContent = t('game.fallback');
  startBtn.after(note);
  startBtn.disabled = true;
  startBtn.hidden = true;
  pauseBtn.disabled = true;
} else {
  game.onHud = renderHud;
  game.onEvent = onEvent;
  game.onPopup = popup;
  game.onOver = result => {
    outcome = record(result);
    overAt = performance.now();
    setMode('over');
  };

  /** Clicks right after the result appears are ignored, so a held or mashed key does not skip it. */
  const settled = () => mode !== 'over' || performance.now() - overAt > 600;
  startBtn.addEventListener('click', () => {
    if (!settled()) return;
    sfx.unlock();
    if (mode === 'paused') { game.resume(); setMode('playing'); return; }
    if (mode === 'over' && outcome) {
      const next = nextAfter(outcome.result);
      const index = BEASTS.indexOf(outcome.result.beast);
      if (next) fight(next.beast, next.tier);
      else fight(index, outcome.result.tier);
      return;
    }
    fight(selected.beast, selected.tier);
  });
  retryBtn.addEventListener('click', () => {
    if (!settled()) return;
    if (mode === 'paused') { game.abandon(); fight(current.beast, current.tier); return; }
    if (mode === 'over' && outcome) fight(BEASTS.indexOf(outcome.result.beast), outcome.result.tier);
  });
  ladderBtn.addEventListener('click', () => {
    if (!settled()) return;
    if (mode === 'paused') game.abandon();
    const resultBeast = outcome && mode === 'over' ? outcome.result : null;
    if (resultBeast) {
      const next = nextAfter(resultBeast);
      const pick = next ?? { beast: BEASTS.indexOf(resultBeast.beast), tier: resultBeast.tier };
      selected.beast = pick.beast;
      selected.tier = pick.tier;
    }
    setMode('menu');
    selectionChanged();
  });

  // Mode stays 'playing' through the victory or defeat animation; there is nothing to pause until the result.
  const pause = (focusResume = true) => { if (mode === 'playing' && game.status === 'running') { game.pause(); setMode('paused', focusResume); } };
  pauseBtn.addEventListener('click', () => pause());
  window.addEventListener('keydown', event => {
    if (mode === 'playing' && !event.repeat && !last.ready && (event.code === 'KeyI' || event.code === 'ArrowUp' || event.code === 'KeyW')) notReady();
    if ((event.code === 'KeyP' || event.code === 'Escape') && mode === 'playing') pause();
    else if (event.code === 'Escape' && mode === 'paused') { game.resume(); setMode('playing'); }
  });
  onFocusLost(() => pause());
  languageSelect.addEventListener('focus', () => pause(false));

  // Touch: the left half is a drag pad, the right holds the action buttons.
  const STICK = 44;
  let anchor = 0;
  trackPointer(pad, {
    down: (x, y) => {
      sfx.unlock();
      anchor = x;
      stick.hidden = false;
      stick.style.transform = `translate(${x}px, ${y}px)`;
      knob.style.transform = 'translateX(0px)';
      game.setStick(0);
    },
    drag: (_dx, _dy, x) => {
      let offset = x - anchor;
      // The anchor trails a finger that slides far, so reversing is instant.
      if (Math.abs(offset) > STICK * 1.3) { anchor = x - Math.sign(offset) * STICK * 1.3; offset = x - anchor; }
      const k = clamp(offset / STICK, -1, 1);
      game.setStick(Math.abs(k) < 0.18 ? 0 : k);
      knob.style.transform = `translateX(${Math.round(clamp(offset, -STICK, STICK))}px)`;
    },
    up: () => { game.setStick(0); stick.hidden = true; },
  });
  /** The finisher asked for before Focus is full: a dull click, and the Focus meter nudges. */
  const notReady = () => {
    sfx.tone(140, 0.07, { type: 'square', gain: 0.05 });
    focusChip.classList.remove('nudge');
    void focusChip.offsetWidth;
    focusChip.classList.add('nudge');
  };
  const bindAction = (id: string, action: Action) => {
    const button = $<HTMLButtonElement>(id);
    const release = () => button.classList.remove('on');
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      sfx.unlock();
      button.classList.add('on');
      if (mode === 'playing') game.press(action);
      if (mode === 'playing' && action === 'finisher' && !last.ready) notReady();
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('contextmenu', event => event.preventDefault());
    // Keyboard and assistive clicks (no pointer) still work.
    button.addEventListener('click', event => { if (event.detail === 0 && mode === 'playing') game.press(action); });
  };
  bindAction('btn-attack', 'attack');
  bindAction('btn-parry', 'parry');
  bindAction('btn-dodge', 'dodge');
  bindAction('btn-finisher', 'finisher');

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => measure());
    observer.observe(hudEl);
    observer.observe(touchEl);
  }
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', measure);

  if (/[?&]debug\b/.test(location.search)) {
    (window as unknown as { __beastfall: unknown }).__beastfall = { game, mode: () => mode, fight };
  }
}

bindSoundButton(soundBtn, sfx);
document.body.classList.toggle('reduced', reduced);
document.body.dataset.tier = String(selected.tier);
renderBeastName();
renderHud({ hp: 1, stamina: 1, focus: 0, ready: false, beastHp: 1, enraged: false, time: 0, heads: null });
game?.preview(BEASTS[selected.beast], selected.tier);
setMode('menu');
