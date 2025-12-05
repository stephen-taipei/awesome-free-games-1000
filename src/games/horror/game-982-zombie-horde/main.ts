import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const waveNum = document.getElementById('wave-num')!;
const killCount = document.getElementById('kill-count')!;
const timeLeft = document.getElementById('time-left')!;
const zombieLane = document.getElementById('zombie-lane')!;
const player = document.getElementById('player')!;
const barricadeHealth = document.getElementById('barricade-health')!;
const healthBar = document.getElementById('health-bar')!;
const staminaBar = document.getElementById('stamina-bar')!;
const ammoPistol = document.getElementById('ammo-pistol')!;
const ammoShotgun = document.getElementById('ammo-shotgun')!;
const ammoGrenade = document.getElementById('ammo-grenade')!;
const shootBtn = document.getElementById('shoot-btn')!;
const reloadBtn = document.getElementById('reload-btn')!;
const repairBtn = document.getElementById('repair-btn')!;
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

  waveNum.textContent = String(stats.wave);
  killCount.textContent = String(stats.kills);
  timeLeft.textContent = String(stats.timeLeft);

  healthBar.style.width = `${stats.health}%`;
  staminaBar.style.width = `${stats.stamina}%`;
  barricadeHealth.style.width = `${stats.barricade}%`;

  ammoShotgun.textContent = String(stats.shotgunAmmo);
  ammoGrenade.textContent = String(stats.grenadeAmmo);

  // Barricade danger state
  if (stats.barricade <= 0) {
    gameContainer.classList.add('breach');
  } else {
    gameContainer.classList.remove('breach');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    shootBtn.disabled = stats.stamina < 5;
    repairBtn.disabled = stats.stamina < 20;
    reloadBtn.disabled = false;
  } else {
    startBtn.style.display = 'block';
    shootBtn.disabled = true;
    repairBtn.disabled = true;
    reloadBtn.disabled = true;
  }
}

function renderZombies(zombies: any[]) {
  zombieLane.innerHTML = '';

  zombies.forEach(zombie => {
    const el = document.createElement('div');
    el.className = 'zombie' + (zombie.dead ? ' dead' : '');
    el.textContent = '🧟';
    el.style.left = `${zombie.x}%`;
    el.style.top = `${zombie.y}%`;
    el.dataset.id = String(zombie.id);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = zombieLane.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      game.shoot(x, y);
    });

    zombieLane.appendChild(el);
  });
}

function handleShoot() {
  player.classList.add('shooting');
  setTimeout(() => player.classList.remove('shooting'), 100);

  // Muzzle flash
  const flash = document.createElement('div');
  flash.className = 'muzzle-flash';
  flash.textContent = '💥';
  document.querySelector('.battlefield')!.appendChild(flash);
  setTimeout(() => flash.remove(), 100);
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnZombieUpdate(renderZombies);
  game.setOnShoot(handleShoot);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('breach');
    if (win) {
      gameContainer.classList.add('victory');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('victory');
    game.start();
  });

  shootBtn.addEventListener('click', () => game.shoot());
  reloadBtn.addEventListener('click', () => game.reload());
  repairBtn.addEventListener('click', () => game.repair());

  // Click on battlefield to shoot
  zombieLane.addEventListener('click', (e) => {
    const rect = zombieLane.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    game.shoot(x, y);
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'Space') {
      e.preventDefault();
      game.shoot();
    }
    if (e.code === 'KeyR') game.repair();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
