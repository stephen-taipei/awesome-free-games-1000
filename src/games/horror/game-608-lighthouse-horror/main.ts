import { Sfx, best, setupI18n, prefersReducedMotion } from '../../../shared/three/kit';
import { LighthouseWatch, type Hud, type EventDetail, type GameEvent, type Threat } from './game';
import { MAX_LIVES, BARREL_OIL, CRATE_OIL, CRATE_SCORE } from './logic';
import { translations } from './i18n';

const BEST_KEY = 'afg-lighthouse-watch-best';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stageEl = $('stage');
const overlay = $('overlay');
const startBtn = $<HTMLButtonElement>('start-btn');
const pauseBtn = $<HTMLButtonElement>('pause-btn');
const soundBtn = $<HTMLButtonElement>('sound-btn');
const toast = $('toast');
const scare = $('scare');
const popups = $('popups');
const threatLayer = $('threats');
const threatPool: HTMLElement[] = [];
const sfx = new Sfx();
const reducedMotion = prefersReducedMotion();
let mode: 'menu' | 'playing' | 'paused' | 'over' = 'menu';
let lastResult: { score: number; nights: number; banished: number; best: number; isNew: boolean } | null = null;
let seaTimer = 0;

const t = setupI18n(translations, $<HTMLSelectElement>('language-select'), () => renderOverlay());

function showToast(text: string, tone: '' | 'warn' | 'eerie' = '', ms = 1300) {
  toast.textContent = text;
  toast.classList.toggle('warn', tone === 'warn');
  toast.classList.toggle('eerie', tone === 'eerie');
  toast.classList.add('show');
  window.clearTimeout(Number(toast.dataset.timer));
  toast.dataset.timer = String(window.setTimeout(() => toast.classList.remove('show'), ms));
}

function renderHud(hud: Hud) {
  $('score').textContent = String(hud.score);
  $('night').textContent = String(hud.night);
  const lives = $('lives');
  lives.innerHTML = Array.from({ length: MAX_LIVES }, (_, i) => `<i class="${i < hud.lives ? 'on' : ''}"></i>`).join('');
  lives.setAttribute('aria-label', `${hud.lives}/${MAX_LIVES}`);
  const oil = Math.round(hud.oil);
  $('oil').textContent = String(oil);
  $('oil-bar').style.transform = `scaleX(${Math.max(0, Math.min(1, hud.oil / 100))})`;
  const chip = $('oil-chip');
  chip.classList.toggle('low', oil < 20);
  chip.classList.toggle('focus', hud.focused);
}

function renderOverlay() {
  const result = $('result');
  if (mode === 'over' && lastResult) {
    $('overlay-title').textContent = t('game.over');
    $('result-score').textContent = String(lastResult.score);
    $('result-nights').textContent = String(lastResult.nights);
    $('result-banished').textContent = String(lastResult.banished);
    $('result-best').textContent = String(lastResult.best);
    $('new-best').hidden = !lastResult.isNew;
    result.hidden = false;
    $('overlay-lead').hidden = true;
    startBtn.textContent = t('game.again');
  } else if (mode === 'paused') {
    $('overlay-title').textContent = t('game.paused');
    result.hidden = true;
    $('overlay-lead').hidden = true;
    startBtn.textContent = t('game.resume');
  } else {
    $('overlay-title').textContent = t('game.title');
    result.hidden = true;
    $('overlay-lead').hidden = false;
    startBtn.textContent = t('game.start');
  }
}

function setMode(next: typeof mode) {
  mode = next;
  overlay.hidden = next === 'playing';
  pauseBtn.disabled = next !== 'playing';
  document.body.classList.toggle('is-playing', next === 'playing');
  renderOverlay();
  if (!overlay.hidden) startBtn.focus({ preventScroll: true });
  else (document.activeElement as HTMLElement | null)?.blur();
}

function scareFlash() {
  scare.classList.remove('hit');
  // Restart the CSS animation.
  void scare.offsetWidth;
  scare.classList.add('hit');
}

function popup(text: string, x: number, y: number) {
  const el = document.createElement('span');
  el.className = 'pop';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  popups.append(el);
  window.setTimeout(() => el.remove(), reducedMotion ? 650 : 1000);
}

