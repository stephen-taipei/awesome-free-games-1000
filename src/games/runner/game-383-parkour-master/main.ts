import { Sfx, best, setupI18n, focusIfActive, onFocusLost, bindSoundButton, clamp, prefersTouch } from '../../../shared/three/kit';
import { SkylineGetaway, type Hud, type Result, type GameEvent } from './game';
import { LEAD_MAX, LEAD_WARN, districtKey } from './logic';
import { translations } from './i18n';

const BEST_KEY = 'afg-skyline-getaway-best';
/** Combo notes climb a major pentatonic scale. */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stageEl = $('stage');
const overlay = $('overlay');
const startBtn = $<HTMLButtonElement>('start-btn');
const pauseBtn = $<HTMLButtonElement>('pause-btn');
const soundBtn = $<HTMLButtonElement>('sound-btn');
const languageSelect = $<HTMLSelectElement>('language-select');
const toast = $('toast');
const glare = $('glare');
const speedChip = $('speed-chip');
const marginChip = $('margin-chip');
const comboEl = $('combo');
const sfx = new Sfx();
let mode: 'menu' | 'playing' | 'paused' | 'over' = 'menu';
let lastResult: (Result & { best: number; isNew: boolean }) | null = null;
let lastHud: Hud = { distance: 0, speed: 0, top: 8, floor: 4.8, drone: 6.6, lead: 18, combo: 0, district: 0 };
let armedAt = 0;
let sirenAt = 0;
let sirenHigh = false;
let runs = 0;

const t = setupI18n(translations, languageSelect, () => { renderOverlay(); renderHud(lastHud); });
const districtName = (district: number) => t(`game.districts.${districtKey(district)}`);

// One toast at a time; a district banner is not cut short by a move callout.
let toastUntil = 0;
let toastPriority = 0;
function showToast(text: string, kind: '' | 'good' | 'warn' | 'big' = '', ms = 900, priority = 0) {
  const now = performance.now();
  if (now < toastUntil && priority < toastPriority) return;
  toastUntil = now + ms;
  toastPriority = priority;
  toast.textContent = text;
  toast.className = `g3d-toast show ${kind}`;
  window.clearTimeout(Number(toast.dataset.timer));
  toast.dataset.timer = String(window.setTimeout(() => toast.classList.remove('show'), ms));
}

function renderHud(hud: Hud) {
  lastHud = hud;
  $('distance').textContent = String(hud.distance);
  $('speed').textContent = String(Math.round(hud.speed * 3.6));
  // Speed is the life bar: below the drone's tick, the light gains on you.
  const low = hud.floor * 0.9;
  const span = Math.max(0.1, hud.top - low);
  $('speed-fill').style.transform = `scaleX(${clamp((hud.speed - low) / span, 0.03, 1).toFixed(3)})`;
  $('drone-tick').style.left = `${(clamp((hud.drone - low) / span, 0, 1) * 100).toFixed(1)}%`;
  speedChip.classList.toggle('slow', hud.speed < hud.drone - 0.05);
  $('margin').textContent = String(Math.max(0, Math.round(hud.lead)));
  $('margin-fill').style.transform = `scaleX(${clamp(hud.lead / LEAD_MAX, 0, 1).toFixed(3)})`;
  marginChip.classList.toggle('danger', hud.lead < LEAD_WARN);
  comboEl.textContent = `×${hud.combo}`;
  $('district-name').textContent = districtName(hud.district);
  glare.style.opacity = mode === 'playing' ? clamp((11 - hud.lead) / 11, 0, 1).toFixed(2) : '0';
  // A two-tone siren, slower than 2 Hz, while the drone is close.
  if (mode === 'playing' && hud.lead < LEAD_WARN && hud.lead > 0) {
    const now = performance.now();
    if (now >= sirenAt) {
      sirenAt = now + 560;
      sirenHigh = !sirenHigh;
      sfx.tone(sirenHigh ? 920 : 690, 0.45, { type: 'triangle', gain: 0.035 + 0.05 * (1 - hud.lead / LEAD_WARN) });
    }
  }
}

