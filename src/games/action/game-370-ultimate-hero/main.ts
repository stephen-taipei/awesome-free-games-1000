import { UltimateHeroGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const highDisplay = document.getElementById('high-display')!;
const formDisplay = document.getElementById('form-display')!;
const hpFill = document.getElementById('hp-fill')!;
const powerFill = document.getElementById('power-fill')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;

let game: UltimateHeroGame;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => { i18n.loadTranslations(locale as Locale, trans); });
  const lang = navigator.language;
  if (lang.includes('zh')) i18n.setLocale('zh-TW');
  else if (lang.includes('ja')) i18n.setLocale('ja');
  else i18n.setLocale('en');
  languageSelect.value = i18n.getLocale();
  updateTexts();
  languageSelect.addEventListener('change', () => { i18n.setLocale(languageSelect.value as Locale); updateTexts(); });
}

function updateTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new UltimateHeroGame(canvas);
  game.resize();
  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();
    formDisplay.textContent = state.form.toUpperCase();
    formDisplay.className = `stat-value form-${state.form}`;
    hpFill.style.width = `${(state.hp / state.maxHp) * 100}%`;
    powerFill.style.width = `${(state.power / state.maxPower) * 100}%`;
    if (state.status === 'over') showOverlay(i18n.t('game.over'), `${i18n.t('game.score')}: ${state.score}`, i18n.t('game.restart'));
    else if (state.status === 'victory') showOverlay(i18n.t('game.victory'), `${i18n.t('game.score')}: ${state.score}`, i18n.t('game.restart'));
  });
  window.addEventListener('resize', () => game.resize());
}

function showOverlay(title: string, msg: string, btn: string) {
  setTimeout(() => { overlay.style.display = 'flex'; overlayTitle.textContent = title; overlayMsg.textContent = msg; startBtn.textContent = btn; }, 500);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  game.start();
});

['left', 'right', 'jump', 'attack', 'transform', 'ultimate'].forEach(action => {
  const el = document.getElementById(`mobile-${action}`);
  if (el) {
    el.addEventListener('touchstart', (e) => { e.preventDefault(); game.handleMobile(action, true); });
    el.addEventListener('touchend', () => game.handleMobile(action, false));
  }
});

initI18n();
initGame();
