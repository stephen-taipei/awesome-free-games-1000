import { Sfx, best, setupI18n, focusIfActive, onFocusLost, bindSoundButton, prefersReducedMotion, prefersTouch } from '../../../shared/three/kit';
import { GaleCutter, type Hud, type GameEvent, type EventDetail, type PopupTone, type EdgeMark } from './game';
import { MAX_HEARTS, MAX_CHARGES, CAMPAIGN_WAVES, type Kind } from './logic';
import { translations } from './i18n';

const BEST_KEY = 'afg-gale-cutter-best';
const BEST_COMBO_KEY = 'afg-gale-cutter-best-combo';
/** Short landscape screens put the stats in a column on the left and the buttons on the right. */
const COLUMN_QUERY = '(max-height: 500px) and (orientation: landscape)';
/** A click this soon after the results appear is the tail of the last dash, not a request to play again. */
const RESULT_GUARD_MS = 600;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const root = document.documentElement;
const stageEl = $('stage');
const overlay = $('overlay');
const startBtn = $<HTMLButtonElement>('start-btn');
const pauseBtn = $<HTMLButtonElement>('pause-btn');
const soundBtn = $<HTMLButtonElement>('sound-btn');
const languageSelect = $<HTMLSelectElement>('language-select');
const toast = $('toast');
const hint = $('hint');
const popups = $('popups');
const vignette = $('vignette');
const hurtEl = $('hurt');
const statsEl = $('stats');
const actionsEl = $('actions');
const marksEl = $('marks');
const focusMeter = $('focus-meter');
const sfx = new Sfx();
const reducedMotion = prefersReducedMotion();
let mode: 'menu' | 'playing' | 'paused' | 'over' = 'menu';
let overAt = 0;
let lastResult: {
  score: number; wave: number; kills: number; maxCombo: number;
  best: number; isNew: boolean; bestCombo: number; isNewCombo: boolean;
} | null = null;
const timers: number[] = [];
/** Messages whose moment came while the game was paused: they show after the player resumes. */
const deferred: Array<() => void> = [];
const throttle = new Map<string, number>();

const t = setupI18n(translations, languageSelect, () => { renderOverlay(); renderHud(lastHud, true); });

// ------------------------------------------------------------------ messages

function showToast(text: string, tone: '' | 'warn' | 'big' | 'gold' = '', ms = 1300) {
  toast.textContent = text;
  toast.classList.toggle('warn', tone === 'warn');
  toast.classList.toggle('big', tone === 'big');
  toast.classList.toggle('gold', tone === 'gold');
  toast.classList.add('show');
  window.clearTimeout(Number(toast.dataset.timer));
  toast.dataset.timer = String(window.setTimeout(() => toast.classList.remove('show'), ms));
}

function showHint(text: string, ms = 3200) {
  hint.textContent = text;
  hint.classList.add('show');
  window.clearTimeout(Number(hint.dataset.timer));
  hint.dataset.timer = String(window.setTimeout(() => hint.classList.remove('show'), ms));
}

/** Runs `fn` later, unless the run ends or is restarted first. If the game is paused by then, it waits for resume. */
function later(ms: number, fn: () => void) {
  timers.push(window.setTimeout(() => {
    if (mode === 'playing') fn();
    else if (mode === 'paused') deferred.push(fn);
  }, ms));
}

/** After a resume, the messages held back by the pause, one at a time. */
function flushDeferred() {
  deferred.splice(0).forEach((fn, i) => later(700 + i * 4600, fn));
}

function clearMessages() {
  deferred.length = 0;
  while (timers.length) window.clearTimeout(timers.pop());
  toast.classList.remove('show');
  hint.classList.remove('show');
  popups.textContent = '';
}

/** True at most once per `ms` for a key: repeated warnings stay quiet. */
function every(key: string, ms: number): boolean {
  const now = performance.now();
  if (now - (throttle.get(key) ?? -1e9) < ms) return false;
  throttle.set(key, now);
  return true;
}

function popup(text: string, x: number, y: number, tone: PopupTone) {
  if (mode !== 'playing') return;
  if (popups.childElementCount > 24) popups.firstElementChild?.remove();
  const el = document.createElement('span');
  el.className = `pop ${tone}`;
  el.textContent = text;
  el.style.left = `${x.toFixed(1)}px`;
  el.style.top = `${y.toFixed(1)}px`;
  popups.append(el);
  window.setTimeout(() => el.remove(), reducedMotion ? 700 : 1000);
}

function hurtFlash() {
  hurtEl.classList.remove('hit');
  void hurtEl.offsetWidth; // restart the CSS animation
  hurtEl.classList.add('hit');
}

