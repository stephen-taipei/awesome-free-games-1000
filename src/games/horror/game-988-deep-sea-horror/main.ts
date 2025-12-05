import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const depthValue = document.getElementById('depth-value')!;
const powerBar = document.getElementById('power-bar')!;
const hullBar = document.getElementById('hull-bar')!;
const oxygenBar = document.getElementById('oxygen-bar')!;
const submarineView = document.getElementById('submarine-view')!;
const creatureShadow = document.getElementById('creature-shadow')!;
const sonarPing = document.getElementById('sonar-ping')!;
const bubblesContainer = document.getElementById('bubbles')!;
const particlesContainer = document.getElementById('depth-particles')!;
const descendBtn = document.getElementById('descend-btn')!;
const ascendBtn = document.getElementById('ascend-btn')!;
const lightsBtn = document.getElementById('lights-btn')!;
const sonarBtn = document.getElementById('sonar-btn')!;
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

function createBubbles() {
  bubblesContainer.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.animationDelay = `${Math.random() * 3}s`;
    bubblesContainer.appendChild(bubble);
  }
}

function createParticles() {
  particlesContainer.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 4}s`;
    particlesContainer.appendChild(particle);
  }
}

function render() {
  const stats = game.getStats();

  depthValue.textContent = `${stats.depth}m`;
  powerBar.style.width = `${stats.power}%`;
  hullBar.style.width = `${stats.hull}%`;
  oxygenBar.style.width = `${stats.oxygen}%`;

  // Lights state
  if (stats.lightsOn) {
    submarineView.classList.remove('lights-off');
    lightsBtn.classList.add('active');
  } else {
    submarineView.classList.add('lights-off');
    lightsBtn.classList.remove('active');
  }

  // Depth effects
  if (stats.depth > 2000) {
    submarineView.classList.add('very-deep');
  } else {
    submarineView.classList.remove('very-deep');
  }

  // Creature nearby
  if (stats.creatureDistance < 50) {
    submarineView.classList.add('creature-near');
  } else {
    submarineView.classList.remove('creature-near');
  }

  // Button states
  if (stats.isRunning) {
    startBtn.style.display = 'none';
    descendBtn.disabled = stats.depth >= 3000;
    ascendBtn.disabled = stats.depth <= 0;
    lightsBtn.disabled = false;
    sonarBtn.disabled = stats.power < 5;
  } else {
    startBtn.style.display = 'block';
    descendBtn.disabled = true;
    ascendBtn.disabled = true;
    lightsBtn.disabled = true;
    sonarBtn.disabled = true;
  }
}

function handleCreatureEvent(type: string) {
  if (type === 'close' || type === 'attack') {
    creatureShadow.classList.remove('hidden');
    creatureShadow.classList.add('visible');
    setTimeout(() => {
      creatureShadow.classList.remove('visible');
      creatureShadow.classList.add('hidden');
    }, 3000);
  }

  if (type === 'sonar') {
    sonarPing.classList.add('active');
    setTimeout(() => sonarPing.classList.remove('active'), 2000);
  }
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);

  game.setOnMessage((msg, type) => {
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
  });

  game.setOnCreatureEvent(handleCreatureEvent);

  createBubbles();
  createParticles();

  startBtn.addEventListener('click', () => {
    game.start();
  });

  descendBtn.addEventListener('click', () => game.descend());
  ascendBtn.addEventListener('click', () => game.ascend());
  lightsBtn.addEventListener('click', () => game.toggleLights());
  sonarBtn.addEventListener('click', () => game.sonarPing());

  // I18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
