import { Game } from './game';
import { translations } from './i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const game = new Game(canvas);
let currentLocale: 'en' | 'zh-TW' | 'zh-CN' | 'ja' | 'ko' = 'zh-TW';

// Elements
const healthBar = document.getElementById('health-bar')!;
const staminaBar = document.getElementById('stamina-bar')!;
const lightBar = document.getElementById('light-bar')!;
const distanceEl = document.getElementById('distance')!;
const speedEl = document.getElementById('speed')!;
const chaserEl = document.getElementById('chaser-distance')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const jumpBtn = document.getElementById('jump-btn')!;
const sprintBtn = document.getElementById('sprint-btn')!;
const lightBtn = document.getElementById('light-btn')!;
const gameContainer = document.querySelector('.game-container')!;
const scoreEl = document.getElementById('final-score')!;

// Set canvas size
function resizeCanvas() {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = Math.min(600, rect.width - 40);
  canvas.height = 300;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

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

  // Update bars
  healthBar.style.width = `${stats.health}%`;
  staminaBar.style.width = `${stats.stamina}%`;
  lightBar.style.width = `${stats.lightPower}%`;

  // Update stats
  distanceEl.textContent = `${stats.distance} / 1000`;
  speedEl.textContent = stats.speed;
  chaserEl.textContent = `${stats.chaserDistance}m`;

  // Update button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    jumpBtn.disabled = false;
    lightBtn.disabled = stats.lightPower < 100;
  } else {
    startBtn.style.display = 'block';
    jumpBtn.disabled = true;
    sprintBtn.disabled = true;
    lightBtn.disabled = true;
  }

  // Visual effects
  if (stats.lightActive) {
    gameContainer.classList.add('light-active');
  } else {
    gameContainer.classList.remove('light-active');
  }

  if (stats.chaserDistance < 50) {
    gameContainer.classList.add('danger');
  } else {
    gameContainer.classList.remove('danger');
  }

  if (stats.health < 30) {
    gameContainer.classList.add('low-health');
  } else {
    gameContainer.classList.remove('low-health');
  }

  // Sprint button state
  if (stats.isSprinting) {
    sprintBtn.classList.add('active');
  } else {
    sprintBtn.classList.remove('active');
  }

  // Light button state
  if (stats.lightPower >= 100) {
    lightBtn.classList.add('ready');
  } else {
    lightBtn.classList.remove('ready');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnGameEnd((win, distance) => {
    gameContainer.classList.remove('danger', 'light-active', 'low-health');
    scoreEl.textContent = `${distance}m`;

    if (win) {
      gameContainer.classList.add('victory');
    } else {
      gameContainer.classList.add('defeat');
    }

    setTimeout(() => {
      gameContainer.classList.remove('victory', 'defeat');
    }, 3000);
  });

  // Button events
  startBtn.addEventListener('click', () => {
    game.start();
  });

  jumpBtn.addEventListener('click', () => {
    game.jump();
  });

  let sprintActive = false;
  sprintBtn.addEventListener('mousedown', () => {
    sprintActive = true;
    game.startSprint();
  });

  sprintBtn.addEventListener('mouseup', () => {
    sprintActive = false;
    game.stopSprint();
  });

  sprintBtn.addEventListener('mouseleave', () => {
    if (sprintActive) {
      sprintActive = false;
      game.stopSprint();
    }
  });

  sprintBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sprintActive = true;
    game.startSprint();
  });

  sprintBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    sprintActive = false;
    game.stopSprint();
  });

  lightBtn.addEventListener('click', () => {
    game.useLight();
  });

  // Keyboard controls
  const keysPressed = new Set<string>();

  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;

    const key = e.code;
    if (keysPressed.has(key)) return;
    keysPressed.add(key);

    if (key === 'Space') {
      e.preventDefault();
      game.jump();
    } else if (key === 'ShiftLeft' || key === 'ShiftRight') {
      e.preventDefault();
      game.startSprint();
    } else if (key === 'KeyL') {
      e.preventDefault();
      game.useLight();
    }
  });

  document.addEventListener('keyup', (e) => {
    const key = e.code;
    keysPressed.delete(key);

    if (key === 'ShiftLeft' || key === 'ShiftRight') {
      game.stopSprint();
    }
  });

  // Language switcher
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang') as any;
      currentLocale = lang;
      game.setLocale(lang);
      updateI18n();
    });
  });

  function updateI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
  }

  updateI18n();
  render();
}

init();
