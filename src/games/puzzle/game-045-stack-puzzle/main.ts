/**
 * Stack Puzzle Main Entry
 * Game #045
 */
import { StackPuzzleGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const levelDisplay = document.getElementById('level-display')!;
const blocksDisplay = document.getElementById('blocks-display')!;
const heightDisplay = document.getElementById('height-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;
const nextBtn = document.getElementById('next-btn')!;

let game: StackPuzzleGame;

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
  game = new StackPuzzleGame(canvas);
  game.resize();

  // Click/tap to drop
  canvas.addEventListener('click', () => {
    game.dropBlock();
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    game.dropBlock();
  }, { passive: false });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      game.dropBlock();
    }
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    blocksDisplay.textContent = `${state.blocksUsed}/${state.blocksAvailable}`;
    heightDisplay.textContent = `${state.currentHeight}/${state.targetHeight}`;

    // Update height card color
    const heightCard = heightDisplay.parentElement;
    if (heightCard) {
      if (state.currentHeight >= state.targetHeight) {
        heightCard.classList.add('success');
        heightCard.classList.remove('progress');
      } else if (state.currentHeight > 0) {
        heightCard.classList.add('progress');
        heightCard.classList.remove('success');
      } else {
        heightCard.classList.remove('success', 'progress');
      }
    }

    if (state.status === 'won') {
      showWin(state.level, state.totalLevels);
    } else if (state.status === 'lost') {
      showLose();
    }
  });

  window.addEventListener('resize', () => game.resize());
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

function showLose() {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.lose');
    overlayMsg.textContent = i18n.t('game.desc');
    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
    nextBtn.style.display = 'none';
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
