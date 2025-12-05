import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const locationDisplay = document.getElementById('location-display')!;
const locationIcon = locationDisplay.querySelector('.location-icon')!;
const locationNameEl = document.getElementById('location-name')!;
const clown = document.getElementById('clown')!;
const healthBar = document.getElementById('health-bar')!;
const fearBar = document.getElementById('fear-bar')!;
const balloonCount = document.getElementById('balloon-count')!;
const hornCount = document.getElementById('horn-count')!;
const itemFlashlight = document.getElementById('item-flashlight')!;
const itemBalloon = document.getElementById('item-balloon')!;
const itemHorn = document.getElementById('item-horn')!;
const navButtons = document.getElementById('nav-buttons')!;
const searchBtn = document.getElementById('search-btn')!;
const hideBtn = document.getElementById('hide-btn')!;
const distractBtn = document.getElementById('distract-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const locationIcons: Record<string, string> = {
  entrance: '🎪',
  bigtop: '🎭',
  funhouse: '👻',
  mirrors: '🪞',
  backstage: '🎬',
  cages: '🦁',
  trailers: '🚐',
  ferris: '🎡',
  exit: '🚪'
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
  fearBar.style.width = `${stats.fear}%`;

  // Items
  balloonCount.textContent = String(stats.balloons);
  hornCount.textContent = String(stats.horns);

  itemFlashlight.classList.toggle('has-item', stats.hasFlashlight);
  itemBalloon.classList.toggle('has-item', stats.balloons > 0);
  itemHorn.classList.toggle('has-item', stats.horns > 0);

  // Location
  if (loc) {
    locationIcon.textContent = locationIcons[loc.id] || '🎪';
    locationNameEl.textContent = game.getLocationName(loc.id);

    navButtons.innerHTML = '';
    loc.exits.forEach(exitId => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn' + (exitId === 'exit' ? ' escape' : '');
      btn.textContent = game.getLocationName(exitId);
      btn.disabled = !stats.isRunning || stats.clownChasing || stats.fear >= 90;
      btn.addEventListener('click', () => game.moveTo(exitId));
      navButtons.appendChild(btn);
    });
  }

  // States
  if (stats.clownChasing) {
    gameContainer.classList.add('clown-chase');
  } else {
    gameContainer.classList.remove('clown-chase');
  }

  if (stats.fear >= 70) {
    gameContainer.classList.add('high-fear');
  } else {
    gameContainer.classList.remove('high-fear');
  }

  // Buttons
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    searchBtn.disabled = stats.clownChasing || stats.fear >= 90;
    hideBtn.disabled = false;
    distractBtn.disabled = stats.balloons <= 0 && stats.horns <= 0;
  } else {
    startBtn.style.display = 'block';
    searchBtn.disabled = true;
    hideBtn.disabled = true;
    distractBtn.disabled = true;
  }
}

function handleClownState(chasing: boolean) {
  if (chasing) {
    clown.classList.remove('hidden');
    clown.classList.add('attacking');
  } else {
    clown.classList.remove('attacking');
    clown.classList.add('hidden');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnClownState(handleClownState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('clown-chase', 'high-fear');
    clown.classList.add('hidden');
    clown.classList.remove('attacking');
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
  distractBtn.addEventListener('click', () => game.distract());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyS') game.search();
    if (e.code === 'KeyH') game.hide();
    if (e.code === 'KeyD') game.distract();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
