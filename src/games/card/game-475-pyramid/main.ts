import { Sfx, best, bindSoundButton, focusIfActive, onFocusLost, setupI18n } from '../../../shared/three/kit';
import { PyramidGame, type GameEvent, type Hud, type Result } from './game';
import { MAX_PASSES } from './logic';
import { translations } from './i18n';

const BEST_KEY = 'afg-pyramid-solitaire-best';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stageEl = $('stage');
const overlay = $('overlay');
const hudEl = $('hud');
const bar = $('bar');
const startBtn = $<HTMLButtonElement>('start-btn');
const pauseBtn = $<HTMLButtonElement>('pause-btn');
const soundBtn = $<HTMLButtonElement>('sound-btn');
const undoBtn = $<HTMLButtonElement>('undo-btn');
const hintBtn = $<HTMLButtonElement>('hint-btn');
const drawBtn = $<HTMLButtonElement>('draw-btn');
const newBtn = $<HTMLButtonElement>('new-btn');
const replayBtn = $<HTMLButtonElement>('replay-btn');
const undoOverBtn = $<HTMLButtonElement>('undo-over-btn');
const newDealBtn = $<HTMLButtonElement>('newdeal-btn');
const diceBtn = $<HTMLButtonElement>('dice-btn');
const dealInput = $<HTMLInputElement>('deal-input');
const toast = $('toast');
const sr = $('sr');
const sfx = new Sfx();

type Mode = 'menu' | 'playing' | 'paused' | 'over';
let mode: Mode = 'menu';
let lastResult: (Result & { best: number; isNew: boolean }) | null = null;
let lastHud: Hud = { score: 0, moves: 0, seconds: 0, deal: 1, redeals: MAX_PASSES - 1, stock: 24, left: 28, canUndo: false, canDraw: true };
let newDealArmedUntil = 0;

const t = setupI18n(translations, $<HTMLSelectElement>('language-select'), () => { renderHud(lastHud); renderOverlay(); });
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function showToast(text: string, warn = false) {
  toast.textContent = text;
  toast.classList.toggle('warn', warn);
  toast.classList.add('show');
  window.clearTimeout(Number(toast.dataset.timer));
  toast.dataset.timer = String(window.setTimeout(() => toast.classList.remove('show'), 1400));
}

function renderHud(hud: Hud) {
  lastHud = hud;
  $('score').textContent = String(hud.score);
  $('time').textContent = clock(hud.seconds);
  $('moves').textContent = String(hud.moves);
  $('stock').textContent = String(hud.stock);
  $('deal').textContent = `#${hud.deal}`;
  $('deal-tag').textContent = t('game.dealNo', { n: hud.deal });
  const pips = $('redeals');
  pips.innerHTML = Array.from({ length: MAX_PASSES - 1 }, (_, i) => `<i class="${i < hud.redeals ? 'on' : ''}"></i>`).join('');
  pips.setAttribute('aria-label', `${hud.redeals}/${MAX_PASSES - 1}`);
  undoBtn.disabled = !hud.canUndo;
  const label = hud.stock > 0 ? t('game.draw') : t('game.redeal');
  $('draw-label').textContent = label;
  drawBtn.setAttribute('aria-label', label);
  drawBtn.disabled = !hud.canDraw;
}

