import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const roomDisplay = document.getElementById('room-display')!;
const roomIcon = roomDisplay.querySelector('.room-icon')!;
const roomNameEl = document.getElementById('room-name')!;
const patient = document.getElementById('patient')!;
const sanityBar = document.getElementById('sanity-bar')!;
const batteryBar = document.getElementById('battery-bar')!;
const evidenceCount = document.getElementById('evidence-count')!;
const navButtons = document.getElementById('nav-buttons')!;
const searchBtn = document.getElementById('search-btn')!;
const hideBtn = document.getElementById('hide-btn')!;
const flashBtn = document.getElementById('flash-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const roomIcons: Record<string, string> = {
  lobby: '🏥',
  ward_a: '🛏️',
  ward_b: '🛏️',
  office: '🗄️',
  morgue: '⚰️',
  kitchen: '🍽️',
  basement: '🪜',
  rooftop: '🌙',
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
  const room = game.getCurrentRoom();

  // Stats
  sanityBar.style.width = `${stats.sanity}%`;
  batteryBar.style.width = `${stats.battery}%`;

  // Evidence
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`evidence-${i + 1}`)!;
    el.classList.toggle('found', stats.evidence[i]);
  }
  evidenceCount.textContent = `${stats.evidenceCount} / 4`;

  // Room info
  if (room) {
    roomIcon.textContent = roomIcons[room.id] || '🏥';
    roomNameEl.textContent = game.getRoomName(room.id);

    // Navigation
    navButtons.innerHTML = '';
    room.exits.forEach(exitId => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn' + (exitId === 'exit' ? ' exit' : '');
      btn.textContent = game.getRoomName(exitId);
      btn.disabled = !stats.isRunning || stats.patientChasing;
      btn.addEventListener('click', () => game.moveTo(exitId));
      navButtons.appendChild(btn);
    });
  }

  // States
  if (stats.patientChasing) {
    gameContainer.classList.add('chase');
  } else {
    gameContainer.classList.remove('chase');
  }

  if (stats.sanity < 30) {
    gameContainer.classList.add('insane');
  } else {
    gameContainer.classList.remove('insane');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    searchBtn.disabled = stats.patientChasing;
    hideBtn.disabled = stats.patientChasing;
    flashBtn.disabled = stats.battery < 15;
  } else {
    startBtn.style.display = 'block';
    searchBtn.disabled = true;
    hideBtn.disabled = true;
    flashBtn.disabled = true;
  }
}

function handlePatientState(chasing: boolean) {
  if (chasing) {
    patient.classList.remove('hidden');
    patient.classList.add('chasing');
  } else {
    patient.classList.remove('chasing');
    patient.classList.add('hidden');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnPatientState(handlePatientState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('chase', 'insane');
    patient.classList.add('hidden');
    patient.classList.remove('chasing');
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
  flashBtn.addEventListener('click', () => game.flash());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyS') game.search();
    if (e.code === 'KeyH') game.hide();
    if (e.code === 'KeyF') game.flash();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
