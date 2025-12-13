/**
 * Dungeon Crawl Main Entry
 * Game #287
 */
import { DungeonCrawlGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const goldDisplay = document.getElementById('gold-display')!;
const highDisplay = document.getElementById('high-display')!;
const floorDisplay = document.getElementById('floor-display')!;
const hpFill = document.getElementById('hp-fill')!;
const atkDisplay = document.getElementById('atk-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const messageBox = document.getElementById('message-box')!;

let game: DungeonCrawlGame;

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
  game = new DungeonCrawlGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    goldDisplay.textContent = state.gold.toString();
    highDisplay.textContent = state.highScore.toString();
    floorDisplay.textContent = state.floor.toString();
    hpFill.style.width = `${(state.hp / state.maxHp) * 100}%`;
    atkDisplay.textContent = state.atk.toString();

    if (state.status === 'over') {
      showOverlay(i18n.t('game.over'), `${i18n.t('game.score')}: ${state.gold}`, i18n.t('game.restart'));
    } else if (state.status === 'cleared') {
      showOverlay(`${i18n.t('game.floor')} ${state.floor} Clear!`, `${i18n.t('game.score')}: ${state.gold}`, i18n.t('game.nextFloor'));
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
  if (state === 'cleared') {
    game.nextFloor();
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

if (mobileUp) mobileUp.addEventListener('click', () => game.handleMove(0, -1));
if (mobileDown) mobileDown.addEventListener('click', () => game.handleMove(0, 1));
if (mobileLeft) mobileLeft.addEventListener('click', () => game.handleMove(-1, 0));
if (mobileRight) mobileRight.addEventListener('click', () => game.handleMove(1, 0));

// Init
initI18n();
initGame();
