import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const moon = document.getElementById('moon')!;
const timeValue = document.getElementById('time-value')!;
const forestScene = document.getElementById('forest-scene')!;
const werewolf = document.getElementById('werewolf')!;
const healthBar = document.getElementById('health-bar')!;
const safetyBar = document.getElementById('safety-bar')!;
const itemSilver = document.getElementById('item-silver')!;
const itemWolfsbane = document.getElementById('item-wolfsbane')!;
const itemTrap = document.getElementById('item-trap')!;
const searchBtn = document.getElementById('search-btn')!;
const barricadeBtn = document.getElementById('barricade-btn')!;
const attackBtn = document.getElementById('attack-btn')!;
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

  healthBar.style.width = `${stats.health}%`;
  safetyBar.style.width = `${stats.safety}%`;
  timeValue.textContent = game.getTimeString();

  // Update inventory
  const silverEl = itemSilver.querySelector('small')!;
  const wolfsbaneEl = itemWolfsbane.querySelector('small')!;
  const trapEl = itemTrap.querySelector('small')!;

  silverEl.textContent = String(stats.silver);
  wolfsbaneEl.textContent = String(stats.wolfsbane);
  trapEl.textContent = String(stats.traps);

  itemSilver.classList.toggle('has-item', stats.silver > 0);
  itemWolfsbane.classList.toggle('has-item', stats.wolfsbane > 0);
  itemTrap.classList.toggle('has-item', stats.traps > 0);

  // Moon phase
  if (stats.hour === 0) {
    moon.classList.add('full');
  } else {
    moon.classList.remove('full');
  }

  // Dawn effect
  if (stats.hour >= 5) {
    gameContainer.classList.add('dawn');
  } else {
    gameContainer.classList.remove('dawn');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    searchBtn.disabled = stats.werewolfAttacking;
    barricadeBtn.disabled = stats.werewolfAttacking;
    attackBtn.disabled = !stats.werewolfAttacking || stats.silver <= 0;
  } else {
    startBtn.style.display = 'block';
    searchBtn.disabled = true;
    barricadeBtn.disabled = true;
    attackBtn.disabled = true;
  }
}

function handleWerewolfState(attacking: boolean) {
  if (attacking) {
    werewolf.classList.remove('hidden');
    werewolf.classList.add('attacking');
    gameContainer.classList.add('under-attack');
  } else {
    werewolf.classList.remove('attacking');
    werewolf.classList.add('hidden');
    gameContainer.classList.remove('under-attack');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnWerewolfState(handleWerewolfState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('under-attack');
    werewolf.classList.add('hidden');
    werewolf.classList.remove('attacking');
    if (win) {
      gameContainer.classList.add('victory');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('dawn', 'victory');
    game.start();
  });

  searchBtn.addEventListener('click', () => game.search());
  barricadeBtn.addEventListener('click', () => game.barricade());
  attackBtn.addEventListener('click', () => game.attack());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyS') game.search();
    if (e.code === 'KeyB') game.barricade();
    if (e.code === 'Space') {
      e.preventDefault();
      game.attack();
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
