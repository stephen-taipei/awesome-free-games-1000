import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const wendigo = document.getElementById('wendigo')!;
const player = document.getElementById('player')!;
const healthBar = document.getElementById('health-bar')!;
const warmthBar = document.getElementById('warmth-bar')!;
const hungerBar = document.getElementById('hunger-bar')!;
const torchCount = document.getElementById('torch-count')!;
const meatCount = document.getElementById('meat-count')!;
const flareCount = document.getElementById('flare-count')!;
const itemTorch = document.getElementById('item-torch')!;
const itemMeat = document.getElementById('item-meat')!;
const itemFlare = document.getElementById('item-flare')!;
const distanceProgress = document.getElementById('distance-progress')!;
const distanceText = document.getElementById('distance-text')!;
const runBtn = document.getElementById('run-btn')!;
const hideBtn = document.getElementById('hide-btn')!;
const searchBtn = document.getElementById('search-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;
const snowOverlay = document.getElementById('snow')!;

function t(key: string): string {
  const keys = key.split('.');
  let obj: any = (translations as any)[currentLocale];
  for (const k of keys) {
    if (obj) obj = obj[k];
  }
  return obj || key;
}

function createSnowflakes() {
  snowOverlay.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.textContent = '❄';
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.animationDuration = `${2 + Math.random() * 3}s`;
    flake.style.animationDelay = `${Math.random() * 2}s`;
    snowOverlay.appendChild(flake);
  }
}

function render() {
  const stats = game.getStats();

  // Bars
  healthBar.style.width = `${stats.health}%`;
  warmthBar.style.width = `${stats.warmth}%`;
  hungerBar.style.width = `${stats.hunger}%`;

  // Bar states
  if (stats.warmth < 30) {
    warmthBar.classList.add('low');
    gameContainer.classList.add('blizzard');
  } else {
    warmthBar.classList.remove('low');
    gameContainer.classList.remove('blizzard');
  }

  if (stats.hunger > 70) {
    hungerBar.classList.add('high');
  } else {
    hungerBar.classList.remove('high');
  }

  // Items
  torchCount.textContent = String(stats.torches);
  meatCount.textContent = String(stats.meat);
  flareCount.textContent = String(stats.flares);

  itemTorch.classList.toggle('has-item', stats.torches > 0);
  itemMeat.classList.toggle('has-item', stats.meat > 0);
  itemFlare.classList.toggle('has-item', stats.flares > 0);

  // Distance
  distanceProgress.style.width = `${stats.distance}%`;
  distanceText.textContent = `${stats.distance}%`;

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    runBtn.disabled = stats.wendigoState === 'chasing' && stats.warmth < 20;
    hideBtn.disabled = stats.wendigoState === 'chasing';
    searchBtn.disabled = stats.wendigoState === 'chasing';
  } else {
    startBtn.style.display = 'block';
    runBtn.disabled = true;
    hideBtn.disabled = true;
    searchBtn.disabled = true;
  }
}

function handleWendigoState(state: 'hidden' | 'stalking' | 'chasing') {
  wendigo.className = 'wendigo';

  if (state === 'hidden') {
    wendigo.classList.add('hidden');
  } else if (state === 'stalking') {
    wendigo.classList.add('stalking');
  } else if (state === 'chasing') {
    wendigo.classList.add('chasing');
  }
}

function handlePlayerState(state: 'normal' | 'running' | 'hiding') {
  player.className = 'player';

  if (state === 'running') {
    player.classList.add('running');
  } else if (state === 'hiding') {
    player.classList.add('hiding');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnWendigoState(handleWendigoState);
  game.setOnPlayerState(handlePlayerState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('blizzard');
    if (win) {
      gameContainer.classList.add('escaped');
    } else {
      gameContainer.classList.add('caught');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('escaped', 'caught');
    createSnowflakes();
    game.start();
  });

  runBtn.addEventListener('click', () => game.run());
  hideBtn.addEventListener('click', () => game.hide());
  searchBtn.addEventListener('click', () => game.search());

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyR' || e.code === 'ArrowUp') game.run();
    if (e.code === 'KeyH' || e.code === 'ArrowDown') game.hide();
    if (e.code === 'KeyS' || e.code === 'Space') game.search();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  createSnowflakes();
  render();
}

init();