/** Glowing eye pairs on the screen edge for wraiths outside the view. */
function renderThreats(threats: readonly Threat[], count: number) {
  while (threatPool.length < count) {
    const el = document.createElement('i');
    el.className = 'threat';
    threatLayer.append(el);
    threatPool.push(el);
  }
  threatPool.forEach((el, i) => {
    if (i >= count) { if (!el.hidden) el.hidden = true; return; }
    const threat = threats[i];
    el.hidden = false;
    el.style.transform = `translate(${threat.x.toFixed(1)}px, ${threat.y.toFixed(1)}px)`;
    el.style.setProperty('--a', `${threat.angle.toFixed(3)}rad`);
    el.style.opacity = (0.35 + threat.near * 0.65).toFixed(2);
    el.classList.toggle('near', threat.near > 0.6);
  });
}

function playSound(event: GameEvent, detail: EventDetail = {}) {
  switch (event) {
    case 'burn':
      sfx.noise(0.1, { gain: 0.06, frequency: 3200, type: 'highpass' });
      sfx.tone(70 + Math.random() * 30, 0.1, { type: 'sawtooth', gain: 0.025 });
      break;
    case 'banish':
      sfx.tone(660, 0.4, { type: 'triangle', slideTo: 1320, gain: 0.11 });
      sfx.tone(990, 0.55, { type: 'sine', gain: 0.09, delay: 0.06 });
      sfx.tone(1480, 0.7, { type: 'sine', gain: 0.05, delay: 0.12 });
      break;
    case 'door':
      sfx.tone(72, 0.55, { type: 'sine', slideTo: 34, gain: 0.6 });
      sfx.noise(0.4, { gain: 0.55, frequency: 260 });
      sfx.tone(1250, 0.5, { type: 'sawtooth', slideTo: 170, gain: 0.07, delay: 0.03 });
      sfx.tone(1330, 0.45, { type: 'sawtooth', slideTo: 190, gain: 0.05, delay: 0.05 });
      break;
    case 'lightning':
      sfx.noise(1.1, { gain: 0.45, frequency: 2400 });
      window.setTimeout(() => sfx.noise(2.4, { gain: 0.4, frequency: 150 }), 260);
      break;
    case 'catch':
      sfx.tone(330, 0.18, { type: 'triangle', slideTo: 560, gain: 0.1 });
      break;
    case 'collect':
      sfx.tone(220, 0.12, { type: 'sine', gain: 0.16 });
      sfx.tone(294, 0.12, { type: 'sine', gain: 0.14, delay: 0.09 });
      sfx.tone(392, 0.22, { type: 'sine', gain: 0.12, delay: 0.18 });
      if (detail.relit) {
        sfx.tone(523, 0.5, { type: 'triangle', gain: 0.1, delay: 0.25 });
        sfx.tone(784, 0.7, { type: 'triangle', gain: 0.08, delay: 0.35 });
      }
      break;
    case 'empty':
      sfx.tone(150, 0.3, { type: 'square', slideTo: 70, gain: 0.07 });
      sfx.noise(0.15, { gain: 0.12, frequency: 1800, type: 'bandpass' });
      break;
    case 'night':
      sfx.tone(196, 2.4, { type: 'sine', gain: 0.24 });
      sfx.tone(392, 1.8, { type: 'sine', gain: 0.07 });
      sfx.tone(587, 1.2, { type: 'triangle', gain: 0.035 });
      break;
    case 'clear':
      sfx.tone(392, 0.5, { type: 'sine', gain: 0.12 });
      sfx.tone(523, 0.7, { type: 'sine', gain: 0.12, delay: 0.16 });
      sfx.tone(659, 1.0, { type: 'sine', gain: 0.1, delay: 0.32 });
      break;
    case 'focus':
      sfx.noise(0.05, { gain: 0.12, frequency: 2600, type: 'highpass' });
      sfx.tone(120, 0.2, { type: 'sawtooth', slideTo: 180, gain: 0.04 });
      break;
    case 'sink':
      sfx.tone(300, 0.5, { type: 'sine', slideTo: 110, gain: 0.05 });
      break;
    case 'rise':
      // Two detuned low moans beat against each other.
      sfx.tone(104, 1.4, { type: 'sine', slideTo: 88, gain: 0.08 });
      sfx.tone(110, 1.4, { type: 'sine', slideTo: 92, gain: 0.07 });
      break;
  }
}

