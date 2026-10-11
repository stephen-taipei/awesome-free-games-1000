import { Sfx, best, setupI18n, focusIfActive, onFocusLost, bindSoundButton, prefersTouch, prefersReducedMotion } from '../../../shared/three/kit';
import { RidgeGlider, type Hud, type Result, type Marker, type Stick } from './game';
import { MAX_CHARGES, segmentNews, type RunEvent, type SegmentNews } from './logic';
import { translations } from './i18n';

const BEST_KEY = 'afg-ridge-glider-best';
const INVERT_KEY = 'afg-ridge-glider-invert';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stageEl = $('stage');
const overlay = $('overlay');
const startBtn = $<HTMLButtonElement>('start-btn');
const pauseBtn = $<HTMLButtonElement>('pause-btn');
const soundBtn = $<HTMLButtonElement>('sound-btn');
const burstBtn = $<HTMLButtonElement>('burst-btn');
const languageSelect = $<HTMLSelectElement>('language-select');
const invertBox = $<HTMLInputElement>('invert');
const toast = $('toast');
const warnEl = $('warn');
const hintEl = $('hint');
const hintText = $('hint-text');
const graceEl = $('grace');
const marker = $('marker');
const stickEl = $('stick');
const stickKnob = $('stick-knob');
const pops = $('pops');
const panel = overlay.querySelector('.g3d-panel') as HTMLElement;
const stickDesc = $('touch-stick-desc');
const touch = prefersTouch();
const reducedMotion = prefersReducedMotion();
const sfx = new Sfx();

let mode: 'menu' | 'playing' | 'paused' | 'over' = 'menu';
let lastResult: (Result & { best: number; isNew: boolean }) | null = null;
let lastHud: Hud | null = null;
let overAt = 0;
let invert = false;
try { invert = localStorage.getItem(INVERT_KEY) === '1'; } catch { /* default off */ }

const t = setupI18n(translations, languageSelect, () => { renderOverlay(); renderHint(); renderKeys(); if (lastHud) renderHud(lastHud); });

// ---------------------------------------------------------------------------------------------------
// Toasts, pops and hints

function showToast(text: string, tone: '' | 'warn' | 'good' = '', ms = 1300) {
  toast.textContent = text;
  // Tone classes are prefixed so they never pick up the "Pull up!" pill's styles.
  toast.classList.toggle('tone-warn', tone === 'warn');
  toast.classList.toggle('tone-good', tone === 'good');
  toast.classList.add('show');
  window.clearTimeout(Number(toast.dataset.timer));
  toast.dataset.timer = String(window.setTimeout(() => toast.classList.remove('show'), ms));
}

function pop(text: string, miss = false) {
  const el = document.createElement('div');
  el.className = miss ? 'pop miss' : 'pop';
  el.textContent = text;
  pops.append(el);
  window.setTimeout(() => el.remove(), 950);
}

/** The tutorial in the first segment: dive, pull, thermal, burst. */
type HintStep = 'dive' | 'pull' | 'thermal' | 'burst' | 'done';
let hint: HintStep = 'dive';
let hintTimer = 0;
let gateResults = 0;

// With "Invert pitch" the stick (touch too) and the keys swap: the hints show what actually climbs or dives.
function climbKey() { return touch ? (invert ? '⇣' : '⇡') : invert ? '↓' : '↑'; }
function diveKey() { return touch ? (invert ? '⇡' : '⇣') : invert ? '↑' : '↓'; }

function renderHint() {
  const playing = mode === 'playing';
  let key = '';
  let text = '';
  if (hint === 'dive') { key = diveKey(); text = t('game.hintDive'); }
  else if (hint === 'pull') { key = climbKey(); text = t('game.hintPull'); }
  else if (hint === 'thermal') { key = '◎'; text = t('game.hintThermal'); }
  else if (hint === 'burst') { key = touch ? '⇧' : 'Space'; text = t('game.hintBurst'); }
  hintText.replaceChildren();
  if (text) {
    const kbd = document.createElement('kbd');
    kbd.textContent = key;
    hintText.append(kbd, text);
  }
  const grace = lastHud?.grace ?? 0;
  graceEl.hidden = !(grace > 0);
  if (grace > 0) graceEl.textContent = t('game.warmup', { n: Math.ceil(grace) });
  hintEl.hidden = !playing || (!text && !(grace > 0));
}

