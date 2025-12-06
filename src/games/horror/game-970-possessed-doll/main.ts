import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const roomIcon = document.getElementById('room-icon')!;
const roomName = document.getElementById('room-name')!;
const doll = document.getElementById('doll')!;
const dollPosition = document.getElementById('doll-position')!;
const sanityBar = document.getElementById('sanity-bar')!;
const batteryBar = document.getElementById('battery-bar')!;
const timeDisplay = document.getElementById('time-display')!;
const navButtons = document.getElementById('nav-buttons')!;
const watchBtn = document.getElementById('watch-btn')!;
const hideBtn = document.getElementById('hide-btn')!;
const flashlightBtn = document.getElementById('flashlight-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const roomIcons: Record<string, string> = {
  bedroom: '🛏️',
  hallway: '🚪',
  living: '🛋️',
  kitchen: '🍳',
  bathroom: '🚿'
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

  // Bars
  sanityBar.style.width = `${stats.sanity}%`;
  batteryBar.style.width = `${stats.battery}%`;

  // Bar states
  if (stats.sanity < 30) {
    sanityBar.classList.add('low');
  } else {
    sanityBar.classList.remove('low');
  }

  if (stats.battery < 30) {
    batteryBar.classList.add('low');
  } else {
    batteryBar.classList.remove('low');
  }

  // Time
  timeDisplay.textContent = game.getTimeDisplay();

  // Room
  roomIcon.textContent = roomIcons[stats.playerRoom] || '🏠';
  roomName.textContent = game.getRoomName(stats.playerRoom);

  // Doll position indicator
  if (stats.dollRoom === stats.playerRoom) {
    dollPosition.textContent = t('game.msgs.dollSameRoom');
    dollPosition.style.color = '#cc4466';
  } else {
    dollPosition.textContent = `🎎 ${game.getRoomName(stats.dollRoom)}`;
    dollPosition.style.color = '';
  }

  // Navigation
  const currentRoom = game.getCurrentRoom();
  navButtons.innerHTML = '';
  if (currentRoom) {
    currentRoom.adjacent.forEach(adjId => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.textContent = `${roomIcons[adjId] || ''} ${game.getRoomName(adjId)}`;
      btn.disabled = !stats.isRunning || stats.dollApproaching;
      btn.addEventListener('click', () => game.moveTo(adjId));
      navButtons.appendChild(btn);
    });
  }

  // Danger mode
  if (stats.dollApproaching) {
    gameContainer.classList.add('danger-mode');
  } else {
    gameContainer.classList.remove('danger-mode');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    watchBtn.disabled = stats.dollApproaching;
    hideBtn.disabled = stats.dollApproaching;
    flashlightBtn.disabled = stats.battery <= 0;
  } else {
    startBtn.style.display = 'block';
    watchBtn.disabled = true;
    hideBtn.disabled = true;
    flashlightBtn.disabled = true;
  }
}

function handleDollState(state: 'hidden' | 'same-room' | 'approaching' | 'attacking') {
  doll.className = 'doll';

  if (state === 'hidden') {
    doll.classList.add('hidden');
  } else if (state === 'same-room') {
    doll.classList.add('same-room');
  } else if (state === 'approaching') {
    doll.classList.add('approaching');
    doll.classList.add('same-room');
  } else if (state === 'attacking') {
    doll.classList.add('attacking');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnDollState(handleDollState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('danger-mode');
    if (win) {
      gameContainer.classList.add('survived');
    } else {
      gameContainer.classList.add('caught');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('survived', 'caught');
    game.start();
  });

  watchBtn.addEventListener('click', () => game.watch());
  hideBtn.addEventListener('click', () => game.hide());
  flashlightBtn.addEventListener('click', () => game.flashlight());

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyW') game.watch();
    if (e.code === 'KeyH') game.hide();
    if (e.code === 'KeyF') game.flashlight();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
