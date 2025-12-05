import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const deckDisplay = document.getElementById('deck-display')!;
const deckIcon = deckDisplay.querySelector('.deck-icon')!;
const deckNameEl = document.getElementById('deck-name')!;
const ghost = document.getElementById('ghost')!;
const sanityBar = document.getElementById('sanity-bar')!;
const lightBar = document.getElementById('light-bar')!;
const keyCount = document.getElementById('key-count')!;
const candleCount = document.getElementById('candle-count')!;
const compassCount = document.getElementById('compass-count')!;
const itemKey = document.getElementById('item-key')!;
const itemCandle = document.getElementById('item-candle')!;
const itemCompass = document.getElementById('item-compass')!;
const navButtons = document.getElementById('nav-buttons')!;
const searchBtn = document.getElementById('search-btn')!;
const hideBtn = document.getElementById('hide-btn')!;
const lightBtn = document.getElementById('light-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const deckIcons: Record<string, string> = {
  main: '⚓',
  cabin: '🚪',
  cargo: '📦',
  engine: '⚙️',
  galley: '🍳',
  quarters: '🛏️',
  bridge: '🧭',
  storage: '🗄️',
  lifeboat: '🚤'
};

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
  const deck = game.getCurrentDeck();

  // Stats
  sanityBar.style.width = `${stats.sanity}%`;
  lightBar.style.width = `${stats.light}%`;

  // Items
  keyCount.textContent = String(stats.keys);
  candleCount.textContent = String(stats.candles);
  compassCount.textContent = String(stats.compass);

  itemKey.classList.toggle('has-item', stats.keys > 0);
  itemCandle.classList.toggle('has-item', stats.candles > 0);
  itemCompass.classList.toggle('has-item', stats.compass > 0);

  // Deck info
  if (deck) {
    deckIcon.textContent = deckIcons[deck.id] || '⚓';
    deckNameEl.textContent = game.getDeckName(deck.id);

    // Navigation buttons
    navButtons.innerHTML = '';
    deck.exits.forEach(exitId => {
      const btn = document.createElement('button');
      const isLocked = game.isDeckLocked(exitId);
      btn.className = 'nav-btn' + (exitId === 'lifeboat' ? ' escape' : '');
      btn.textContent = game.getDeckName(exitId) + (isLocked ? ' 🔒' : '');
      btn.disabled = !stats.isRunning;
      btn.addEventListener('click', () => game.moveTo(exitId));
      navButtons.appendChild(btn);
    });
  }

  // Sanity state
  if (stats.sanity < 30) {
    gameContainer.classList.add('insane');
  } else {
    gameContainer.classList.remove('insane');
  }

  // Ghost state
  if (stats.ghostAppearing) {
    gameContainer.classList.add('haunted');
  } else {
    gameContainer.classList.remove('haunted');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    searchBtn.disabled = stats.ghostAppearing;
    hideBtn.disabled = stats.ghostAppearing;
    lightBtn.disabled = stats.candles <= 0;
  } else {
    startBtn.style.display = 'block';
    searchBtn.disabled = true;
    hideBtn.disabled = true;
    lightBtn.disabled = true;
  }
}

function handleGhostState(appearing: boolean) {
  if (appearing) {
    ghost.classList.remove('hidden');
    ghost.classList.add('appearing');
  } else {
    ghost.classList.remove('appearing');
    ghost.classList.add('hidden');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnGhostState(handleGhostState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('haunted', 'insane');
    ghost.classList.add('hidden');
    ghost.classList.remove('appearing');
    if (win) {
      gameContainer.classList.add('escaped');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('escaped');
    game.start();
  });

  searchBtn.addEventListener('click', () => game.search());
  hideBtn.addEventListener('click', () => game.hide());
  lightBtn.addEventListener('click', () => game.useLight());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyS') game.search();
    if (e.code === 'KeyH') game.hide();
    if (e.code === 'KeyL') game.useLight();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