function renderOverlay() {
  const result = $('result');
  const lead = $('overlay-lead');
  const show = (id: string, visible: boolean) => { $(id).hidden = !visible; };
  const menu = mode === 'menu';
  show('controls', menu || mode === 'paused');
  show('deal-row', menu && !!game);
  show('values', menu);
  show('tip', menu);
  show('secondary', !menu);
  replayBtn.textContent = mode === 'paused' ? t('game.restart') : t('game.replay', { n: game?.deal ?? 1 });
  $('overlay-kicker').textContent = menu ? t('game.kicker') : t('game.dealNo', { n: game?.deal ?? 1 });
  if (mode === 'over' && lastResult) {
    const r = lastResult;
    $('overlay-title').textContent = r.won ? t('game.won') : t('game.stuck');
    lead.hidden = r.won;
    lead.textContent = t('game.stuckLead', { n: r.left });
    $('result-score').textContent = String(r.score.total);
    $('result-time').textContent = clock(r.seconds);
    $('result-moves').textContent = String(r.moves);
    $('result-best').textContent = String(r.best);
    $('new-best').hidden = !r.isNew;
    result.hidden = false;
    const breakdown = $('breakdown');
    breakdown.hidden = !r.won;
    breakdown.textContent = t('game.breakdown', { base: r.score.base, clear: r.score.clear, redeals: r.score.redeals, time: r.score.time });
    startBtn.textContent = t('game.newDeal');
    undoOverBtn.hidden = r.won;
    newDealBtn.hidden = true;
  } else if (mode === 'paused') {
    $('overlay-title').textContent = t('game.paused');
    result.hidden = true;
    $('breakdown').hidden = true;
    lead.hidden = true;
    startBtn.textContent = t('game.resume');
    undoOverBtn.hidden = true;
    newDealBtn.hidden = false;
  } else {
    $('overlay-title').textContent = t('game.title');
    result.hidden = true;
    $('breakdown').hidden = true;
    lead.hidden = false;
    lead.textContent = t('game.lead');
    startBtn.textContent = t('game.start');
  }
}

function setMode(next: Mode) {
  mode = next;
  overlay.hidden = next === 'playing';
  pauseBtn.disabled = next !== 'playing';
  bar.classList.toggle('off', next === 'menu');
  renderOverlay();
  if (!overlay.hidden) focusIfActive(startBtn);
  else (document.activeElement as HTMLElement | null)?.blur();
}

const SOUNDS: Record<GameEvent, () => void> = {
  deal: () => sfx.noise(0.05, { gain: 0.07, frequency: 5200, type: 'highpass' }),
  draw: () => { sfx.noise(0.16, { gain: 0.18, frequency: 2600, type: 'bandpass' }); sfx.tone(480, 0.09, { type: 'triangle', gain: 0.03, slideTo: 720 }); },
  select: () => sfx.tone(740, 0.07, { type: 'triangle', gain: 0.08 }),
  match: () => {
    sfx.tone(1046.5, 0.55, { type: 'sine', gain: 0.13 });
    sfx.tone(1568, 0.6, { type: 'sine', gain: 0.08, delay: 0.07 });
    sfx.tone(2093, 0.4, { type: 'triangle', gain: 0.03, delay: 0.13 });
  },
  king: () => { [784, 1174.7, 1568].forEach((f, i) => sfx.tone(f, 0.6, { type: 'sine', gain: 0.1, delay: i * 0.06 })); },
  invalid: () => { sfx.tone(150, 0.2, { type: 'square', gain: 0.06, slideTo: 105 }); sfx.tone(158, 0.18, { type: 'sawtooth', gain: 0.03 }); },
  redeal: () => { sfx.noise(0.4, { gain: 0.2, frequency: 1700, type: 'bandpass' }); sfx.tone(330, 0.3, { type: 'triangle', gain: 0.06, slideTo: 220 }); },
  undo: () => sfx.tone(620, 0.13, { type: 'sine', gain: 0.08, slideTo: 420 }),
  hint: () => { sfx.tone(1318.5, 0.14, { type: 'sine', gain: 0.06 }); sfx.tone(1760, 0.2, { type: 'sine', gain: 0.05, delay: 0.09 }); },
  row: () => { sfx.tone(880, 0.14, { type: 'triangle', gain: 0.08 }); sfx.tone(1318.5, 0.22, { type: 'triangle', gain: 0.08, delay: 0.1 }); },
  win: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) => sfx.tone(f, 0.32, { type: 'triangle', gain: 0.11, delay: i * 0.1 }));
    [523.25, 659.25, 783.99, 1046.5].forEach(f => sfx.tone(f, 1.4, { type: 'sine', gain: 0.06, delay: 0.66 }));
  },
  stuck: () => { sfx.tone(392, 0.35, { type: 'sine', gain: 0.1, slideTo: 196 }); sfx.tone(311, 0.5, { type: 'sine', gain: 0.07, delay: 0.25, slideTo: 155 }); },
};

