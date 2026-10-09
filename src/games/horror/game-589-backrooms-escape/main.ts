import { Sfx, best, setupI18n, prefersTouch } from '../../../shared/three/kit';
import { BackroomsEscape, type Atmos, type GameEvent, type Hud } from './game';
import { Hum } from './hum';
import { translations } from './i18n';
import { ITEMS_PER_LEVEL } from './logic';

const BEST_KEY = 'afg-backrooms-escape-best';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stageEl = $('stage');
const overlay = $('overlay');
const startBtn = $<HTMLButtonElement>('start-btn');
const pauseBtn = $<HTMLButtonElement>('pause-btn');
const soundBtn = $<HTMLButtonElement>('sound-btn');
const lightBtn = $<HTMLButtonElement>('light-btn');
const sprintBtn = $<HTMLButtonElement>('sprint-btn');
const chalkBtn = $<HTMLButtonElement>('chalk-btn');
const touchControls = $('touch-controls');
const lookHint = $('look-hint');
const crosshair = $('crosshair');
const stick = $('stick');
const toast = $('toast');
const dreadEl = $('dread');
const fadeEl = $('fade');
const flashEl = $('flash');
const sfx = new Sfx();
const hum = new Hum();
let mode: 'menu' | 'playing' | 'paused' | 'over' = 'menu';
let pausedAt = 0;
let lastResult: { level: number; water: number; score: number; best: number; isNew: boolean } | null = null;

const t = setupI18n(translations, $<HTMLSelectElement>('language-select'), () => renderOverlay());

function showToast(text: string, tone: '' | 'warn' | 'good' = '', ms = 1400) {
  toast.textContent = text;
  toast.classList.toggle('warn', tone === 'warn');
  toast.classList.toggle('good', tone === 'good');
  toast.classList.add('show');
  window.clearTimeout(Number(toast.dataset.timer));
  toast.dataset.timer = String(window.setTimeout(() => toast.classList.remove('show'), ms));
}

let hudCache = '';
function renderHud(hud: Hud) {
  const key = `${hud.level}|${hud.items}|${hud.stamina.toFixed(2)}|${hud.exhausted}|${hud.battery.toFixed(2)}|${hud.light}`;
  if (key === hudCache) return;
  hudCache = key;
  $('level').textContent = String(hud.level);
  const items = $('items');
  items.innerHTML = Array.from({ length: ITEMS_PER_LEVEL }, (_, i) => `<i class="${i < hud.items ? 'on' : ''}"></i>`).join('');
  items.setAttribute('aria-label', `${hud.items}/${ITEMS_PER_LEVEL}`);
  $('stamina').style.transform = `scaleX(${hud.stamina.toFixed(3)})`;
  $('stamina-chip').classList.toggle('tired', hud.exhausted);
  $('battery').style.transform = `scaleX(${hud.battery.toFixed(3)})`;
  $('battery-chip').classList.toggle('low', hud.battery < 0.2);
  $('battery-chip').classList.toggle('off', !hud.light);
  lightBtn.setAttribute('aria-pressed', String(hud.light));
}

function renderOverlay() {
  const result = $('result');
  const lead = $('overlay-lead');
  const controls = $('controls');
  const tip = $('overlay-tip');
  if (mode === 'over' && lastResult) {
    $('overlay-title').textContent = t('game.over');
    lead.textContent = t('game.overLead', { n: lastResult.level });
    lead.hidden = false;
    $('result-level').textContent = String(lastResult.level);
    $('result-water').textContent = String(lastResult.water);
    $('result-score').textContent = String(lastResult.score);
    $('result-best').textContent = String(lastResult.best);
    $('new-best').hidden = !lastResult.isNew;
    result.hidden = false;
    controls.hidden = true;
    tip.hidden = false;
    startBtn.textContent = t('game.again');
  } else if (mode === 'paused') {
    $('overlay-title').textContent = t('game.paused');
    lead.hidden = true;
    result.hidden = true;
    controls.hidden = false;
    tip.hidden = true;
    startBtn.textContent = t('game.resume');
  } else {
    $('overlay-title').textContent = t('game.title');
    lead.textContent = t('game.lead');
    lead.hidden = false;
    result.hidden = true;
    controls.hidden = false;
    tip.hidden = false;
    startBtn.textContent = t('game.start');
  }
}

let hintTimer = 0;
/** Shows the mouse hint for a few seconds whenever play (re)starts without pointer lock. */
function updateHint(game: BackroomsEscape) {
  const show = mode === 'playing' && !prefersTouch() && !game.pointerLocked && game.status !== 'dying';
  lookHint.hidden = !show;
  window.clearTimeout(hintTimer);
  if (show) hintTimer = window.setTimeout(() => { lookHint.hidden = true; }, 6000);
}