function setHint(next: HintStep) {
  if (hint === next) return;
  hint = next;
  hintTimer = 0;
  renderHint();
}

function advanceHint(hud: Hud, dt: number) {
  hintTimer += dt;
  if (hint !== 'done' && hud.segment > 1) { setHint('done'); return; }
  if (hint === 'thermal' && hintTimer > 14) setHint('burst');
  if (hint === 'burst' && hintTimer > 6) setHint('done');
  if (hint === 'pull' && gateResults >= 2 && hud.thermalAhead < 140) setHint('thermal');
}

// ---------------------------------------------------------------------------------------------------
// HUD

function renderHud(hud: Hud) {
  const previous = lastHud;
  lastHud = hud;
  $('score').textContent = hud.score.toLocaleString('en-US');
  $('mult').textContent = String(hud.mult);
  $('mult-chip').classList.toggle('hot', hud.mult >= 3);
  $('speed').textContent = String(hud.speed);
  $('agl').textContent = String(hud.agl);
  $('height-chip').classList.toggle('low', hud.agl < 15 && mode === 'playing');
  const vario = $('vario');
  vario.classList.toggle('up', hud.climb > 0.8);
  vario.classList.toggle('down', hud.climb < -6);
  vario.classList.toggle('strong', hud.climb > 4);
  const charges = $('charges');
  if (!previous || previous.charges !== hud.charges) {
    charges.innerHTML = Array.from({ length: MAX_CHARGES }, (_, i) => `<i class="${i < hud.charges ? 'on' : ''}"></i>`).join('');
    charges.setAttribute('aria-label', `${hud.charges}/${MAX_CHARGES}`);
  }
  burstBtn.classList.toggle('empty', hud.charges === 0);
  const windChip = $('wind-chip');
  windChip.hidden = Math.abs(hud.wind) < 0.5;
  $('wind').textContent = Math.abs(hud.wind).toFixed(1);
  $('wind-arrow').textContent = hud.wind >= 0 ? '→' : '←';
  const warning = mode === 'playing' ? hud.warning : null;
  warnEl.hidden = !warning;
  warnEl.classList.toggle('stall', warning === 'stall');
  if (warning) warnEl.textContent = warning === 'stall' ? t('game.stallWarn') : t('game.pullWarn');
  $('danger').classList.toggle('on', warning === 'pull');
  if (mode === 'playing') {
    advanceHint(hud, previous ? 0.1 : 0);
    if (!previous || Math.ceil(previous.grace) !== Math.ceil(hud.grace)) renderHint();
  }
}

function renderMarker(m: Marker) {
  const show = mode === 'playing' && m.visible && !m.onScreen;
  marker.hidden = !show;
  if (show) {
    marker.style.transform = `translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px)`;
    marker.style.setProperty('--a', `${m.angle.toFixed(3)}rad`);
  }
}

function renderStick(s: Stick) {
  const show = s.active && mode === 'playing';
  stickEl.hidden = !show;
  if (!show) return;
  stickEl.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
  const length = Math.hypot(s.dx, s.dy);
  const k = length > 1 ? 1 / length : 1;
  stickKnob.style.transform = `translate(${(s.dx * k * 41).toFixed(1)}px, ${(s.dy * k * 41).toFixed(1)}px)`;
}

function renderKeys() {
  $('key-climb').textContent = invert ? '↓ / S' : '↑ / W';
  $('key-dive').textContent = invert ? '↑ / W' : '↓ / S';
  // data-i18n follows the setting, so a language switch keeps the right text.
  stickDesc.dataset.i18n = invert ? 'game.touchStickDescInv' : 'game.touchStickDesc';
  stickDesc.textContent = t(stickDesc.dataset.i18n);
  renderHint();
}

// ---------------------------------------------------------------------------------------------------
// Overlay

