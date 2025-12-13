/**
 * Bounty Hunter Main Entry
 * Game #286
 */
import { BountyHunterGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const highDisplay = document.getElementById('high-display')!;
const levelDisplay = document.getElementById('level-display')!;
const hpFill = document.getElementById('hp-fill')!;
const targetsDisplay = document.getElementById('targets-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const messageBox = document.getElementById('message-box')!;

let game: BountyHunterGame;

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
  game = new BountyHunterGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();
    levelDisplay.textContent = state.level.toString();
    hpFill.style.width = `${(state.hp / state.maxHp) * 100}%`;
    targetsDisplay.textContent = state.targetsLeft.toString();

    if (state.status === 'over') {
      showOverlay(i18n.t('game.over'), `${i18n.t('game.score')}: ${state.score}`, i18n.t('game.restart'));
    } else if (state.status === 'win') {
      showOverlay(i18n.t('game.win'), `${i18n.t('game.score')}: ${state.score}`, i18n.t('game.nextLevel'));
    }
  });

  game.setOnMessage((msg) => {
    messageBox.textContent = msg;
    messageBox.classList.add('show');
    setTimeout(() => messageBox.classList.remove('show'), 1000);
  });

  window.addEventListener('resize', () => game.resize());
}

function showOverlay(title: string, msg: string, btnText: string) {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    startBtn.textContent = btnText;
  }, 500);
}

function handleStart() {
  overlay.style.display = 'none';
  const state = (game as any).status;
  if (state === 'win') {
    game.nextLevel();
  } else {
    game.start();
  }
}

startBtn.addEventListener('click', handleStart);

// Mobile controls
const mobileUp = document.getElementById('mobile-up');
const mobileDown = document.getElementById('mobile-down');
const mobileLeft = document.getElementById('mobile-left');
const mobileRight = document.getElementById('mobile-right');
const mobileAttack = document.getElementById('mobile-attack');

function simulateKey(code: string, type: 'keydown' | 'keyup') {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
}

if (mobileLeft) {
  mobileLeft.addEventListener('touchstart', (e) => { e.preventDefault(); simulateKey('ArrowLeft', 'keydown'); });
  mobileLeft.addEventListener('touchend', () => simulateKey('ArrowLeft', 'keyup'));
}
if (mobileRight) {
  mobileRight.addEventListener('touchstart', (e) => { e.preventDefault(); simulateKey('ArrowRight', 'keydown'); });
  mobileRight.addEventListener('touchend', () => simulateKey('ArrowRight', 'keyup'));
}
if (mobileAttack) {
  mobileAttack.addEventListener('touchstart', (e) => { e.preventDefault(); simulateKey('Space', 'keydown'); });
  mobileAttack.addEventListener('touchend', () => simulateKey('Space', 'keyup'));
}

// Init
initI18n();
initGame();