function renderOverlay() {
  const result = $('result');
  const lead = $('overlay-lead');
  if (mode === 'over' && lastResult) {
    const r = lastResult;
    $('overlay-title').textContent = t(r.cause === 'caught' ? 'game.caught' : 'game.fell');
    lead.textContent = t(r.cause === 'caught' ? 'game.causeCaught' : 'game.causeFell', { n: r.distance });
    lead.hidden = false;
    $('result-distance').textContent = String(r.distance);
    $('result-best').textContent = String(r.best);
    $('new-best').hidden = !r.isNew;
    $('result-district').textContent = `${r.district} · ${districtName(r.district - 1)}`;
    $('result-perfects').textContent = String(r.perfects);
    $('result-combo').textContent = `×${r.bestCombo}`;
    $('result-speed').textContent = String(r.topSpeed);
    result.hidden = false;
    startBtn.textContent = t('game.again');
  } else if (mode === 'paused') {
    $('overlay-title').textContent = t('game.paused');
    result.hidden = true;
    lead.hidden = true;
    startBtn.textContent = t('game.resume');
  } else {
    $('overlay-title').textContent = t('game.title');
    lead.textContent = t('game.lead');
    lead.hidden = false;
    result.hidden = true;
    startBtn.textContent = t('game.start');
  }
}

function setMode(next: typeof mode, focusStart = true) {
  mode = next;
  overlay.hidden = next === 'playing';
  overlay.classList.toggle('is-over', next === 'over');
  // A panel scrolled to reach Start earlier would otherwise open part-way down.
  overlay.scrollTop = 0;
  pauseBtn.disabled = next !== 'playing';
  if (next !== 'playing') glare.style.opacity = '0';
  renderOverlay();
  if (overlay.hidden) (document.activeElement as HTMLElement | null)?.blur();
  else if (focusStart) focusIfActive(startBtn);
}

function playEvent(event: GameEvent) {
  switch (event.type) {
    case 'step': sfx.noise(0.03, { gain: 0.05, frequency: 1700, type: 'bandpass' }); break;
    case 'jump': sfx.tone(250, 0.14, { type: 'triangle', slideTo: 520, gain: 0.09 }); break;
    case 'land':
      if (event.hard) { sfx.noise(0.2, { gain: 0.32, frequency: 380 }); sfx.tone(95, 0.2, { type: 'sine', slideTo: 48, gain: 0.22 }); }
      else sfx.noise(0.07, { gain: 0.14, frequency: 700 });
      break;
    case 'perfect': {
      const combo = Math.max(1, event.combo ?? 1);
      const f = 523.25 * Math.pow(2, SCALE[Math.min(combo - 1, SCALE.length - 1)] / 12);
      sfx.tone(f, 0.16, { type: 'triangle', gain: 0.13 });
      sfx.tone(f * 1.5, 0.14, { type: 'sine', gain: 0.07, delay: 0.05 });
      const name = t(`game.moves.${event.move ?? 'vault'}`);
      showToast(combo >= 2 ? `${name} ×${combo}` : name, 'good', 650);
      comboEl.parentElement?.classList.add('bump');
      window.setTimeout(() => comboEl.parentElement?.classList.remove('bump'), 160);
      break;
    }
    case 'stumble':
      sfx.tone(190, 0.22, { type: 'sawtooth', slideTo: 80, gain: 0.1 });
      sfx.noise(0.16, { gain: 0.2, frequency: 600 });
      showToast(t('game.stumble'), 'warn', 700);
      break;
    case 'slide': sfx.noise(0.34, { gain: 0.1, frequency: 2400, type: 'bandpass' }); break;
    case 'roll': sfx.noise(0.25, { gain: 0.14, frequency: 520 }); sfx.tone(220, 0.2, { type: 'sine', slideTo: 330, gain: 0.07 }); break;
    case 'vault': sfx.tone(400, 0.1, { type: 'square', slideTo: 620, gain: 0.05 }); sfx.noise(0.06, { gain: 0.12, frequency: 1200 }); break;
    case 'kick': sfx.noise(0.08, { gain: 0.28, frequency: 420 }); sfx.tone(330, 0.16, { type: 'square', slideTo: 660, gain: 0.06 }); break;
    case 'crack': sfx.noise(0.12, { gain: 0.22, frequency: 4200, type: 'highpass' }); break;
    case 'collapse': sfx.noise(0.8, { gain: 0.38, frequency: 900 }); sfx.noise(0.45, { gain: 0.16, frequency: 5200, type: 'highpass' }); break;
    case 'zip': sfx.tone(880, 0.6, { type: 'sawtooth', slideTo: 1500, gain: 0.035 }); sfx.noise(0.55, { gain: 0.07, frequency: 3200, type: 'bandpass' }); break;
    case 'release': sfx.tone(700, 0.12, { type: 'triangle', slideTo: 1050, gain: 0.07 }); break;
    case 'district': {
      const d = event.district ?? 0;
      [0, 4, 7, 12].forEach((step, i) => sfx.tone(392 * Math.pow(2, step / 12), 0.22, { type: 'triangle', gain: 0.1, delay: i * 0.09 }));
      showToast(t('game.districtToast', { n: d + 1, name: districtName(d) }), 'big', 2200, 2);
      break;
    }
    case 'warn': showToast(t('game.warn'), 'warn', 1200, 1); break;
    case 'bonk': sfx.noise(0.22, { gain: 0.4, frequency: 300 }); sfx.tone(120, 0.3, { type: 'square', slideTo: 60, gain: 0.09 }); break;
    case 'caught': sfx.tone(940, 0.9, { type: 'sawtooth', slideTo: 240, gain: 0.07 }); sfx.noise(0.5, { gain: 0.15, frequency: 2000 }); break;
    case 'fell': sfx.tone(720, 1.1, { type: 'sine', slideTo: 90, gain: 0.13 }); break;
    default: break;
  }
}

