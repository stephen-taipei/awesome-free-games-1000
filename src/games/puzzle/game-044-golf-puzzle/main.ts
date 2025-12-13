/**
 * Golf Puzzle Main Entry
 * Game #044
 */
import { GolfPuzzleGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const strokesDisplay = document.getElementById('strokes-display')!;
const parDisplay = document.getElementById('par-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: GolfPuzzleGame;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes('zh')) i18n.setLocale('zh-TW');
  else if (browserLang.includes('ja')) i18n.setLocale('ja');
  else i18n.setLocale('en');

  languageSelect.value = i18n.getLocale();
  updateTexts();

  languageSelect.addEventListener('change', () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateTexts();
  });
}

function updateTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new GolfPuzzleGame(canvas);
  game.resize();

  // Mouse events
  canvas.addEventListener('mousedown', (e) => handleInput('down', e));
  window.addEventListener('mousemove', (e) => handleInput('move', e));
  window.addEventListener('mouseup', (e) => handleInput('up', e));

  // Touch events
  canvas.addEventListener('touchstart', (e) => handleTouch('down', e), { passive: false });
  window.addEventListener('touchmove', (e) => handleTouch('move', e), { passive: false });
  window.addEventListener('touchend', (e) => handleTouch('up', e), { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    strokesDisplay.textContent = state.strokes.toString();
    parDisplay.textContent = state.par.toString();

    // Update strokes card color
    const strokesCard = strokesDisplay.parentElement;
    if (strokesCard) {
      if (state.strokes > state.par) {
        strokesCard.classList.add('over-par');
        strokesCard.classList.remove('under-par');
      } else if (state.strokes < state.par) {
        strokesCard.classList.add('under-par');
        strokesCard.classList.remove('over-par');
      } else {
        strokesCard.classList.remove('over-par', 'under-par');
      }
    }

    if (state.status === 'won') {
      showWin(state.level, state.totalLevels, state.strokes, state.par);
    }
  });

  window.addEventListener('resize', () => game.resize());
}

function handleInput(type: 'down' | 'move' | 'up', e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

function handleTouch(type: 'down' | 'move' | 'up', e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  game.handleInput(type, x, y);
}

function showWin(level: number, totalLevels: number, strokes: number, par: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';

    let scoreText = '';
    if (strokes < par) {
      scoreText = `${par - strokes} under par!`;
    } else if (strokes === par) {
      scoreText = 'Par!';
    } else {
      scoreText = `${strokes - par} over par`;
    }

    if (level >= totalLevels) {
      overlayTitle.textContent = i18n.t('game.complete');
      overlayMsg.textContent = scoreText;
      nextBtn.style.display = 'none';
    } else {
      overlayTitle.textContent = i18n.t('game.win');
      overlayMsg.textContent = `${i18n.t('game.strokes')}: ${strokes} (${scoreText})`;
      nextBtn.style.display = 'inline-block';
    }

    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
  }, 500);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.start();
});

resetBtn.addEventListener('click', () => {
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.nextLevel();
});

// Init
initI18n();
initGame();
