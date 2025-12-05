import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const survivorsCount = document.getElementById('survivors-count')!;
const aliensCount = document.getElementById('aliens-count')!;
const waveCount = document.getElementById('wave-count')!;
const ammoBar = document.querySelector('.ammo-bar')!;
const barrierFill = document.getElementById('barrier-fill')!;
const radarScreen = document.getElementById('radar-screen')!;
const blipsContainer = document.getElementById('blips-container')!;
const shootBtn = document.getElementById('shoot-btn')!;
const reloadBtn = document.getElementById('reload-btn')!;
const barrierBtn = document.getElementById('barrier-btn')!;
const statusMsg = document.getElementById('status-msg')!;
const startBtn = document.getElementById('start-btn')!;

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

  survivorsCount.textContent = String(stats.survivors);
  aliensCount.textContent = String(stats.alienCount);
  waveCount.textContent = String(stats.wave);

  // Ammo display
  ammoBar.innerHTML = '';
  for (let i = 0; i < stats.maxAmmo; i++) {
    const bullet = document.createElement('div');
    bullet.className = 'ammo-fill';
    bullet.style.opacity = i < stats.ammo ? '1' : '0.2';
    ammoBar.appendChild(bullet);
  }

  // Barrier
  barrierFill.style.width = `${stats.barrier}%`;

  // Alert state
  if (stats.alienCount > 0) {
    radarScreen.classList.add('under-attack');
  } else {
    radarScreen.classList.remove('under-attack');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    shootBtn.disabled = stats.ammo <= 0;
    reloadBtn.disabled = stats.ammo >= stats.maxAmmo;
    barrierBtn.disabled = stats.barrier >= 100;
  } else {
    startBtn.style.display = 'block';
    shootBtn.disabled = true;
    reloadBtn.disabled = true;
    barrierBtn.disabled = true;
  }
}

function updateAliens(aliens: { id: number; x: number; y: number }[]) {
  blipsContainer.innerHTML = '';

  aliens.forEach(alien => {
    const blip = document.createElement('div');
    blip.className = 'blip';
    blip.id = `alien-${alien.id}`;
    blip.style.left = `${alien.x}%`;
    blip.style.top = `${alien.y}%`;
    blip.addEventListener('click', () => game.shoot());
    blipsContainer.appendChild(blip);
  });
}

function handleAlienHit(id: number) {
  const blip = document.getElementById(`alien-${id}`);
  if (blip) {
    blip.classList.add('hit');
    setTimeout(() => blip.remove(), 300);
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnAliensUpdate(updateAliens);
  game.setOnAlienHit(handleAlienHit);

  game.setOnGameEnd((win) => {
    if (win) {
      radarScreen.classList.add('wave-complete');
    }
  });

  startBtn.addEventListener('click', () => {
    radarScreen.classList.remove('wave-complete');
    blipsContainer.innerHTML = '';
    game.start();
  });

  shootBtn.addEventListener('click', () => game.shoot());
  reloadBtn.addEventListener('click', () => game.reload());
  barrierBtn.addEventListener('click', () => game.reinforceBarrier());

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!game.getStats().isRunning) return;
    if (e.code === 'Space') {
      e.preventDefault();
      game.shoot();
    } else if (e.code === 'KeyR') {
      game.reload();
    } else if (e.code === 'KeyB') {
      game.reinforceBarrier();
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