/** Deal number from `#deal=123` / `?deal=123`, so a link can share a deal. */
function dealFromUrl(): number | null {
  const match = /[?#&]deal=(\d{1,6})/.exec(location.hash + location.search);
  const n = match ? Number(match[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}
const readDealInput = () => {
  const n = Math.floor(Number(dealInput.value));
  return Number.isFinite(n) && n >= 1 && n <= 999999 ? n : null;
};

const game = PyramidGame.create(stageEl);

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
  dealInput.disabled = true;
  diceBtn.disabled = true;
} else {
  game.onHud = renderHud;
  game.onEvent = event => SOUNDS[event]();
  game.onToast = (key, params, warn) => showToast(t(key, params), warn);
  game.onAnnounce = (key, params) => { sr.textContent = t(key, params); };
  game.onOver = result => {
    const record = best.submit(BEST_KEY, result.score.total);
    lastResult = { ...result, best: record.best, isNew: record.isNew };
    setMode('over');
  };

  const fitInsets = () => {
    const height = stageEl.clientHeight || window.innerHeight;
    const top = hudEl.getBoundingClientRect().bottom + 8;
    const bottom = height - bar.getBoundingClientRect().top + 8;
    game.setInsets(Math.max(0, top), Math.max(0, bottom));
  };
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(fitInsets);
    observer.observe(hudEl);
    observer.observe(bar);
  }
  window.addEventListener('resize', fitInsets);
  fitInsets();

  const firstDeal = dealFromUrl() ?? game.pickDeal();
  dealInput.value = String(firstDeal);
  game.preview(firstDeal);

  const play = (deal: number) => { sfx.unlock(); game.start(deal); setMode('playing'); };
  startBtn.addEventListener('click', () => {
    sfx.unlock();
    if (mode === 'paused') { game.resume(); setMode('playing'); }
    else if (mode === 'menu') play(readDealInput() ?? game.deal);
    else play(game.pickDeal());
  });
  replayBtn.addEventListener('click', () => play(game.deal));
  newDealBtn.addEventListener('click', () => play(game.pickDeal()));
  undoOverBtn.addEventListener('click', () => { sfx.unlock(); game.undo(); setMode('playing'); });
  diceBtn.addEventListener('click', () => {
    const deal = game.pickDeal();
    dealInput.value = String(deal);
    game.preview(deal);
  });
  dealInput.addEventListener('change', () => { const deal = readDealInput(); if (deal) game.preview(deal); });
  dealInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); startBtn.click(); } });

  const requestNewDeal = () => {
    // Not during the win celebration or before the stuck result: the round must end and its score count.
    if (mode !== 'playing' || game.status === 'won' || game.status === 'stuck') return;
    if (lastHud.moves > 0 && game.status === 'playing' && performance.now() > newDealArmedUntil) {
      newDealArmedUntil = performance.now() + 2500;
      showToast(t('game.newDealConfirm'));
      return;
    }
    newDealArmedUntil = 0;
    play(game.pickDeal());
  };
  const tool = (button: HTMLButtonElement, action: () => void) => {
    button.addEventListener('click', event => {
      sfx.unlock();
      action();
      // A mouse click should not leave focus on the button, or Space would press it again.
      if (event.detail > 0) button.blur();
    });
  };
  tool(undoBtn, () => game.undo());
  tool(hintBtn, () => game.hint());
  tool(drawBtn, () => game.draw());
  tool(newBtn, requestNewDeal);

  const pauseGame = () => { if (mode === 'playing' && game.status === 'playing') { game.pause(); setMode('paused'); } };
  pauseBtn.addEventListener('click', pauseGame);
  window.addEventListener('keydown', event => {
    const field = event.target instanceof HTMLElement && !!event.target.closest('input, select, textarea');
    if (field) return;
    if ((event.code === 'KeyP' || event.code === 'Escape') && mode === 'playing') pauseGame();
    else if (event.code === 'Escape' && mode === 'paused') { game.resume(); setMode('playing'); }
    else if (event.code === 'KeyN' && mode === 'playing' && !event.ctrlKey && !event.metaKey) requestNewDeal();
  });
  onFocusLost(pauseGame);
}

bindSoundButton(soundBtn, sfx);

renderHud(lastHud);
setMode('menu');
