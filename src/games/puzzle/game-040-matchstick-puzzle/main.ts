/**
 * Matchstick Puzzle Main Entry
 * Game #040
 */
import { MatchstickGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const movesDisplay = document.getElementById('moves-display')!;
const hintDisplay = document.getElementById('hint-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;
const hintBtn = document.getElementById('hint-btn')!;

let game: MatchstickGame;

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
  game = new MatchstickGame(canvas);
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
    movesDisplay.textContent = state.movesRemaining.toString();

    // Update moves card color
    const movesCard = movesDisplay.parentElement;
    if (movesCard) {
      movesCard.classList.toggle('warning', state.movesRemaining === 0);
    }

    if (state.status === 'won') {
      showWin(state.level, state.totalLevels);
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

function showWin(level: number, totalLevels: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';

    if (level >= totalLevels) {
      overlayTitle.textContent = i18n.t('game.complete');
      overlayMsg.textContent = '';
      nextBtn.style.display = 'none';
    } else {
      overlayTitle.textContent = i18n.t('game.win');
      overlayMsg.textContent = `${i18n.t('game.level')} ${level}`;
      nextBtn.style.display = 'inline-block';
    }

    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
  }, 500);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  hintDisplay.textContent = '';
  game.start();
});

resetBtn.addEventListener('click', () => {
  hintDisplay.textContent = '';
  game.reset();
});

nextBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  hintDisplay.textContent = '';
  game.nextLevel();
});

hintBtn.addEventListener('click', () => {
  const hint = game.getHint();
  hintDisplay.textContent = hint;
});

// Init
initI18n();
initGame();
