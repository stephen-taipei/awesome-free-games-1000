/**
 * Shadow Run Main Entry
 * Game #401
 */
import { ShadowRunGame } from './game';
import { translations } from './i18n';

type Locale = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko';

const i18n = {
  locale: 'en' as Locale,
  translations: {} as Record<string, Record<string, string>>,

  loadTranslations(locale: Locale, trans: Record<string, string>) {
    this.translations[locale] = trans;
  },

  setLocale(locale: Locale) {
    this.locale = locale;
  },

  getLocale(): Locale {
    return this.locale;
  },

  t(key: string): string {
    return this.translations[this.locale]?.[key] || key;
  },
};

// Elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const distanceDisplay = document.getElementById('distance-display')!;
const energyDisplay = document.getElementById('energy-display')!;
const energyBar = document.getElementById('energy-bar') as HTMLElement;
const worldDisplay = document.getElementById('world-display')!;

const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;
const restartBtn = document.getElementById('restart-btn')!;

let game: ShadowRunGame;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes('zh-TW') || browserLang.includes('zh-Hant')) {
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
  game = new ShadowRunGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.distance !== undefined) {
      distanceDisplay.textContent = state.distance.toString();
    }

    if (state.energy !== undefined) {
      energyDisplay.textContent = state.energy.toString();
      const energyPercent = (state.energy / 100) * 100;
      energyBar.style.width = `${energyPercent}%`;

      // Change color based on energy level
      if (state.energy < 30) {
        energyBar.style.background = 'linear-gradient(90deg, #ff4444, #ff6b6b)';
      } else if (state.energy < 60) {
        energyBar.style.background = 'linear-gradient(90deg, #ffa500, #ffb733)';
      } else {
        energyBar.style.background = 'linear-gradient(90deg, #4caf50, #66bb6a)';
      }
    }

    if (state.world !== undefined) {
      worldDisplay.textContent = i18n.t(state.world === 'light' ? 'game.light' : 'game.shadow');
      worldDisplay.className = `world-badge ${state.world}`;
    }

    if (state.status === 'lost') {
      showGameOver();
    }
  });

  window.addEventListener('resize', () => {
    game.resize();
  });
}

function showGameOver() {
  setTimeout(() => {
    overlay.style.display = 'flex';
    overlayTitle.textContent = i18n.t('game.gameover');
    overlayMsg.textContent = `${i18n.t('game.finalscore')}: ${game.getDistance()}`;
    startBtn.textContent = i18n.t('game.restart');
  }, 300);
}

function startGame() {
  overlay.style.display = 'none';
  game.start();
  distanceDisplay.textContent = '0';
  energyDisplay.textContent = '100';
  energyBar.style.width = '100%';
  worldDisplay.textContent = i18n.t('game.light');
  worldDisplay.className = 'world-badge light';
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
  startGame();
});

// Init
initI18n();
initGame();
