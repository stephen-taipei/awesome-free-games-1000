import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const staminaBar = document.getElementById('stamina-bar')!;
const torchBar = document.getElementById('torch-bar')!;
const tombView = document.getElementById('tomb-view')!;
const tombDarkness = document.getElementById('tomb-darkness')!;
const player = document.getElementById('player')!;
const mummy = document.getElementById('mummy')!;
const exit = document.getElementById('exit')!;
const treasuresEl = document.getElementById('treasures')!;
const distanceValue = document.getElementById('distance-value')!;
const exitDistanceEl = document.getElementById('exit-distance')!;
const treasureValue = document.getElementById('treasure-value')!;
const walkBtn = document.getElementById('walk-btn')!;
const runBtn = document.getElementById('run-btn')!;
const hideBtn = document.getElementById('hide-btn')!;
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

  staminaBar.style.width = `${stats.stamina}%`;
  torchBar.style.width = `${stats.torch}%`;
  distanceValue.textContent = String(Math.floor(stats.distance));
  exitDistanceEl.textContent = String(stats.exitDistance);
  treasureValue.textContent = String(stats.treasures);

  // Darkness based on torch
  tombDarkness.style.opacity = String(1 - stats.torch / 100 * 0.7);

  // Mummy position
  if (stats.mummyDistance > 0) {
    mummy.classList.remove('hidden');
    mummy.classList.add('chasing');
    const mummyPos = Math.max(0, (stats.mummyDistance / stats.exitDistance) * 80);
    mummy.style.left = `${mummyPos}%`;
  } else {
    mummy.classList.add('hidden');
  }

  // Exit visibility
  if (stats.distance > stats.exitDistance - 30) {
    exit.classList.add('near');
  } else {
    exit.classList.remove('near');
  }

  // Mummy near effect
  if (stats.mummyNear) {
    gameContainer.classList.add('mummy-near');
  } else {
    gameContainer.classList.remove('mummy-near');
  }

  // Player animation
  player.classList.remove('walking', 'running');

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    walkBtn.disabled = stats.isHiding;
    runBtn.disabled = stats.isHiding || stats.stamina < 20;
    hideBtn.disabled = stats.isHiding;
  } else {
    startBtn.style.display = 'block';
    walkBtn.disabled = true;
    runBtn.disabled = true;
    hideBtn.disabled = true;
  }
}

function spawnTreasure() {
  const treasure = document.createElement('div');
  treasure.className = 'treasure-item';
  treasure.textContent = '💎';
  treasure.style.left = `${30 + Math.random() * 50}%`;
  treasure.style.top = `${20 + Math.random() * 60}%`;
  treasure.style.pointerEvents = 'auto';
  treasure.style.cursor = 'pointer';

  treasure.addEventListener('click', () => {
    game.collectTreasure();
    treasure.remove();
  });

  treasuresEl.appendChild(treasure);

  setTimeout(() => treasure.remove(), 5000);
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnTreasureCollect(spawnTreasure);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('mummy-near');
    gameContainer.classList.add(win ? 'escaped' : 'caught');
    mummy.classList.remove('chasing');
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('escaped', 'caught');
    treasuresEl.innerHTML = '';
    mummy.classList.add('hidden');
    game.start();
  });

  walkBtn.addEventListener('click', () => {
    player.classList.add('walking');
    game.walk();
  });

  runBtn.addEventListener('click', () => {
    player.classList.add('running');
    game.run();
  });

  hideBtn.addEventListener('click', () => game.hide());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') game.walk();
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') game.run();
    if (e.code === 'KeyH' || e.code === 'Space') {
      e.preventDefault();
      game.hide();
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
