import { Sfx, best, setupI18n } from '../../../shared/three/kit';
import { PortalDash, PHASE_COLORS, MAX_CHARGES, type Hud } from './game';
import { translations } from './i18n';

const BEST_KEY = 'afg-portal-dash-best';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stageEl = $('stage');
const overlay = $('overlay');
const startBtn = $<HTMLButtonElement>('start-btn');
const pauseBtn = $<HTMLButtonElement>('pause-btn');
const soundBtn = $<HTMLButtonElement>('sound-btn');
const toast = $('toast');
const sfx = new Sfx();
let mode: 'menu' | 'playing' | 'paused' | 'over' = 'menu';
let lastResult: { distance: number; shards: number; best: number; isNew: boolean } | null = null;

const t = setupI18n(translations, $<HTMLSelectElement>('language-select'), () => renderOverlay());

function showToast(text: string, warn = false) {
  toast.textContent = text;
  toast.classList.toggle('warn', warn);
  toast.classList.add('show');
  window.clearTimeout(Number(toast.dataset.timer));
  toast.dataset.timer = String(window.setTimeout(() => toast.classList.remove('show'), 1100));
}

function renderHud(hud: Hud) {
  $('distance').textContent = String(hud.distance);
  $('shards').textContent = String(hud.shards);
  $('sector').textContent = String(hud.sector);
  const charges = $('charges');
  charges.innerHTML = Array.from({ length: MAX_CHARGES }, (_, i) => `<i class="${i < hud.charges ? 'on' : ''}"></i>`).join('');
  charges.setAttribute('aria-label', `${hud.charges}/${MAX_CHARGES}`);
  document.documentElement.style.setProperty('--phase', PHASE_COLORS[hud.phase]);
}

function renderOverlay() {
  const result = $('result');
  if (mode === 'over' && lastResult) {
    $('overlay-title').textContent = t('game.over');
    $('result-distance').textContent = String(lastResult.distance);
    $('result-shards').textContent = String(lastResult.shards);
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
  renderOverlay();
  if (!overlay.hidden) startBtn.focus({ preventScroll: true });
  else (document.activeElement as HTMLElement | null)?.blur();
}

const game = PortalDash.create(stageEl);

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
  game.onSector = sector => { showToast(t('game.sectorToast', { n: sector })); };
  game.onEvent = event => {
    if (event === 'flip') sfx.tone(320, 0.18, { type: 'sawtooth', slideTo: 880, gain: 0.12 });
    if (event === 'shard') sfx.tone(1320, 0.08, { type: 'triangle', gain: 0.12 });
    if (event === 'charge') { sfx.tone(660, 0.1, { type: 'square', gain: 0.08 }); sfx.tone(990, 0.14, { type: 'square', gain: 0.08, delay: 0.08 }); }
    if (event === 'portal') sfx.tone(180, 0.5, { type: 'sine', slideTo: 720, gain: 0.25 });
    if (event === 'denied') { sfx.tone(120, 0.15, { type: 'square', gain: 0.1 }); showToast(t('game.noCharge'), true); }
    if (event === 'crash') sfx.noise(0.6, { gain: 0.5, frequency: 900 });
  };
  game.onOver = result => {
    const record = best.submit(BEST_KEY, result.distance);
    lastResult = { distance: result.distance, shards: result.shards, best: record.best, isNew: record.isNew };
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
}

soundBtn.setAttribute('aria-pressed', String(!sfx.muted));
soundBtn.textContent = sfx.muted ? '♪̸' : '♪';
soundBtn.addEventListener('click', () => {
  sfx.unlock();
  sfx.setMuted(!sfx.muted);
  soundBtn.setAttribute('aria-pressed', String(!sfx.muted));
  soundBtn.textContent = sfx.muted ? '♪̸' : '♪';
});

renderHud({ distance: 0, shards: 0, charges: 1, speed: 0, phase: 0, sector: 1 });
setMode('menu');
