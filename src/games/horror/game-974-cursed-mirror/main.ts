import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const mirrorSurface = document.getElementById('mirror-surface')!;
const reflection = document.getElementById('reflection')!;
const integrityBar = document.getElementById('integrity-bar')!;
const sanityBar = document.getElementById('sanity-bar')!;
const reinforceBtn = document.getElementById('reinforce-btn')!;
const resistBtn = document.getElementById('resist-btn')!;
const sealBtn = document.getElementById('seal-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;
const cracksOverlay = document.getElementById('cracks')!;

const sealSlots = [
  document.getElementById('seal-1')!,
  document.getElementById('seal-2')!,
  document.getElementById('seal-3')!,
  document.getElementById('seal-4')!,
  document.getElementById('seal-5')!
];

const sealSymbols = ['◆', '◈', '✦', '✧', '⬡'];

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
  integrityBar.style.width = `${stats.integrity}%`;
  sanityBar.style.width = `${stats.sanity}%`;

  // Bar states
  if (stats.integrity < 30) {
    integrityBar.classList.add('low');
  } else {
    integrityBar.classList.remove('low');
  }

  if (stats.sanity < 30) {
    sanityBar.classList.add('low');
  } else {
    sanityBar.classList.remove('low');
  }

  // Cracks based on integrity
  updateCracks(stats.integrity);

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    reinforceBtn.disabled = false;
    resistBtn.disabled = false;
    sealBtn.disabled = stats.sanity < 20;
  } else {
    startBtn.style.display = 'block';
    reinforceBtn.disabled = true;
    resistBtn.disabled = true;
    sealBtn.disabled = true;
  }
}

function updateCracks(integrity: number) {
  const crackCount = Math.floor((100 - integrity) / 15);
  cracksOverlay.innerHTML = '';

  const crackPositions = [
    { top: '30%', left: '20%' },
    { top: '50%', left: '70%' },
    { top: '70%', left: '35%' },
    { top: '25%', left: '60%' },
    { top: '60%', left: '15%' },
    { top: '45%', left: '50%' }
  ];

  for (let i = 0; i < Math.min(crackCount, crackPositions.length); i++) {
    const crack = document.createElement('div');
    crack.className = 'crack';
    crack.textContent = '╳';
    crack.style.top = crackPositions[i].top;
    crack.style.left = crackPositions[i].left;
    cracksOverlay.appendChild(crack);
  }
}

function handleMirrorState(state: 'normal' | 'desync' | 'attack') {
  gameContainer.classList.remove('desync', 'breaking');

  if (state === 'desync') {
    gameContainer.classList.add('desync');
  } else if (state === 'attack') {
    gameContainer.classList.add('breaking');
  }
}

function handleSealChange(index: number, sealed: boolean) {
  if (index < sealSlots.length) {
    if (sealed) {
      sealSlots[index].classList.add('sealed');
      sealSlots[index].textContent = sealSymbols[index];
    } else {
      sealSlots[index].classList.remove('sealed');
      sealSlots[index].textContent = '◇';
    }
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnMirrorState(handleMirrorState);
  game.setOnSealChange(handleSealChange);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('desync', 'breaking');
    if (win) {
      gameContainer.classList.add('sealed');
    } else {
      gameContainer.classList.add('broken');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('sealed', 'broken');
    // Reset seal slots
    sealSlots.forEach(slot => {
      slot.classList.remove('sealed');
      slot.textContent = '◇';
    });
    game.start();
  });

  reinforceBtn.addEventListener('click', () => game.reinforce());
  resistBtn.addEventListener('click', () => game.resist());
  sealBtn.addEventListener('click', () => game.castSeal());

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyR') game.reinforce();
    if (e.code === 'KeyE') game.resist();
    if (e.code === 'KeyS') game.castSeal();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
