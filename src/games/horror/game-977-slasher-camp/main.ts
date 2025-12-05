import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const locationDisplay = document.getElementById('location-display')!;
const locationIcon = locationDisplay.querySelector('.location-icon')!;
const locationNameEl = document.getElementById('location-name')!;
const killer = document.getElementById('killer')!;
const survivorCount = document.getElementById('survivor-count')!;
const timeDisplay = document.getElementById('time-display')!;
const healthBar = document.getElementById('health-bar')!;
const staminaBar = document.getElementById('stamina-bar')!;
const medkitCount = document.getElementById('medkit-count')!;
const keysCount = document.getElementById('keys-count')!;
const itemFlashlight = document.getElementById('item-flashlight')!;
const itemMedkit = document.getElementById('item-medkit')!;
const itemKeys = document.getElementById('item-keys')!;
const navButtons = document.getElementById('nav-buttons')!;
const searchBtn = document.getElementById('search-btn')!;
const hideBtn = document.getElementById('hide-btn')!;
const runBtn = document.getElementById('run-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const locationIcons: Record<string, string> = {
  campfire: '🏕️',
  cabin_a: '🏠',
  cabin_b: '🏠',
  lake: '🌊',
  woods: '🌲',
  showers: '🚿',
  parking: '🅿️',
  lodge: '🏛️',
  exit: '🚗'
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

  // HUD
  survivorCount.textContent = String(stats.survivors);
  timeDisplay.textContent = game.getTimeString();

  // Stats
  healthBar.style.width = `${stats.health}%`;
  staminaBar.style.width = `${stats.stamina}%`;

  // Items
  medkitCount.textContent = String(stats.medkits);
  keysCount.textContent = stats.hasKeys ? '1' : '0';

  itemFlashlight.classList.toggle('has-item', stats.hasFlashlight);
  itemMedkit.classList.toggle('has-item', stats.medkits > 0);
  itemKeys.classList.toggle('has-item', stats.hasKeys);

  // Location
  if (loc) {
    locationIcon.textContent = locationIcons[loc.id] || '🏕️';
    locationNameEl.textContent = game.getLocationName(loc.id);

    navButtons.innerHTML = '';
    loc.exits.forEach(exitId => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn' + (exitId === 'exit' ? ' escape' : '');
      btn.textContent = game.getLocationName(exitId);
      btn.disabled = !stats.isRunning || stats.killerChasing;
      btn.addEventListener('click', () => game.moveTo(exitId));
      navButtons.appendChild(btn);
    });
  }

  // Dawn state
  if (stats.hour >= 5) {
    gameContainer.classList.add('dawn');
  } else {
    gameContainer.classList.remove('dawn');
  }

  // Chase state
  if (stats.killerChasing) {
    gameContainer.classList.add('chase');
  } else {
    gameContainer.classList.remove('chase');
  }

  // Buttons
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    searchBtn.disabled = stats.killerChasing;
    hideBtn.disabled = false;
    runBtn.disabled = stats.stamina < 30;
  } else {
    startBtn.style.display = 'block';
    searchBtn.disabled = true;
    hideBtn.disabled = true;
    runBtn.disabled = true;
  }
}

function handleKillerState(chasing: boolean) {
  if (chasing) {
    killer.classList.remove('hidden');
    killer.classList.add('chasing');
  } else {
    killer.classList.remove('chasing');
    killer.classList.add('hidden');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnKillerState(handleKillerState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('chase');
    killer.classList.add('hidden');
    killer.classList.remove('chasing');
    if (win) {
      gameContainer.classList.add('escaped');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('escaped', 'dawn');
    game.start();
  });

  searchBtn.addEventListener('click', () => game.search());
  hideBtn.addEventListener('click', () => game.hide());
  runBtn.addEventListener('click', () => game.run());

  // Click medkit to use
  itemMedkit.addEventListener('click', () => game.useMedkit());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyS') game.search();
    if (e.code === 'KeyH') game.hide();
    if (e.code === 'KeyR') game.run();
    if (e.code === 'KeyM') game.useMedkit();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
