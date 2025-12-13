/**
 * Whac-A-Mole Main Entry
 * Game #161
 */
import { WhacAMoleGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const livesDisplay = document.getElementById('lives-display')!;
const levelDisplay = document.getElementById('level-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;

let game: WhacAMoleGame;

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
  game = new WhacAMoleGame(canvas);
  game.resize();

  const handlePointer = (e: MouseEvent | TouchEvent, type: 'down' | 'move' | 'up') => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX || e.changedTouches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY || e.changedTouches[0]?.clientY : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    game.handleInput(type, x, y);
  };

  canvas.addEventListener('mousedown', (e) => handlePointer(e, 'down'));
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handlePointer(e, 'down'); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
      game.handleKey(e.key, true);
    }
  });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    livesDisplay.textContent = state.lives.toString();
    levelDisplay.textContent = state.level.toString();

    if (state.status === 'lost') {
      showGameOver(state.score);
    } else if (state.status === 'won') {
      showVictory(state.score);
    }
  });

  window.addEventListener('resize', () => game.resize());
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.gameOver');
    overlayMsg.textContent = `${i18n.t('game.finalScore')}: ${score}`;
    startBtn.style.display = 'inline-block';
    startBtn.textContent = i18n.t('game.reset');
  }, 500);
}

function showVictory(score: number) {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.victory');
    overlayMsg.textContent = `${i18n.t('game.finalScore')}: ${score}`;
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

initI18n();
initGame();