// ------------------------------------------------------------------ HUD and overlay

const EMPTY_HUD: Hud = { score: 0, wave: 1, endless: false, hearts: MAX_HEARTS, charges: MAX_CHARGES, chargeProgress: 0, combo: 1, comboLeft: 0, focus: 1, slow: 0 };
let lastHud: Hud = EMPTY_HUD;
const shown = { hearts: -1, charges: -1, progress: -1, wave: '', combo: -1 };

function renderHud(hud: Hud, force = false) {
  lastHud = hud;
  $('score').textContent = String(hud.score);
  const combo = $('combo');
  if (force || hud.combo !== shown.combo) {
    shown.combo = hud.combo;
    combo.hidden = hud.combo <= 1;
    combo.textContent = `×${hud.combo}`;
    combo.classList.toggle('hot', hud.combo >= 5);
  }
  $('combo-bar').style.transform = `scaleX(${hud.comboLeft.toFixed(3)})`;
  // The chip keeps the endless count short, so the HUD fits narrow phones at any score.
  const wave = hud.endless ? t('game.endlessShort', { n: hud.wave - CAMPAIGN_WAVES }) : `${hud.wave}/${CAMPAIGN_WAVES}`;
  if (force || wave !== shown.wave) { shown.wave = wave; $('wave').textContent = wave; }
  if (force || hud.hearts !== shown.hearts) {
    shown.hearts = hud.hearts;
    const hearts = $('hearts');
    hearts.innerHTML = Array.from({ length: MAX_HEARTS }, (_, i) => `<i class="${i < hud.hearts ? 'on' : ''}"></i>`).join('');
    hearts.setAttribute('aria-label', `${hud.hearts}/${MAX_HEARTS}`);
    hearts.classList.toggle('low', hud.hearts === 1);
  }
  const progress = Math.round(hud.chargeProgress * 10) / 10;
  if (force || hud.charges !== shown.charges || progress !== shown.progress) {
    shown.charges = hud.charges;
    shown.progress = progress;
    const charges = $('charges');
    charges.innerHTML = Array.from({ length: MAX_CHARGES }, (_, i) => {
      if (i < hud.charges) return '<i class="on"></i>';
      if (i === hud.charges) return `<i style="--p:${progress}"></i>`;
      return '<i></i>';
    }).join('');
    charges.setAttribute('aria-label', `${hud.charges}/${MAX_CHARGES}`);
  }
  const focus = Math.max(0, Math.min(1, hud.focus));
  $('focus-bar').style.transform = `scaleX(${focus.toFixed(3)})`;
  const focusNow = String(Math.round(focus * 10) * 10);
  if (focusMeter.getAttribute('aria-valuenow') !== focusNow) focusMeter.setAttribute('aria-valuenow', focusNow);
  vignette.style.opacity = (mode === 'playing' ? hud.slow : 0).toFixed(2);
}

