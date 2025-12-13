import { KingOfFightersGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;

const p1HpFill = document.getElementById('p1-hp-fill')!;
const p2HpFill = document.getElementById('p2-hp-fill')!;
const p1SpecialFill = document.getElementById('p1-special-fill')!;
const p2SpecialFill = document.getElementById('p2-special-fill')!;
const p1WinsDisplay = document.getElementById('p1-wins')!;
const p2WinsDisplay = document.getElementById('p2-wins')!;
const roundDisplay = document.getElementById('round-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;

let game: KingOfFightersGame;
let lastStatus = 'idle';

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
  game = new KingOfFightersGame(canvas);
  game.resize();
  game.setOnStateChange((state) => {
    p1HpFill.style.width = `${(state.p1Hp / state.p1MaxHp) * 100}%`;
    p2HpFill.style.width = `${(state.p2Hp / state.p2MaxHp) * 100}%`;
    p1SpecialFill.style.width = `${(state.p1Special / 100) * 100}%`;
    p2SpecialFill.style.width = `${(state.p2Special / 100) * 100}%`;
    p1WinsDisplay.textContent = state.p1Wins.toString();
    p2WinsDisplay.textContent = state.p2Wins.toString();
    roundDisplay.textContent = state.round.toString();

    if (state.status === 'gameEnd' && lastStatus !== 'gameEnd') {
      const title = state.winner === 'p1' ? i18n.t('game.win') : i18n.t('game.lose');
      showOverlay(title, `${i18n.t('game.round')}: ${state.round}`, i18n.t('game.restart'));
    } else if (state.status === 'roundEnd' && lastStatus !== 'roundEnd' && state.p1Wins < 2 && state.p2Wins < 2) {
      setTimeout(() => {
        game.nextRound();
      }, 2000);
    }
    lastStatus = state.status;
  });
  window.addEventListener('resize', () => game.resize());
}

function showOverlay(title: string, msg: string, btn: string) {
  setTimeout(() => { overlay.style.display = 'flex'; overlayTitle.textContent = title; overlayMsg.textContent = msg; startBtn.textContent = btn; }, 500);
}

startBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  lastStatus = 'idle';
  game.start();
});

['left', 'right', 'jump', 'crouch', 'punch', 'kick', 'special', 'block'].forEach(action => {
  const el = document.getElementById(`mobile-${action}`);
  if (el) {
    el.addEventListener('touchstart', (e) => { e.preventDefault(); game.handleMobile(action, true); });
    el.addEventListener('touchend', () => game.handleMobile(action, false));
  }
});

initI18n();
initGame();