const game = SkylineGetaway.create(stageEl);

if (!game) {
  const note = document.createElement('div');
  note.className = 'g3d-fallback';
  note.setAttribute('role', 'alert');
  note.dataset.i18n = 'game.fallback';
  note.textContent = t('game.fallback');
  // In the menu panel, where the Start button would be.
  startBtn.after(note);
  startBtn.disabled = true;
  startBtn.hidden = true;
  pauseBtn.disabled = true;
} else {
  // Headless checks read the run through this handle; it is not used by the page itself.
  if (new URLSearchParams(location.search).has('autotest')) (window as unknown as { skyline: SkylineGetaway }).skyline = game;
  game.onHud = renderHud;
  // Keep the drone out from under the HUD chips, which wrap onto more rows on narrow screens.
  const stats = document.querySelector<HTMLElement>('.g3d-stats');
  const measureHud = () => { if (stats) game.safeTop = (stats.getBoundingClientRect().bottom + 34) / Math.max(1, stageEl.clientHeight); };
  window.addEventListener('resize', measureHud);
  if (stats && 'ResizeObserver' in window) new ResizeObserver(measureHud).observe(stats);
  measureHud();
  game.onEvent = playEvent;
  game.onOver = result => {
    const record = best.submit(BEST_KEY, result.distance);
    lastResult = { ...result, best: record.best, isNew: record.isNew };
    // A jump key mashed through the fall must not click Again the moment it appears.
    armedAt = performance.now() + 500;
    setMode('over');
  };

  startBtn.addEventListener('click', () => {
    if (performance.now() < armedAt) return;
    sfx.unlock();
    if (mode === 'paused') game.resume();
    else {
      game.start();
      runs++;
      if (runs === 1 && prefersTouch()) showToast(`${t('game.touchJump')} · ${t('game.touchSlide')}`, '', 1800, 1);
    }
    setMode('playing');
  });
  // Mode stays 'playing' through the fall or capture; there is nothing to pause until the result.
  const pause = (focusResume = true) => { if (mode === 'playing' && game.state === 'running') { game.pause(); setMode('paused', focusResume); } };
  pauseBtn.addEventListener('click', () => pause());
  window.addEventListener('keydown', event => {
    if ((event.code === 'KeyP' || event.code === 'Escape') && mode === 'playing') pause();
    else if (event.code === 'Escape' && mode === 'paused') { game.resume(); setMode('playing'); }
  });
  onFocusLost(() => pause());
  // Keys ignores every key while the language select has focus, so a run would go on with no
  // controls. Pause instead, and leave focus on the select so its picker stays open.
  languageSelect.addEventListener('focus', () => pause(false));
}

bindSoundButton(soundBtn, sfx);

renderHud(lastHud);
setMode('menu');
