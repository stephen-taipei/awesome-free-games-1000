import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const sceneIcon = document.getElementById('scene-icon')!;
const sceneName = document.getElementById('scene-name')!;
const creature = document.getElementById('creature')!;
const healthBar = document.getElementById('health-bar')!;
const fireBar = document.getElementById('fire-bar')!;
const trustBar = document.getElementById('trust-bar')!;
const companionsList = document.getElementById('companions-list')!;
const watchBtn = document.getElementById('watch-btn')!;
const fireBtn = document.getElementById('fire-btn')!;
const verifyBtn = document.getElementById('verify-btn')!;
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
  fireBar.style.width = `${stats.fire}%`;
  trustBar.style.width = `${stats.trust}%`;

  // Fire low state
  if (stats.fire < 30) {
    fireBar.classList.add('low');
    sceneIcon.textContent = '🌑';
  } else {
    fireBar.classList.remove('low');
    sceneIcon.textContent = '🔥';
  }

  // Update companions
  const companionEls = companionsList.querySelectorAll('.companion');
  companionEls.forEach(el => {
    const id = el.getAttribute('data-id');
    if (id === stats.selectedCompanion) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });

  // Danger mode
  if (stats.underAttack || stats.creatureNear) {
    gameContainer.classList.add('danger-mode');
  } else {
    gameContainer.classList.remove('danger-mode');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    watchBtn.disabled = false;
    fireBtn.disabled = false;
    verifyBtn.disabled = !stats.selectedCompanion;
  } else {
    startBtn.style.display = 'block';
    watchBtn.disabled = true;
    fireBtn.disabled = true;
    verifyBtn.disabled = true;
  }
}

function handleCreatureState(state: 'hidden' | 'watching' | 'attacking') {
  creature.className = 'creature';

  if (state === 'hidden') {
    creature.classList.add('hidden');
  } else if (state === 'watching') {
    creature.classList.add('watching');
    // Random position
    const positions = [
      { top: '20%', left: '10%' },
      { top: '30%', right: '10%', left: 'auto' },
      { top: '60%', left: '5%' },
      { top: '50%', right: '5%', left: 'auto' }
    ];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    Object.assign(creature.style, { top: pos.top, left: pos.left || '', right: (pos as any).right || '' });
  } else if (state === 'attacking') {
    creature.classList.add('attacking');
    creature.style.top = '40%';
    creature.style.left = '50%';
    creature.style.transform = 'translate(-50%, -50%)';
  }
}

function handleCompanionChange(id: string, state: 'alive' | 'dead' | 'impostor') {
  const el = companionsList.querySelector(`[data-id="${id}"]`);
  if (!el) return;

  el.classList.remove('dead', 'impostor');
  if (state === 'dead') {
    el.classList.add('dead');
  } else if (state === 'impostor') {
    el.classList.add('impostor');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnCreatureState(handleCreatureState);
  game.setOnCompanionChange(handleCompanionChange);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('danger-mode');
    if (win) {
      gameContainer.classList.add('victory');
      sceneIcon.textContent = '🌅';
    } else {
      gameContainer.classList.add('defeat');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('victory', 'defeat');
    // Reset companions
    companionsList.querySelectorAll('.companion').forEach(el => {
      el.classList.remove('dead', 'impostor', 'selected');
    });
    game.start();
  });

  watchBtn.addEventListener('click', () => game.watch());
  fireBtn.addEventListener('click', () => game.addFire());
  verifyBtn.addEventListener('click', () => game.verify());

  // Companion selection
  companionsList.querySelectorAll('.companion').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      if (id) game.selectCompanion(id);
    });
  });

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyW') game.watch();
    if (e.code === 'KeyF') game.addFire();
    if (e.code === 'KeyV') game.verify();
    if (e.code === 'Digit1') game.selectCompanion('elder');
    if (e.code === 'Digit2') game.selectCompanion('hunter');
    if (e.code === 'Digit3') game.selectCompanion('child');
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
