import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const realmDisplay = document.getElementById('realm-display')!;
const realmIcon = realmDisplay.querySelector('.realm-icon')!;
const realmNameEl = document.getElementById('realm-name')!;
const nightmare = document.getElementById('nightmare')!;
const consciousnessBar = document.getElementById('consciousness-bar')!;
const wakeBar = document.getElementById('wake-bar')!;
const powerFly = document.getElementById('power-fly')!;
const powerShield = document.getElementById('power-shield')!;
const powerWake = document.getElementById('power-wake')!;
const navButtons = document.getElementById('nav-buttons')!;
const focusBtn = document.getElementById('focus-btn')!;
const confrontBtn = document.getElementById('confront-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;
const gameContainer = document.querySelector('.game-container')!;

const realmIcons: Record<string, string> = {
  mist: '🌫️',
  mirrors: '🪞',
  falling: '🕳️',
  chase: '🏃',
  teeth: '🦷',
  water: '🌊',
  void: '⚫',
  gate: '🚪'
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
  const realm = game.getCurrentRealm();

  // Stats
  consciousnessBar.style.width = `${stats.consciousness}%`;
  wakeBar.style.width = `${stats.wakeEnergy}%`;

  // Realm info
  if (realm) {
    realmIcon.textContent = realmIcons[realm.id] || '🌀';
    realmNameEl.textContent = game.getRealmName(realm.id);

    // Navigation
    navButtons.innerHTML = '';
    realm.exits.forEach(exitId => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn' + (exitId === 'gate' ? ' wake-gate' : '');
      btn.textContent = game.getRealmName(exitId);
      btn.disabled = !stats.isRunning || stats.nightmareAttacking;
      btn.addEventListener('click', () => game.moveTo(exitId));
      navButtons.appendChild(btn);
    });
  }

  // Power buttons
  powerFly.disabled = !stats.isRunning || stats.consciousness < 20;
  powerShield.disabled = !stats.isRunning || stats.consciousness < 25 || stats.shieldActive;
  powerWake.disabled = !stats.isRunning || stats.consciousness < 50 || stats.wakeEnergy < 50;

  powerShield.classList.toggle('active', stats.shieldActive);

  // States
  if (stats.nightmareAttacking) {
    gameContainer.classList.add('nightmare-attack');
  } else {
    gameContainer.classList.remove('nightmare-attack');
  }

  if (stats.consciousness < 30) {
    gameContainer.classList.add('fading');
  } else {
    gameContainer.classList.remove('fading');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    focusBtn.disabled = stats.nightmareAttacking;
    confrontBtn.disabled = !stats.nightmareAttacking;
  } else {
    startBtn.style.display = 'block';
    focusBtn.disabled = true;
    confrontBtn.disabled = true;
  }
}

function handleNightmareState(attacking: boolean) {
  if (attacking) {
    nightmare.classList.remove('hidden');
    nightmare.classList.add('attacking');
  } else {
    nightmare.classList.remove('attacking');
    nightmare.classList.add('hidden');
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnNightmareState(handleNightmareState);

  game.setOnGameEnd((win) => {
    gameContainer.classList.remove('nightmare-attack', 'fading');
    nightmare.classList.add('hidden');
    nightmare.classList.remove('attacking');
    if (win) {
      gameContainer.classList.add('awakened');
    }
  });

  startBtn.addEventListener('click', () => {
    gameContainer.classList.remove('awakened');
    game.start();
  });

  focusBtn.addEventListener('click', () => game.focus());
  confrontBtn.addEventListener('click', () => game.confront());
  powerFly.addEventListener('click', () => game.usePowerFly());
  powerShield.addEventListener('click', () => game.usePowerShield());
  powerWake.addEventListener('click', () => game.usePowerWake());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'KeyF') game.focus();
    if (e.code === 'KeyC') game.confront();
    if (e.code === 'Digit1') game.usePowerFly();
    if (e.code === 'Digit2') game.usePowerShield();
    if (e.code === 'Digit3') game.usePowerWake();
  });

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
