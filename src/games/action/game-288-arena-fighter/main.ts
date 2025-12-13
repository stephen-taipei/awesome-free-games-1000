/**
 * Arena Fighter Main Entry
 * Game #288
 */
import { ArenaFighterGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const highDisplay = document.getElementById('high-display')!;
const waveDisplay = document.getElementById('wave-display')!;
const hpFill = document.getElementById('hp-fill')!;
const comboDisplay = document.getElementById('combo-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;

let game: ArenaFighterGame;

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
  game = new ArenaFighterGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();
    waveDisplay.textContent = state.wave.toString();
    hpFill.style.width = `${(state.hp / state.maxHp) * 100}%`;
    comboDisplay.textContent = state.combo > 0 ? `x${state.combo}` : '';

    if (state.status === 'over') {
      showOverlay(i18n.t('game.over'), `${i18n.t('game.score')}: ${state.score}`, i18n.t('game.restart'));
    } else if (state.status === 'cleared') {
      showOverlay(i18n.t('game.victory'), `${i18n.t('game.wave')} ${state.wave} Clear!`, i18n.t('game.nextWave'));
    }
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
    game.nextWave();
  } else {
    game.start();
  }
}

startBtn.addEventListener('click', handleStart);

// Mobile controls
const mobileLeft = document.getElementById('mobile-left');
const mobileRight = document.getElementById('mobile-right');
const mobileAttack = document.getElementById('mobile-attack');
const mobileJump = document.getElementById('mobile-jump');

if (mobileLeft) {
  mobileLeft.addEventListener('touchstart', (e) => { e.preventDefault(); game.handleMobileControl('left'); });
  mobileLeft.addEventListener('touchend', () => game.releaseMobileControl('left'));
}
if (mobileRight) {
  mobileRight.addEventListener('touchstart', (e) => { e.preventDefault(); game.handleMobileControl('right'); });
  mobileRight.addEventListener('touchend', () => game.releaseMobileControl('right'));
}
if (mobileAttack) {
  mobileAttack.addEventListener('touchstart', (e) => { e.preventDefault(); game.handleMobileControl('attack'); });
}
if (mobileJump) {
  mobileJump.addEventListener('touchstart', (e) => { e.preventDefault(); game.handleMobileControl('jump'); });
}

// Init
initI18n();
initGame();