function renderOverlay() {
  const result = $('result');
  const resultLine = $('result-line');
  const lead = $('overlay-lead');
  // The results screen stays compact: the controls are already known by then.
  const compact = mode === 'over' && !!lastResult;
  panel.classList.toggle('is-result', compact);
  panel.classList.toggle('is-paused', mode === 'paused');
  $('controls').hidden = compact;
  $('tip').hidden = compact;
  $('invert-row').hidden = compact || !game;
  if (mode === 'over' && lastResult) {
    $('overlay-kicker').textContent = t('game.kicker');
    $('overlay-title').textContent = t('game.over');
    const cause = t(lastResult.cause === 'wall' ? 'game.causeWall' : lastResult.cause === 'ridge' ? 'game.causeRidge' : 'game.causeGround');
    resultLine.textContent = t('game.resultLine', { cause, km: (lastResult.distance / 1000).toFixed(2), seg: lastResult.segment });
    $('result-score').textContent = lastResult.score.toLocaleString('en-US');
    $('result-distance').textContent = lastResult.distance.toLocaleString('en-US');
    $('result-gates').textContent = `${lastResult.gates}/${lastResult.gatesTotal}`;
    $('result-chain').textContent = String(lastResult.bestChain);
    $('result-best').textContent = lastResult.best.toLocaleString('en-US');
    $('new-best').hidden = !lastResult.isNew;
    result.hidden = false;
    resultLine.hidden = false;
    lead.hidden = true;
    startBtn.textContent = t('game.again');
  } else if (mode === 'paused') {
    $('overlay-title').textContent = t('game.paused');
    result.hidden = true;
    resultLine.hidden = true;
    lead.hidden = true;
    startBtn.textContent = t('game.resume');
  } else {
    $('overlay-title').textContent = t('game.title');
    result.hidden = true;
    resultLine.hidden = true;
    lead.hidden = false;
    startBtn.textContent = t('game.start');
  }
}

function setMode(next: typeof mode, focusStart = true) {
  mode = next;
  overlay.hidden = next === 'playing';
  pauseBtn.disabled = next !== 'playing';
  document.body.classList.toggle('is-playing', next === 'playing');
  renderOverlay();
  renderHint();
  if (next !== 'playing') {
    toast.classList.remove('show');
    warnEl.hidden = true;
    $('danger').classList.remove('on');
    marker.hidden = true;
    stickEl.hidden = true;
  }
  if (overlay.hidden) (document.activeElement as HTMLElement | null)?.blur();
  else if (focusStart) focusIfActive(startBtn);
}

// ---------------------------------------------------------------------------------------------------
// Sound

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const note = (step: number) => 392 * Math.pow(2, PENTATONIC[Math.min(step, PENTATONIC.length - 1)] / 12);
let thermalToasts = 0;
const NEWS_KEYS: Record<NonNullable<SegmentNews>, string> = {
  ridges: 'game.segRidges', wind: 'game.segWind', narrow: 'game.segNarrow', rings: 'game.segRings',
  gusts: 'game.segGusts', saddles: 'game.segSaddles', top: 'game.segTop',
};

/** A broken chain: a falling minor third, never the multiplier fanfare. */
function chainBroken(chain: number) {
  sfx.tone(392, 0.16, { type: 'triangle', gain: 0.08 });
  sfx.tone(311, 0.32, { type: 'triangle', gain: 0.08, delay: 0.12, slideTo: 260 });
  showToast(t('game.chainBroken', { n: chain }), 'warn');
}

