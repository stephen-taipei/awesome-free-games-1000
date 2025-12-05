import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const roomDisplay = document.getElementById('room-display')!;
const roomIcon = roomDisplay.querySelector('.room-icon')!;
const roomNameEl = document.getElementById('room-name')!;
const roomDesc = document.getElementById('room-desc')!;
const vampire = document.getElementById('vampire')!;
const healthBar = document.getElementById('health-bar')!;
const garlicCount = document.getElementById('garlic-count')!;
const crossCount = document.getElementById('cross-count')!;
const mirrorCount = document.getElementById('mirror-count')!;
const exitsContainer = document.getElementById('exits')!;
const searchBtn = document.getElementById('search-btn')!;
const hideBtn = document.getElementById('hide-btn')!;
const useItemBtn = document.getElementById('use-item-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const roomIcons: Record<string, string> = {
  entrance: '🚪',
  library: '📚',
  dining: '🍽️',
  kitchen: '🍳',
  cellar: '🍷',
  chapel: '⛪',
  bedroom: '🛏️',
  tower: '🗼',
  crypt: '⚰️',
  garden: '🌹',
  exit: '🏰'
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
  const room = game.getCurrentRoom();

  // Health
  healthBar.style.width = `${stats.health}%`;

  // Items
  garlicCount.textContent = String(stats.garlic);
  crossCount.textContent = String(stats.cross);
  mirrorCount.textContent = String(stats.mirror);

  // Room info
  if (room) {
    roomIcon.textContent = roomIcons[room.id] || '🚪';
    roomNameEl.textContent = game.getRoomName(room.id);
    roomDesc.textContent = game.getRoomDesc(room.id);

    // Exits
    exitsContainer.innerHTML = '';
    room.exits.forEach(exitId => {
      const btn = document.createElement('button');
      btn.className = 'exit-btn' + (exitId === 'exit' ? ' escape' : '');
      btn.textContent = game.getRoomName(exitId);
      btn.addEventListener('click', () => game.moveTo(exitId));
      exitsContainer.appendChild(btn);
    });
  }

  // Vampire state
  if (stats.vampireAttacking) {
    gameContainer.classList.add('vampire-near');
  } else {
    gameContainer.classList.remove('vampire-near');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    searchBtn.disabled = stats.vampireAttacking;
    hideBtn.disabled = stats.vampireAttacking;
    useItemBtn.disabled = !stats.vampireAttacking;
  } else {
    startBtn.style.display = 'block';
    searchBtn.disabled = true;
    hideBtn.disabled = true;
    useItemBtn.disabled = true;
  }
}

function handleVampireState(attacking: boolean) {
  if (attacking) {
    vampire.classList.remove('hidden');
    vampire.classList.add('attacking');
  } else {
    vampire.classList.remove('attacking');
    vampire.classList.add('hidden');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnVampireState(handleVampireState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('vampire-near');
    vampire.classList.add('hidden');
    vampire.classList.remove('attacking');
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
  useItemBtn.addEventListener('click', () => game.useItem());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyS') game.search();
    if (e.code === 'KeyH') game.hide();
    if (e.code === 'Space') {
      e.preventDefault();
      game.useItem();
    }
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
