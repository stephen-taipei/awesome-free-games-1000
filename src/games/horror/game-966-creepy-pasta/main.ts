import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const storyTitle = document.getElementById('story-title')!;
const storyContent = document.querySelector('.story-content')!;
const storyText = document.getElementById('story-text')!;
const currentPageEl = document.getElementById('current-page')!;
const totalPagesEl = document.getElementById('total-pages')!;
const courageBar = document.getElementById('courage-bar')!;
const fearBar = document.getElementById('fear-bar')!;
const eventIndicator = document.getElementById('event-indicator')!;
const continueBtn = document.getElementById('continue-btn')!;
const lookBtn = document.getElementById('look-btn')!;
const stopBtn = document.getElementById('stop-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

function t(key: string): string {
  const keys = key.split('.');
  let obj: any = (translations as any)[currentLocale];
  for (const k of keys) {
    if (obj) obj = obj[k];
  }
  return obj || key;
}

function render() {
  const stats = game.getStats();

  // Bars
  courageBar.style.width = `${stats.courage}%`;
  fearBar.style.width = `${stats.fear}%`;

  // Bar states
  if (stats.courage < 30) {
    courageBar.classList.add('low');
  } else {
    courageBar.classList.remove('low');
  }

  if (stats.fear > 70) {
    fearBar.classList.add('high');
    gameContainer.classList.add('intense');
  } else {
    fearBar.classList.remove('high');
    gameContainer.classList.remove('intense');
  }

  // Page indicator
  currentPageEl.textContent = String(stats.currentPage);
  totalPagesEl.textContent = String(stats.totalPages);

  // Reading state
  if (stats.isReading) {
    gameContainer.classList.add('reading');
  } else {
    gameContainer.classList.remove('reading');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    continueBtn.disabled = false;
    lookBtn.disabled = false;
    stopBtn.disabled = false;
  } else {
    startBtn.style.display = 'block';
    continueBtn.disabled = true;
    lookBtn.disabled = true;
    stopBtn.disabled = true;
  }
}

function handlePageChange(page: number, text: string) {
  storyText.textContent = text;
  currentPageEl.textContent = String(page);
}

function handleEvent(icon: string) {
  eventIndicator.textContent = icon;
  eventIndicator.classList.add('active');

  setTimeout(() => {
    eventIndicator.classList.remove('active');
  }, 2000);
}

function handleTextEffect(effect: 'normal' | 'glitch' | 'fade') {
  storyContent.classList.remove('glitch', 'fade');

  if (effect === 'glitch') {
    storyContent.classList.add('glitch');
  } else if (effect === 'fade') {
    storyContent.classList.add('fade');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnPageChange(handlePageChange);
  game.setOnEvent(handleEvent);
  game.setOnTextEffect(handleTextEffect);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('reading', 'intense');
    storyContent.classList.remove('glitch', 'fade');
    if (win) {
      gameContainer.classList.add('finished');
    } else {
      gameContainer.classList.add('consumed');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('finished', 'consumed');
    storyTitle.textContent = game.getStoryTitle();
    game.start();
  });

  continueBtn.addEventListener('click', () => game.continueReading());
  lookBtn.addEventListener('click', () => game.lookAway());
  stopBtn.addEventListener('click', () => game.stopReading());

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'Space' || e.code === 'KeyC') game.continueReading();
    if (e.code === 'KeyL') game.lookAway();
    if (e.code === 'Escape' || e.code === 'KeyS') game.stopReading();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