function onEvent(event: RunEvent) {
  switch (event.type) {
    case 'gate': {
      const step = Math.min(event.chain - 1, PENTATONIC.length - 1);
      sfx.tone(note(step), 0.16, { type: 'triangle', gain: 0.14 });
      sfx.tone(note(step) * 2, 0.22, { type: 'sine', gain: 0.06, delay: 0.05 });
      pop(`+${event.points}`);
      gateResults++;
      if (hint === 'dive') setHint('pull');
      break;
    }
    case 'miss':
      if (event.chain >= 3) chainBroken(event.chain);
      else sfx.tone(196, 0.22, { type: 'sine', gain: 0.1, slideTo: 150 });
      gateResults++;
      if (hint === 'dive') setHint('pull');
      break;
    case 'mult':
      // Only a rising multiplier gets the fanfare (logic.ts reports breaks as 'miss' or 'bounce').
      if (event.mult <= 1) break;
      [0, 4, 7, 12].forEach((n, i) => sfx.tone(523 * Math.pow(2, n / 12), 0.14, { type: 'square', gain: 0.05, delay: i * 0.06 }));
      showToast(t('game.multToast', { n: event.mult }), 'good');
      break;
    case 'charge':
      sfx.tone(880, 0.1, { type: 'sine', gain: 0.1 });
      sfx.tone(1320, 0.18, { type: 'sine', gain: 0.1, delay: 0.08 });
      showToast(t('game.chargeToast'), 'good');
      break;
    case 'burst':
      sfx.noise(0.6, { gain: 0.32, frequency: 700, type: 'bandpass' });
      sfx.tone(140, 0.5, { type: 'sawtooth', gain: 0.06, slideTo: 420 });
      if (hint === 'burst') setHint('done');
      break;
    case 'denied':
      sfx.tone(110, 0.16, { type: 'square', gain: 0.08 });
      showToast(t('game.noCharge'), 'warn');
      break;
    case 'thermal':
      if (event.on) {
        sfx.tone(330, 0.6, { type: 'sine', gain: 0.08, slideTo: 660 });
        if (thermalToasts < 2) { thermalToasts++; showToast(t('game.thermalToast'), 'good'); }
        if (hint === 'thermal') setHint('burst');
      }
      break;
    case 'segment': {
      // The chord climbs a step with every segment, so the deeper stretches sound tenser too.
      const root = 330 * Math.pow(2, Math.min(event.index - 1, 12) / 12);
      [0, 4, 7].forEach((n, i) => sfx.tone(root * Math.pow(2, n / 12), 0.7, { type: 'triangle', gain: 0.06, delay: i * 0.05 }));
      const news = segmentNews(event.index);
      const title = t('game.segmentToast', { n: event.index + 1 });
      showToast(news ? `${title} · ${t(NEWS_KEYS[news])}` : title, '', 2600);
      break;
    }
    case 'stall':
      if (event.on) { sfx.tone(300, 0.18, { type: 'square', gain: 0.05, slideTo: 200 }); sfx.tone(300, 0.18, { type: 'square', gain: 0.05, slideTo: 200, delay: 0.24 }); }
      break;
    case 'skim':
      if (event.on) { sfx.tone(1046, 0.08, { type: 'triangle', gain: 0.06 }); pop(t('game.skim')); }
      break;
    case 'grace-over':
      showToast(t('game.graceOver'), 'warn', 2200);
      renderHint();
      break;
    case 'bounce':
      sfx.tone(90, 0.3, { type: 'sine', gain: 0.25, slideTo: 260 });
      sfx.noise(0.3, { gain: 0.2, frequency: 500 });
      showToast(t('game.bounceToast'), 'warn');
      break;
    case 'crash':
      sfx.noise(0.9, { gain: 0.55, frequency: 700 });
      sfx.tone(70, 0.8, { type: 'sine', gain: 0.3, slideTo: 35 });
      break;
  }
}

/**
 * The kit has no looping voice, so the wind is overlapping noise grains whose filter follows the airspeed.
 * Six grains overlap at any moment (0.3 s every 50 ms), so the kit's per-grain fade-out sums to a steady roar
 * with about 2 dB of ripple instead of a 5 Hz chuff.
 */
const WIND_EVERY = 50;
const WIND_GRAIN = 0.3;
let varioPhase = 0;
let windTick = 0;
window.setInterval(() => {
  if (mode !== 'playing' || !lastHud || !game || game.status !== 'running' || sfx.muted) return;
  const v = lastHud.speed / 3.6;
  sfx.noise(WIND_GRAIN, { gain: (0.015 + Math.min(1, v / 75) * 0.075) * 0.58, frequency: 260 + v * 16, type: 'bandpass' });
  // A soft vario chirp while climbing, at most 2.5 per second (checked every 200 ms).
  if (++windTick % 4) return;
  varioPhase += 0.2 * Math.min(2.5, 0.8 + lastHud.climb * 0.3);
  if (lastHud.climb > 1 && varioPhase >= 1) {
    varioPhase = 0;
    sfx.tone(600 + Math.min(10, lastHud.climb) * 40, 0.07, { type: 'sine', gain: 0.05 });
  }
  if (varioPhase > 1) varioPhase = 1;
}, WIND_EVERY);