function setMode(next: typeof mode, game: BackroomsEscape | null) {
  mode = next;
  overlay.hidden = next === 'playing';
  document.body.classList.toggle('br-overlay-open', !overlay.hidden);
  pauseBtn.disabled = next !== 'playing';
  touchControls.hidden = !(next === 'playing' && prefersTouch());
  crosshair.hidden = next !== 'playing';
  if (next === 'playing') hum.start(); else hum.stop();
  if (next !== 'playing') sprintBtn.classList.remove('on');
  if (game) updateHint(game);
  renderOverlay();
  if (!overlay.hidden) startBtn.focus({ preventScroll: true });
  else (document.activeElement as HTMLElement | null)?.blur();
}

function playEvent(event: GameEvent, value = 0) {
  switch (event) {
    case 'step':
      sfx.noise(0.09, { gain: 0.13, frequency: 300 + value * 70 });
      sfx.noise(0.05, { gain: 0.03, frequency: 1700, type: 'bandpass' });
      break;
    case 'sprint-step':
      sfx.noise(0.11, { gain: 0.24, frequency: 420 + value * 80 });
      sfx.noise(0.07, { gain: 0.06, frequency: 1500, type: 'bandpass' });
      break;
    case 'pickup':
      sfx.tone(880, 0.25, { type: 'triangle', gain: 0.14 });
      sfx.tone(1318, 0.35, { type: 'triangle', gain: 0.12, delay: 0.09 });
      sfx.tone(1760, 0.5, { type: 'sine', gain: 0.08, delay: 0.18 });
      showToast(t('game.found', { n: value }), 'good');
      break;
    case 'battery':
      sfx.tone(520, 0.08, { type: 'square', gain: 0.06 });
      sfx.tone(780, 0.12, { type: 'square', gain: 0.06, delay: 0.07 });
      showToast(t('game.batteryToast'), 'good');
      break;
    case 'unlock':
      for (const [i, f] of [392, 523, 659, 784].entries()) sfx.tone(f, 0.6, { type: 'triangle', gain: 0.1, delay: 0.35 + i * 0.12 });
      sfx.noise(0.2, { gain: 0.25, frequency: 300 });
      window.setTimeout(() => showToast(t('game.unlocked'), 'good', 2200), 900);
      break;
    case 'locked':
      sfx.noise(0.12, { gain: 0.3, frequency: 500 });
      sfx.noise(0.12, { gain: 0.25, frequency: 420 });
      sfx.tone(110, 0.2, { type: 'square', gain: 0.06 });
      showToast(t('game.locked', { n: value }), 'warn', 1800);
      break;
    case 'clear':
      sfx.tone(220, 1.2, { type: 'sine', gain: 0.2, slideTo: 880 });
      sfx.noise(0.6, { gain: 0.15, frequency: 2400 });
      break;
    case 'spotted':
      sfx.tone(146.8, 1.3, { type: 'sawtooth', gain: 0.16, slideTo: 98 });
      sfx.tone(155.6, 1.3, { type: 'sawtooth', gain: 0.16, slideTo: 103 });
      sfx.tone(1244, 0.7, { type: 'square', gain: 0.035, slideTo: 1100 });
      sfx.noise(0.5, { gain: 0.3, frequency: 3200, type: 'highpass' });
      showToast(t('game.spotted'), 'warn');
      break;
    case 'heard':
      sfx.tone(68, 1.4, { type: 'sawtooth', gain: 0.1, slideTo: 48 });
      showToast(t('game.heard'), 'warn', 1800);
      break;
    case 'lost':
      showToast(t('game.lost'), '', 1400);
      break;
    case 'caught':
      lookHint.hidden = true;
      sfx.noise(1.3, { gain: 0.7, frequency: 2600 });
      sfx.tone(220, 1.2, { type: 'sawtooth', gain: 0.25, slideTo: 40 });
      sfx.tone(233, 1.2, { type: 'square', gain: 0.12, slideTo: 45 });
      hum.stop();
      break;
    case 'light-on':
    case 'light-off':
      sfx.noise(0.03, { gain: 0.25, frequency: 4200, type: 'highpass' });
      sfx.tone(event === 'light-on' ? 1900 : 1500, 0.03, { type: 'square', gain: 0.04 });
      break;
    case 'light-dead':
      sfx.tone(300, 0.4, { type: 'square', gain: 0.06, slideTo: 80 });
      showToast(t('game.dead'), 'warn');
      break;
    case 'chalk':
      sfx.noise(0.2, { gain: 0.12, frequency: 2600, type: 'bandpass' });
      sfx.noise(0.14, { gain: 0.1, frequency: 3400, type: 'bandpass' });
      break;
    case 'exhausted':
      sfx.noise(0.6, { gain: 0.08, frequency: 900, type: 'bandpass' });
      showToast(t('game.exhausted'), 'warn', 1000);
      break;
    case 'heartbeat':
      sfx.tone(62, 0.13, { type: 'sine', gain: 0.18 + value * 0.25, slideTo: 42 });
      sfx.tone(58, 0.12, { type: 'sine', gain: 0.12 + value * 0.2, slideTo: 40, delay: 0.16 });
      break;
  }
}