const game = LighthouseWatch.create(stageEl);

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
  game.onHud = renderHud;
  game.onPopup = popup;
  game.onThreats = renderThreats;
  game.onEvent = (event, detail = {}) => {
    if (mode === 'playing') playSound(event, detail);
    if (event === 'night') {
      const intro = detail.intro;
      showToast(t('game.nightToast', { n: detail.night ?? 1 }), '', 1600);
      if (intro) {
        const key = intro === 'skitter' ? 'game.introSkitter' : intro === 'brute' ? 'game.introBrute' : 'game.introWatcher';
        window.setTimeout(() => { if (mode === 'playing') showToast(t(key), 'eerie', 2600); }, 1700);
      }
    } else if (event === 'clear') {
      showToast(t('game.clearToast', { n: detail.night ?? 1, bonus: detail.bonus ?? 0 }), '', 2400);
    } else if (event === 'door') {
      scareFlash();
      showToast(t('game.doorToast'), 'warn', 1400);
    } else if (event === 'empty') {
      showToast(t('game.empty'), 'warn');
    } else if (event === 'collect') {
      if (detail.item === 'oil') showToast(t('game.oilToast', { n: BARREL_OIL }));
      else if (detail.relit) showToast(`${t('game.oilToast', { n: CRATE_OIL })} · ${t('game.relit')}`);
      else showToast(`${t('game.oilToast', { n: CRATE_OIL })} · ${t('game.crateScore', { n: CRATE_SCORE })}`);
    }
  };
  game.onOver = result => {
    const record = best.submit(BEST_KEY, result.score);
    lastResult = { score: result.score, nights: result.nights, banished: result.banished, best: record.best, isNew: record.isNew };
    sfx.tone(160, 1.8, { type: 'sine', slideTo: 60, gain: 0.2 });
    setMode('over');
  };

  startBtn.addEventListener('click', () => {
    sfx.unlock();
    if (mode === 'paused') game.resume();
    else game.start();
    setMode('playing');
  });
  pauseBtn.addEventListener('click', () => { if (mode === 'playing') { game.pause(); setMode('paused'); } });
  window.addEventListener('keydown', event => {
    if ((event.code === 'KeyP' || event.code === 'Escape') && mode === 'playing') { game.pause(); setMode('paused'); }
    else if (event.code === 'Escape' && mode === 'paused') { game.resume(); setMode('playing'); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') { game.pause(); setMode('paused'); } });

  // Hold-to-use touch buttons.
  document.querySelectorAll<HTMLButtonElement>('#touch [data-control]').forEach(button => {
    const control = button.dataset.control as 'left' | 'right' | 'focus';
    const set = (down: boolean) => { button.classList.toggle('on', down); game.press(control, down); };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      try { button.setPointerCapture(event.pointerId); } catch { /* synthetic events */ }
      set(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(type, () => set(false));
    button.addEventListener('contextmenu', event => event.preventDefault());
  });

  // A low sea wash under the storm while a watch is on.
  window.setInterval(() => {
    if (mode !== 'playing') return;
    seaTimer -= 1;
    if (seaTimer > 0) return;
    seaTimer = 2 + Math.floor(Math.random() * 2);
    sfx.noise(2.6, { gain: 0.05, frequency: 420 });
  }, 1000);
}

soundBtn.setAttribute('aria-pressed', String(!sfx.muted));
soundBtn.textContent = sfx.muted ? '♪̸' : '♪';
soundBtn.addEventListener('click', () => {
  sfx.unlock();
  sfx.setMuted(!sfx.muted);
  soundBtn.setAttribute('aria-pressed', String(!sfx.muted));
  soundBtn.textContent = sfx.muted ? '♪̸' : '♪';
});

renderHud({ score: 0, night: 1, lives: MAX_LIVES, oil: 100, banished: 0, focused: false });
setMode('menu');