// ---------------------------------------------------------------------------------------------------
// Wiring

const game = RidgeGlider.create(stageEl);
invertBox.checked = invert;
renderKeys();

if (!game) {
  const fallback = document.createElement('div');
  fallback.className = 'g3d-fallback';
  fallback.setAttribute('role', 'alert');
  fallback.dataset.i18n = 'game.fallback';
  fallback.textContent = t('game.fallback');
  // In the menu panel, where the Jump button would be.
  startBtn.after(fallback);
  startBtn.disabled = true;
  startBtn.hidden = true;
  pauseBtn.disabled = true;
  $('touch').hidden = true;
} else {
  game.invert = invert;
  game.onHud = renderHud;
  game.onEvent = onEvent;
  game.onMarker = renderMarker;
  game.onStick = renderStick;
  game.onOver = result => {
    const record = best.submit(BEST_KEY, result.score);
    lastResult = { ...result, best: record.best, isNew: record.isNew };
    overAt = performance.now();
    sfx.tone(record.isNew ? 784 : 392, 0.4, { type: 'triangle', gain: 0.1 });
    if (record.isNew) sfx.tone(1175, 0.5, { type: 'triangle', gain: 0.08, delay: 0.15 });
    setMode('over');
  };

  invertBox.addEventListener('change', () => {
    invert = invertBox.checked;
    game.invert = invert;
    try { localStorage.setItem(INVERT_KEY, invert ? '1' : '0'); } catch { /* session only */ }
    renderKeys();
  });

  startBtn.addEventListener('click', () => {
    // A held Space or Enter from the last run must not throw the player straight back in.
    if (mode === 'over' && performance.now() - overAt < 650) return;
    sfx.unlock();
    if (mode === 'paused') game.resume();
    else {
      hint = 'dive';
      hintTimer = 0;
      gateResults = 0;
      thermalToasts = 0;
      lastHud = null;
      pops.replaceChildren();
      toast.classList.remove('show');
      game.start();
    }
    setMode('playing');
  });

  burstBtn.addEventListener('pointerdown', event => {
    event.preventDefault();
    sfx.unlock();
    game.burst();
  });
  // Keyboard activation of the on-screen button (detail 0); pointer clicks already fired on pointerdown.
  burstBtn.addEventListener('click', event => { if (event.detail === 0) game.burst(); });

  // Mode stays 'playing' through the crash animation; there is nothing to pause until game over.
  const pause = (focusResume = true) => { if (mode === 'playing' && game.status === 'running') { game.pause(); setMode('paused', focusResume); } };
  pauseBtn.addEventListener('click', () => pause());
  window.addEventListener('keydown', event => {
    if ((event.code === 'KeyP' || event.code === 'Escape') && mode === 'playing') pause();
    else if (event.code === 'Escape' && mode === 'paused') { game.resume(); setMode('playing'); }
  });
  onFocusLost(() => pause());
  // Keys ignores every key while the language select has focus, so the flight would go on with no
  // steering. Pause instead, and leave focus on the select so its picker stays open.
  languageSelect.addEventListener('focus', () => pause(false));

  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as Record<string, unknown>).__ridgeGlider = {
      state: () => ({ mode, game: game.debugState(), hud: lastHud, hint, reducedMotion }),
      advance: (seconds: number) => game.debugAdvance(seconds),
      suggest: () => game.debugSuggest(),
      manual: (on: boolean) => game.debugManual(on),
      auto: (on: boolean) => game.debugAuto(on),
    };
  }
}

bindSoundButton(soundBtn, sfx);

renderHud({ score: 0, distance: 0, speed: 0, agl: 0, climb: 0, chain: 0, mult: 1, charges: MAX_CHARGES, segment: 1, wind: 0, grace: 0, thermalAhead: Infinity, warning: null, skimming: false });
lastHud = null;
setMode('menu');