const shown = { dread: -1, fade: -1, flash: -1 };
/** Mirrors the scene's dread, fades and flashes onto the CSS layers; writes only when a value moves. */
function renderAtmos(a: Atmos) {
  const dread = Math.round(a.dread * 100), fade = Math.round(a.fade * 100), flash = Math.round(a.flash * 100);
  if (dread !== shown.dread) { shown.dread = dread; dreadEl.style.opacity = String(dread * 0.009); hum.setDread(a.dread); }
  if (fade !== shown.fade) { shown.fade = fade; fadeEl.style.opacity = String(fade / 100); }
  if (flash !== shown.flash) { shown.flash = flash; flashEl.style.opacity = String(flash * 0.0055); }
}

const game = BackroomsEscape.create(stageEl);

if (!game) {
  const note = document.createElement('div');
  note.className = 'g3d-fallback';
  note.setAttribute('role', 'alert');
  note.dataset.i18n = 'game.fallback';
  note.textContent = t('game.fallback');
  stageEl.append(note);
  startBtn.disabled = true;
  startBtn.hidden = true;
  pauseBtn.disabled = true;
} else {
  const pause = () => {
    if (mode !== 'playing') return;
    game.pause();
    pausedAt = performance.now();
    setMode('paused', game);
  };
  const resume = () => {
    if (mode !== 'paused') return;
    game.resume();
    setMode('playing', game);
    game.lockPointer();
  };

  game.onHud = renderHud;
  game.onAtmos = renderAtmos;
  game.onEvent = playEvent;
  game.onLevel = level => {
    showToast(`${t('game.levelToast', { n: level })} · ${t('game.levelSub')}`, '', 2200);
    sfx.tone(98, 1.6, { type: 'sawtooth', gain: 0.08, slideTo: 82 });
  };
  game.onOver = result => {
    const record = best.submit(BEST_KEY, result.score);
    lastResult = { level: result.level, water: result.water, score: result.score, best: record.best, isNew: record.isNew };
    setMode('over', game);
  };
  game.onLock = locked => {
    // Esc releases the mouse first; treat that as a pause request.
    if (!locked && mode === 'playing' && (game.status === 'running' || game.status === 'transition')) pause();
    updateHint(game);
  };
  game.onStick = (active, x, y, kx, ky) => {
    stick.hidden = !active;
    if (!active) return;
    stick.style.left = `${x}px`;
    stick.style.top = `${y}px`;
    (stick.firstElementChild as HTMLElement).style.transform = `translate(${kx}px, ${ky}px)`;
  };

  startBtn.addEventListener('click', () => {
    sfx.unlock();
    if (mode === 'paused') { resume(); return; }
    game.start();
    setMode('playing', game);
    game.lockPointer();
    showToast(t('game.goal'), '', 2600);
  });
  pauseBtn.addEventListener('click', pause);
  window.addEventListener('keydown', event => {
    if ((event.code === 'KeyP' || event.code === 'Escape') && mode === 'playing') pause();
    else if ((event.code === 'Escape' || event.code === 'KeyP') && mode === 'paused' && performance.now() - pausedAt > 400) resume();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // Touch buttons: sprint is held, flashlight and chalk are taps.
  const sprintOff = () => { game.setSprint(false); sprintBtn.classList.remove('on'); };
  sprintBtn.addEventListener('pointerdown', event => {
    event.preventDefault();
    try { sprintBtn.setPointerCapture(event.pointerId); } catch { /* synthetic */ }
    game.setSprint(true);
    sprintBtn.classList.add('on');
  });
  sprintBtn.addEventListener('pointerup', sprintOff);
  sprintBtn.addEventListener('pointercancel', sprintOff);
  sprintBtn.addEventListener('lostpointercapture', sprintOff);
  lightBtn.addEventListener('click', () => game.toggleFlashlight());
  chalkBtn.addEventListener('click', () => game.markChalk());
}

function syncSound() {
  soundBtn.setAttribute('aria-pressed', String(!sfx.muted));
  soundBtn.textContent = sfx.muted ? '♪̸' : '♪';
}
syncSound();
soundBtn.addEventListener('click', () => {
  sfx.unlock();
  sfx.setMuted(!sfx.muted);
  hum.setMuted(sfx.muted);
  syncSound();
});

renderHud({ level: 1, items: 0, stamina: 1, exhausted: false, battery: 1, light: true, score: 0 });
setMode('menu', game);
