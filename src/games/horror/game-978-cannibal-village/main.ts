import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const locationDisplay = document.getElementById('location-display')!;
const locationIcon = locationDisplay.querySelector('.location-icon')!;
const locationNameEl = document.getElementById('location-name')!;
const villager = document.getElementById('villager')!;
const healthBar = document.getElementById('health-bar')!;
const stealthBar = document.getElementById('stealth-bar')!;
const knifeCount = document.getElementById('knife-count')!;
const torchCount = document.getElementById('torch-count')!;
const keyCount = document.getElementById('key-count')!;
const itemKnife = document.getElementById('item-knife')!;
const itemTorch = document.getElementById('item-torch')!;
const itemKey = document.getElementById('item-key')!;
const navButtons = document.getElementById('nav-buttons')!;
const searchBtn = document.getElementById('search-btn')!;
const sneakBtn = document.getElementById('sneak-btn')!;
const fightBtn = document.getElementById('fight-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const locationIcons: Record<string, string> = {
  entrance: '🏚️',
  huts: '🛖',
  pit: '🦴',
  altar: '⛩️',
  chief: '👑',
  storage: '📦',
  cage: '🔒',
  path: '🌲',
  exit: '🏃'
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
  const loc = game.getCurrentLocation();

  // Stats
  healthBar.style.width = `${stats.health}%`;
  stealthBar.style.width = `${stats.stealth}%`;

  // Items
  knifeCount.textContent = String(stats.knives);
  torchCount.textContent = String(stats.torches);
  keyCount.textContent = String(stats.keys);

  itemKnife.classList.toggle('has-item', stats.knives > 0);
  itemTorch.classList.toggle('has-item', stats.torches > 0);
  itemKey.classList.toggle('has-item', stats.keys > 0);

  // Location info
  if (loc) {
    locationIcon.textContent = locationIcons[loc.id] || '🏚️';
    locationNameEl.textContent = game.getLocationName(loc.id);

    // Navigation
    navButtons.innerHTML = '';
    loc.exits.forEach(exitId => {
      const btn = document.createElement('button');
      const isLocked = game.isLocationLocked(exitId);
      btn.className = 'nav-btn';
      if (exitId === 'exit') btn.className += ' escape';
      if (isLocked) btn.className += ' locked';
      btn.textContent = game.getLocationName(exitId) + (isLocked ? ' 🔒' : '');
      btn.disabled = !stats.isRunning || stats.villagerHunting;
      btn.addEventListener('click', () => game.moveTo(exitId));
      navButtons.appendChild(btn);
    });
  }

  // States
  if (stats.villagerHunting) {
    gameContainer.classList.add('hunt');
  } else {
    gameContainer.classList.remove('hunt');
  }

  if (stats.stealth < 30) {
    gameContainer.classList.add('exposed');
  } else {
    gameContainer.classList.remove('exposed');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    searchBtn.disabled = stats.villagerHunting;
    sneakBtn.disabled = false;
    fightBtn.disabled = !stats.villagerHunting || (stats.knives <= 0 && stats.torches <= 0);
  } else {
    startBtn.style.display = 'block';
    searchBtn.disabled = true;
    sneakBtn.disabled = true;
    fightBtn.disabled = true;
  }
}

function handleVillagerState(hunting: boolean) {
  if (hunting) {
    villager.classList.remove('hidden');
    villager.classList.add('hunting');
  } else {
    villager.classList.remove('hunting');
    villager.classList.add('hidden');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnVillagerState(handleVillagerState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('hunt', 'exposed');
    villager.classList.add('hidden');
    villager.classList.remove('hunting');
    if (win) {
      gameContainer.classList.add('escaped');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('escaped');
    game.start();
  });

  searchBtn.addEventListener('click', () => game.search());
  sneakBtn.addEventListener('click', () => game.sneak());
  fightBtn.addEventListener('click', () => game.fight());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyS') game.search();
    if (e.code === 'KeyN') game.sneak();
    if (e.code === 'KeyF') game.fight();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
