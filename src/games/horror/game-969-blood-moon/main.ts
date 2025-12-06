import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const moon = document.getElementById('moon')!;
const moonPhaseEl = document.getElementById('moon-phase')!;
const werewolf = document.getElementById('werewolf')!;
const healthBar = document.getElementById('health-bar')!;
const curseBar = document.getElementById('curse-bar')!;
const moonBar = document.getElementById('moon-bar')!;
const silverCount = document.getElementById('silver-count')!;
const wolfsbaneCount = document.getElementById('wolfsbane-count')!;
const cureCount = document.getElementById('cure-count')!;
const itemSilver = document.getElementById('item-silver')!;
const itemWolfsbane = document.getElementById('item-wolfsbane')!;
const itemCure = document.getElementById('item-cure')!;
const villagerCountEl = document.getElementById('villager-count')!;
const villagersIcons = document.getElementById('villagers-icons')!;
const huntBtn = document.getElementById('hunt-btn')!;
const protectBtn = document.getElementById('protect-btn')!;
const cureBtn = document.getElementById('cure-btn')!;
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

  // Bars
  healthBar.style.width = `${stats.health}%`;
  curseBar.style.width = `${stats.curse}%`;
  moonBar.style.width = `${stats.moonPower}%`;

  // Bar states
  if (stats.curse > 60) {
    curseBar.classList.add('high');
  } else {
    curseBar.classList.remove('high');
  }

  if (stats.moonPhase === 'blood') {
    moonBar.classList.add('blood-moon');
    moon.classList.add('blood');
    gameContainer.classList.add('blood-moon-active');
  } else {
    moonBar.classList.remove('blood-moon');
    moon.classList.remove('blood');
    gameContainer.classList.remove('blood-moon-active');
  }

  // Moon
  moon.textContent = game.getMoonEmoji();
  moonPhaseEl.textContent = game.getMoonPhaseName();

  // Items
  silverCount.textContent = String(stats.silver);
  wolfsbaneCount.textContent = String(stats.wolfsbane);
  cureCount.textContent = String(stats.cures);

  itemSilver.classList.toggle('has-item', stats.silver > 0);
  itemWolfsbane.classList.toggle('has-item', stats.wolfsbane > 0);
  itemCure.classList.toggle('has-item', stats.cures > 0);

  // Villagers
  villagerCountEl.textContent = String(stats.villagersAlive);

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    huntBtn.disabled = stats.wolfState === 'defeated';
    protectBtn.disabled = false;
    cureBtn.disabled = stats.wolfsbane <= 0 && stats.cures <= 0;
  } else {
    startBtn.style.display = 'block';
    huntBtn.disabled = true;
    protectBtn.disabled = true;
    cureBtn.disabled = true;
  }
}

function handleWolfState(state: string) {
  werewolf.className = 'werewolf';

  if (state === 'hidden') {
    werewolf.classList.add('hidden');
  } else if (state === 'prowling') {
    werewolf.classList.add('prowling');
  } else if (state === 'attacking') {
    werewolf.classList.add('attacking');
  } else if (state === 'defeated') {
    werewolf.classList.add('defeated');
  }
}

function handleVillagerDeath(remaining: number) {
  const villagers = villagersIcons.querySelectorAll('.villager');
  villagers.forEach((v, i) => {
    if (i >= remaining) {
      v.classList.add('dead');
    }
  });
}

function resetVillagers() {
  const villagers = villagersIcons.querySelectorAll('.villager');
  villagers.forEach(v => v.classList.remove('dead'));
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnWolfState(handleWolfState);
  game.setOnVillagerDeath(handleVillagerDeath);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('blood-moon-active');
    if (win) {
      gameContainer.classList.add('victory');
    } else {
      gameContainer.classList.add('defeat');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('victory', 'defeat');
    resetVillagers();
    game.start();
  });

  huntBtn.addEventListener('click', () => game.hunt());
  protectBtn.addEventListener('click', () => game.protect());
  cureBtn.addEventListener('click', () => game.cure());

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyH') game.hunt();
    if (e.code === 'KeyP') game.protect();
    if (e.code === 'KeyC') game.cure();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