function renderOverlay() {
  const result = $('result');
  const playedBefore = mode === 'over' && lastResult;
  $('controls').hidden = !!playedBefore || mode === 'paused';
  $('overlay-note').hidden = mode !== 'menu';
  if (mode === 'over' && lastResult) {
    $('overlay-title').textContent = t('game.over');
    $('result-score').textContent = String(lastResult.score);
    $('result-wave').textContent = lastResult.wave > CAMPAIGN_WAVES ? t('game.endlessWave', { n: lastResult.wave - CAMPAIGN_WAVES }) : String(lastResult.wave);
    $('result-kills').textContent = String(lastResult.kills);
    $('result-combo').textContent = `×${lastResult.maxCombo}`;
    $('result-best').textContent = String(lastResult.best);
    $('result-best-combo').textContent = `×${Math.max(1, lastResult.bestCombo)}`;
    $('new-best').hidden = !lastResult.isNew;
    $('new-best-combo').hidden = !lastResult.isNewCombo;
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

/** Edge markers: a pool of arrows at the screen edge, pointing at foes the follow camera leaves out of view. */
const markEls: HTMLElement[] = [];
function renderMarks(marks: readonly EdgeMark[], count: number) {
  for (let i = 0; i < Math.max(count, markEls.length); i++) {
    let el = markEls[i];
    if (i >= count) { if (el) el.hidden = true; continue; }
    if (!el) { el = document.createElement('i'); marksEl.append(el); markEls.push(el); }
    const mark = marks[i];
    el.hidden = mode !== 'playing';
    el.className = `mark ${mark.tone}`;
    el.style.transform = `translate(${mark.x.toFixed(1)}px, ${mark.y.toFixed(1)}px) rotate(${mark.angle.toFixed(3)}rad)`;
  }
}

function setMode(next: typeof mode, focusStart = true) {
  mode = next;
  overlay.hidden = next === 'playing';
  pauseBtn.disabled = next !== 'playing';
  document.body.classList.toggle('is-playing', next === 'playing');
  marksEl.hidden = next !== 'playing';
  if (next !== 'playing') vignette.style.opacity = '0';
  renderOverlay();
  if (overlay.hidden) (document.activeElement as HTMLElement | null)?.blur();
  else if (focusStart) focusIfActive(startBtn);
}

// ------------------------------------------------------------------ sound

const PITCH: Record<Kind, number> = { grunt: 1, archer: 1.12, shield: 0.8, bomber: 0.9 };

function playSound(event: GameEvent, detail: EventDetail = {}) {
  switch (event) {
    case 'aim':
      // Time drops away: a falling hum under a soft hiss.
      sfx.tone(320, 0.4, { type: 'sine', slideTo: 90, gain: 0.09 });
      sfx.noise(0.25, { gain: 0.04, frequency: 4200, type: 'highpass' });
      break;
    case 'dash':
      sfx.noise(0.22, { gain: 0.32, frequency: 2400, type: 'highpass' });
      sfx.tone(980, 0.16, { type: 'sawtooth', slideTo: 240, gain: 0.05 });
      break;
    case 'cut': {
      const k = (detail.kind ? PITCH[detail.kind] : 1) * (1 + (detail.order ?? 0) * 0.16);
      sfx.tone(1250 * k, 0.09, { type: 'triangle', slideTo: 620 * k, gain: 0.12, delay: (detail.order ?? 0) * 0.035 });
      sfx.noise(0.12, { gain: 0.14, frequency: 3800, type: 'bandpass' });
      break;
    }
    case 'multi': {
      const n = Math.min(5, detail.kills ?? 2);
      [523, 659, 784, 1047, 1319].slice(0, n).forEach((f, i) => sfx.tone(f, 0.28, { type: 'triangle', gain: 0.07, delay: 0.1 + i * 0.06 }));
      break;
    }
    case 'deflect':
      sfx.tone(2100, 0.07, { type: 'square', gain: 0.04 });
      sfx.tone(2800, 0.1, { type: 'triangle', gain: 0.05, delay: 0.03 });
      break;
    case 'clang':
      sfx.tone(240, 0.3, { type: 'square', slideTo: 200, gain: 0.08 });
      sfx.tone(362, 0.35, { type: 'triangle', gain: 0.08 });
      sfx.noise(0.15, { gain: 0.2, frequency: 3200, type: 'bandpass' });
      break;
    case 'explode':
      sfx.noise(0.7, { gain: detail.harmful ? 0.55 : 0.42, frequency: 520 });
      sfx.tone(95, 0.55, { type: 'sine', slideTo: 38, gain: 0.3, delay: (detail.depth ?? 0) * 0.02 });
      break;
    case 'windup':
      if (detail.kind === 'archer') sfx.tone(480, 0.5, { type: 'triangle', slideTo: 700, gain: 0.025 });
      else if (detail.kind === 'bomber') sfx.noise(0.9, { gain: 0.05, frequency: 5200, type: 'highpass' });
      else sfx.tone(150, 0.35, { type: 'sawtooth', slideTo: 230, gain: 0.03 });
      break;
    case 'strike':
      sfx.noise(0.14, { gain: 0.1, frequency: 1300 });
      break;
    case 'shoot':
      sfx.noise(0.08, { gain: 0.08, frequency: 3000, type: 'highpass' });
      sfx.tone(900, 0.1, { type: 'triangle', slideTo: 520, gain: 0.03 });
      break;
    case 'spawn':
      sfx.tone(260, 0.35, { type: 'sine', slideTo: 520, gain: 0.025 });
      break;
    case 'land':
      sfx.tone(130, 0.16, { type: 'sine', slideTo: 70, gain: 0.12 });
      sfx.noise(0.14, { gain: 0.1, frequency: 420 });
      break;
    case 'hurt':
      sfx.tone(220, 0.38, { type: 'square', slideTo: 80, gain: 0.12 });
      sfx.noise(0.3, { gain: 0.28, frequency: 900 });
      break;
    case 'charge':
      sfx.tone(880, 0.07, { type: 'triangle', gain: 0.05 });
      sfx.tone(1320, 0.1, { type: 'triangle', gain: 0.05, delay: 0.06 });
      break;
    case 'focusOut':
      // Time comes back up to speed: a soft rising sigh.
      sfx.tone(140, 0.45, { type: 'sine', slideTo: 330, gain: 0.08 });
      sfx.noise(0.3, { gain: 0.035, frequency: 2600, type: 'highpass' });
      break;
    case 'denied':
      sfx.tone(140, 0.16, { type: 'square', gain: 0.07 });
      break;
    case 'cancel':
    case 'edge':
      sfx.tone(300, 0.12, { type: 'sine', slideTo: 190, gain: 0.05 });
      break;
    case 'wave':
      sfx.tone(196, 0.9, { type: 'sawtooth', gain: 0.035 });
      sfx.tone(294, 0.9, { type: 'triangle', gain: 0.06, delay: 0.18 });
      sfx.tone(392, 1.1, { type: 'triangle', gain: 0.05, delay: 0.36 });
      break;
    case 'fight':
      sfx.noise(0.2, { gain: 0.3, frequency: 180 });
      sfx.tone(110, 0.2, { type: 'sine', slideTo: 60, gain: 0.2 });
      break;
    case 'clear':
      [523, 659, 784, 1047].forEach((f, i) => sfx.tone(f, 0.45, { type: 'triangle', gain: 0.07, delay: i * 0.1 }));
      break;
    case 'travel':
      sfx.noise(2.6, { gain: 0.16, frequency: 700, type: 'bandpass' });
      sfx.tone(220, 2.4, { type: 'sine', slideTo: 440, gain: 0.05 });
      break;
    case 'combo':
      sfx.tone(440 * Math.pow(2, Math.min(12, detail.combo ?? 2) / 12), 0.22, { type: 'square', gain: 0.03, delay: 0.12 });
      break;
    case 'comboDrop':
      sfx.tone(520, 0.3, { type: 'triangle', slideTo: 260, gain: 0.04 });
      break;
    case 'dead':
      sfx.tone(300, 1.4, { type: 'sawtooth', slideTo: 55, gain: 0.1 });
      sfx.noise(1.2, { gain: 0.2, frequency: 600 });
      break;
  }
}

// ------------------------------------------------------------------ messages from the game

const INTRO: Record<Kind, string> = { grunt: 'game.introGrunt', archer: 'game.introArcher', shield: 'game.introShield', bomber: 'game.introBomber' };

function onGameEvent(event: GameEvent, detail: EventDetail = {}) {
  if (mode !== 'playing') return;
  playSound(event, detail);
  switch (event) {
    case 'wave': {
      const wave = detail.wave ?? 1;
      const newIsland = wave === 1 || (!detail.endless && (wave - 1) % 4 === 0) || (detail.endless && (wave - CAMPAIGN_WAVES - 1) % 3 === 0);
      const label = detail.endless ? t('game.endlessToast', { n: wave - CAMPAIGN_WAVES }) : t('game.waveToast', { n: wave });
      showToast(newIsland ? `${label} · ${t(`game.island${detail.arena ?? 0}`)}` : label, 'big', 1700);
      if (detail.intro) {
        const key = INTRO[detail.intro];
        later(wave === 1 ? 6600 : 1500, () => showHint(t(key), 4200));
      }
      break;
    }
    case 'fight':
      if (detail.wave === 1) showHint(t(prefersTouch() ? 'game.hintTouch' : 'game.hintMouse'), 4800);
      break;
    case 'clear': {
      let text = t('game.clearToast', { bonus: detail.bonus ?? 0 });
      if (detail.flawless) text += ` · ${t('game.flawless')}`;
      if (detail.healed) text += ` · ${t('game.healed')}`;
      showToast(text, 'gold', 2000);
      if (detail.campaign) later(2100, () => showToast(t('game.campaignDone'), 'big', 2600));
      break;
    }
    case 'multi': {
      const n = detail.kills ?? 2;
      showToast(n === 2 ? t('game.double') : n === 3 ? t('game.triple') : t('game.gale', { n }), 'gold', 900);
      break;
    }
    case 'clang':
      if (detail.first || every('clang', 8000)) showHint(t('game.blocked'), 2600);
      break;
    case 'denied':
      if (every('denied', 1200)) showToast(t('game.noCharge'), 'warn', 900);
      break;
    case 'focusOut':
      if (every('focusOut', 60000)) showHint(t('game.focusOut'), 4200);
      break;
    case 'edge':
      if (every('edge', 1500)) showToast(t('game.edge'), 'warn', 1000);
      break;
    case 'hurt':
      hurtFlash();
      if (detail.hearts === 1) showToast(t('game.lastHeart'), 'warn', 1400);
      break;
  }
}

// ------------------------------------------------------------------ wiring

const game = GaleCutter.create(stageEl);

// The menu starts below the HUD, and the island is framed inside the part of the screen the HUD and the
// site navigation leave free.
const column = matchMedia(COLUMN_QUERY);
function fitInsets() {
  const width = stageEl.clientWidth || window.innerWidth;
  const height = stageEl.clientHeight || window.innerHeight;
  const stats = statsEl.getBoundingClientRect();
  const actions = actionsEl.getBoundingClientRect();
  const navEl = document.querySelector('afg-navigation');
  const nav = navEl ? navEl.getBoundingClientRect() : null;
  const hasNav = !!nav && nav.width > 0 && nav.height > 0;
  root.style.setProperty('--hud-bottom', `${Math.round(Math.max(stats.bottom, actions.bottom))}px`);
  // Room the menu leaves at the bottom for the site navigation bar.
  root.style.setProperty('--nav-clear', `${hasNav ? Math.max(10, Math.round(height - nav!.top + 8)) : 10}px`);
  if (!game) return;
  game.setInsets(column.matches ? {
    top: 10,
    bottom: 10,
    left: stats.right + 10,
    right: width - Math.min(actions.left, hasNav ? nav!.left : width) + 10,
  } : {
    top: Math.max(stats.bottom, actions.bottom) + 10,
    bottom: hasNav ? height - nav!.top + 6 : 16,
    left: 10,
    right: 10,
  });
}
if (typeof ResizeObserver !== 'undefined') {
  const observer = new ResizeObserver(fitInsets);
  observer.observe(statsEl);
  observer.observe(actionsEl);
  // The site navigation is added by the shell script after this one runs.
  const watchNav = (tries: number) => {
    const nav = document.querySelector('afg-navigation');
    if (nav) { observer.observe(nav); fitInsets(); } else if (tries > 0) window.setTimeout(() => watchNav(tries - 1), 200);
  };
  watchNav(50);
}
window.addEventListener('resize', fitInsets);

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
  game.onHud = hud => renderHud(hud);
  game.onPopup = popup;
  game.onMarks = renderMarks;
  game.onEvent = onGameEvent;
  game.onOver = result => {
    const record = best.submit(BEST_KEY, result.score);
    const comboRecord = best.submit(BEST_COMBO_KEY, result.maxCombo > 1 ? result.maxCombo : 0);
    lastResult = {
      score: result.score, wave: result.wave, kills: result.kills, maxCombo: result.maxCombo,
      best: record.best, isNew: record.isNew,
      bestCombo: comboRecord.best, isNewCombo: comboRecord.isNew,
    };
    clearMessages();
    overAt = performance.now();
    setMode('over');
  };

  startBtn.addEventListener('click', () => {
    if (mode === 'over' && performance.now() - overAt < RESULT_GUARD_MS) return;
    sfx.unlock();
    if (mode === 'paused') {
      game.resume();
      setMode('playing');
      flushDeferred();
    } else {
      // Playing first, so the first wave's announcement from start() is shown.
      clearMessages();
      setMode('playing');
      game.start();
    }
  });
  // Mode stays 'playing' through the fall at the end of a run; there is nothing to pause until the results.
  const pause = (focusResume = true) => { if (mode === 'playing' && game.status === 'running') { game.pause(); setMode('paused', focusResume); } };
  pauseBtn.addEventListener('click', () => pause());
  window.addEventListener('keydown', event => {
    if ((event.code === 'KeyP' || event.code === 'Escape') && mode === 'playing') pause();
    // Escape in an open language picker only closes the picker.
    else if (event.code === 'Escape' && mode === 'paused' && !(event.target instanceof HTMLSelectElement)) { game.resume(); setMode('playing'); flushDeferred(); }
  });
  onFocusLost(() => pause());
  // Keys ignores every key while the language select has focus, so a held aim would never be released.
  // Pause instead, and leave focus on the select so its picker stays open.
  languageSelect.addEventListener('focus', () => pause(false));

  // A low wind over the islands while a run is on.
  let windTimer = 0;
  window.setInterval(() => {
    if (mode !== 'playing' || game.status !== 'running') return;
    windTimer -= 1;
    if (windTimer > 0) return;
    windTimer = 3 + Math.floor(Math.random() * 3);
    sfx.noise(3.4, { gain: 0.035, frequency: 520, type: 'bandpass' });
  }, 1000);
}

bindSoundButton(soundBtn, sfx);

renderHud(EMPTY_HUD, true);
fitInsets();
setMode('menu');
