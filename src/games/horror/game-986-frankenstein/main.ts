import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const powerBar = document.getElementById('power-bar')!;
const powerValue = document.getElementById('power-value')!;
const stabilityBar = document.getElementById('stability-bar')!;
const stabilityValue = document.getElementById('stability-value')!;
const lightning = document.getElementById('lightning')!;
const monster = document.getElementById('monster')!;
const monsterFace = document.getElementById('monster-face')!;
const coilLeft = document.getElementById('coil-left')!;
const coilRight = document.getElementById('coil-right')!;
const chargeBtn = document.getElementById('charge-btn')!;
const stabilizeBtn = document.getElementById('stabilize-btn')!;
const shockBtn = document.getElementById('shock-btn')!;
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

  powerBar.style.width = `${stats.power}%`;
  powerValue.textContent = `${Math.floor(stats.power)}%`;
  stabilityBar.style.width = `${stats.stability}%`;
  stabilityValue.textContent = `${Math.floor(stats.stability)}%`;

  // Bolts active when power is high
  const bolts = document.querySelectorAll('.bolt');
  bolts.forEach(bolt => {
    if (stats.power >= 50) {
      bolt.classList.add('active');
    } else {
      bolt.classList.remove('active');
    }
  });

  // Overload warning
  if (stats.stability < 30) {
    gameContainer.classList.add('overload');
  } else {
    gameContainer.classList.remove('overload');
  }

  // Monster alive
  if (stats.isAlive) {
    gameContainer.classList.add('alive-scene');
    const eyes = monsterFace.querySelector('.eyes')!;
    const body = monster.querySelector('.monster-body')!;
    eyes.classList.add('alive');
    body.classList.add('alive');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    chargeBtn.disabled = false;
    stabilizeBtn.disabled = stats.stability >= 100;
    shockBtn.disabled = stats.power < 80;
  } else {
    startBtn.style.display = 'block';
    chargeBtn.disabled = true;
    stabilizeBtn.disabled = true;
    shockBtn.disabled = true;
  }
}

function handleEffect(type: string) {
  if (type === 'charge') {
    coilLeft.classList.add('active');
    coilRight.classList.add('active');
    setTimeout(() => {
      coilLeft.classList.remove('active');
      coilRight.classList.remove('active');
    }, 300);
  } else if (type === 'shock') {
    lightning.classList.add('flash');
    coilLeft.classList.add('active');
    coilRight.classList.add('active');
    setTimeout(() => {
      lightning.classList.remove('flash');
      coilLeft.classList.remove('active');
      coilRight.classList.remove('active');
    }, 500);
  } else if (type === 'stabilize') {
    // Brief calm effect
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnEffect(handleEffect);

  game.setOnGameEnd((win) => {
    if (!win) {
      gameContainer.classList.add('overload');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('alive-scene', 'overload');
    const eyes = monsterFace.querySelector('.eyes')!;
    const body = monster.querySelector('.monster-body')!;
    eyes.classList.remove('alive');
    body.classList.remove('alive');
    game.start();
  });

  chargeBtn.addEventListener('click', () => game.charge());
  stabilizeBtn.addEventListener('click', () => game.stabilize());
  shockBtn.addEventListener('click', () => game.shock());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyC') game.charge();
    if (e.code === 'KeyS') game.stabilize();
    if (e.code === 'Space') {
      e.preventDefault();
      game.shock();
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
