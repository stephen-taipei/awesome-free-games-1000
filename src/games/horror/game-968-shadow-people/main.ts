import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const lightSource = document.getElementById('light-source')!;
const sanityBar = document.getElementById('sanity-bar')!;
const lightBar = document.getElementById('light-bar')!;
const shadowCount = document.getElementById('shadow-count')!;
const timeDisplay = document.getElementById('time-display')!;
const lookTL = document.getElementById('look-tl')!;
const lookTR = document.getElementById('look-tr')!;
const lookBL = document.getElementById('look-bl')!;
const lookBR = document.getElementById('look-br')!;
const lightBtn = document.getElementById('light-btn')!;
const closeBtn = document.getElementById('close-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const corners: Record<string, HTMLElement> = {
  tl: document.getElementById('corner-tl')!,
  tr: document.getElementById('corner-tr')!,
  bl: document.getElementById('corner-bl')!,
  br: document.getElementById('corner-br')!
};

const lookButtons: Record<string, HTMLElement> = {
  tl: lookTL,
  tr: lookTR,
  bl: lookBL,
  br: lookBR
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
  lightBar.style.width = `${stats.light}%`;

  // Bar states
  if (stats.sanity < 30) {
    sanityBar.classList.add('low');
  } else {
    sanityBar.classList.remove('low');
  }

  if (stats.light < 30) {
    lightBar.classList.add('low');
  } else {
    lightBar.classList.remove('low');
  }

  // Shadow count
  shadowCount.textContent = String(stats.shadowCount);

  // Time
  timeDisplay.textContent = game.getTimeDisplay();

  // Light state
  if (stats.lightsOn) {
    gameContainer.classList.add('lights-on');
    lightSource.classList.add('on');
  } else {
    gameContainer.classList.remove('lights-on');
    lightSource.classList.remove('on');
  }

  // Eyes closed state
  if (stats.eyesClosed) {
    gameContainer.classList.add('eyes-closed');
  } else {
    gameContainer.classList.remove('eyes-closed');
  }

  // Looking buttons
  Object.entries(lookButtons).forEach(([corner, btn]) => {
    if (stats.lookingAt === corner) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Danger mode
  if (stats.shadowCount >= 3) {
    gameContainer.classList.add('danger-mode');
  } else {
    gameContainer.classList.remove('danger-mode');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    lookTL.disabled = stats.eyesClosed;
    lookTR.disabled = stats.eyesClosed;
    lookBL.disabled = stats.eyesClosed;
    lookBR.disabled = stats.eyesClosed;
    lightBtn.disabled = stats.light <= 0;
    closeBtn.disabled = false;
  } else {
    startBtn.style.display = 'block';
    lookTL.disabled = true;
    lookTR.disabled = true;
    lookBL.disabled = true;
    lookBR.disabled = true;
    lightBtn.disabled = true;
    closeBtn.disabled = true;
  }
}

function handleCornerChange(corner: string, state: 'empty' | 'shadow' | 'looking' | 'attacking') {
  const el = corners[corner];
  if (!el) return;

  el.classList.remove('has-shadow', 'looking', 'attacking');

  if (state === 'shadow') {
    el.classList.add('has-shadow');
  } else if (state === 'looking') {
    el.classList.add('looking');
  } else if (state === 'attacking') {
    el.classList.add('has-shadow', 'attacking');
  }
}

function handleLightChange(on: boolean) {
  if (on) {
    lightSource.classList.add('on');
  } else {
    lightSource.classList.remove('on');
  }
}

function resetCorners() {
  Object.values(corners).forEach(el => {
    el.classList.remove('has-shadow', 'looking', 'attacking');
  });
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnCornerChange(handleCornerChange);
  game.setOnLightChange(handleLightChange);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('danger-mode', 'lights-on', 'eyes-closed');
    if (win) {
      gameContainer.classList.add('survived');
    } else {
      gameContainer.classList.add('consumed');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('survived', 'consumed');
    resetCorners();
    game.start();
  });

  lookTL.addEventListener('click', () => game.lookAt('tl'));
  lookTR.addEventListener('click', () => game.lookAt('tr'));
  lookBL.addEventListener('click', () => game.lookAt('bl'));
  lookBR.addEventListener('click', () => game.lookAt('br'));
  lightBtn.addEventListener('click', () => game.toggleLight());
  closeBtn.addEventListener('click', () => game.closeEyes());

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyQ') game.lookAt('tl');
    if (e.code === 'KeyW') game.lookAt('tr');
    if (e.code === 'KeyA') game.lookAt('bl');
    if (e.code === 'KeyS') game.lookAt('br');
    if (e.code === 'KeyL') game.toggleLight();
    if (e.code === 'KeyC') game.closeEyes();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
