/**
 * The Liberator Main Entry
 * Game #354
 */
import { LiberatorGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const rescuedDisplay = document.getElementById('rescued-display')!;
const levelDisplay = document.getElementById('level-display')!;
const healthFill = document.getElementById('health-fill') as HTMLDivElement;
const hopeFill = document.getElementById('hope-fill') as HTMLDivElement;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const resetBtn = document.getElementById('reset-btn')!;

const ability1Btn = document.getElementById('ability-1-btn')!;
const ability2Btn = document.getElementById('ability-2-btn')!;
const ability3Btn = document.getElementById('ability-3-btn')!;

let game: LiberatorGame;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes('zh-TW') || browserLang.includes('zh-HK')) {
    i18n.setLocale('zh-TW');
  } else if (browserLang.includes('zh')) {
    i18n.setLocale('zh-CN');
  } else if (browserLang.includes('ja')) {
    i18n.setLocale('ja');
  } else if (browserLang.includes('ko')) {
    i18n.setLocale('ko');
  } else {
    i18n.setLocale('en');
  }

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
  game = new LiberatorGame(canvas);
  game.resize();

  // Mouse tracking for abilities
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.handleMouse(x, y);
  });

  // Touch tracking
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    game.handleMouse(x, y);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', '1', '2', '3'].includes(e.key)) {
      e.preventDefault();
      game.handleKey(e.key, true);
    }
  });

  window.addEventListener('keyup', (e) => {
    game.handleKey(e.key, false);
  });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    rescuedDisplay.textContent = state.rescued.toString();
    levelDisplay.textContent = state.level.toString();

    // Update health bar
    const healthPercent = (state.health / state.maxHealth) * 100;
    healthFill.style.width = `${healthPercent}%`;
    healthFill.style.background = healthPercent > 50 ? '#4ade80' : healthPercent > 25 ? '#facc15' : '#ef4444';

    // Update hope bar
    const hopePercent = (state.hopeEnergy / state.maxHopeEnergy) * 100;
    hopeFill.style.width = `${hopePercent}%`;

    // Update ability buttons
    updateAbilityButton(ability1Btn, state.abilityCooldowns['break-chains'], 30);
    updateAbilityButton(ability2Btn, state.abilityCooldowns['hope-light'], 40);
    updateAbilityButton(ability3Btn, state.abilityCooldowns['freedom-dash'], 20);

    if (state.status === 'lost') {
      showGameOver(state.score);
    } else if (state.status === 'won') {
      showVictory(state.score);
    }
  });

  window.addEventListener('resize', () => game.resize());
}

function updateAbilityButton(btn: HTMLElement, cooldown: number, hopeCost: number) {
  if (cooldown > 0) {
    btn.classList.add('disabled');
    const cooldownSec = Math.ceil(cooldown / 60);
    btn.setAttribute('data-cooldown', `${cooldownSec}s`);
  } else {
    btn.classList.remove('disabled');
    btn.removeAttribute('data-cooldown');
  }
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

ability1Btn.addEventListener('click', () => {
  game.useAbility('break-chains');
});

ability2Btn.addEventListener('click', () => {
  game.useAbility('hope-light');
});

ability3Btn.addEventListener('click', () => {
  game.useAbility('freedom-dash');
});

initI18n();
initGame();
