import { Game } from './game';
import { translations } from './i18n';

const game = new Game();
let currentLocale: 'en' | 'zh-TW' = 'zh-TW';

// Elements
const possessionBar = document.getElementById('possession-bar')!;
const possessionPercent = document.getElementById('possession-percent')!;
const hostBody = document.getElementById('host-body')!;
const demonShadow = document.getElementById('demon-shadow')!;
const controlPointsContainer = document.getElementById('control-points')!;
const resistBtn = document.getElementById('resist-btn')!;
const resistPrompt = document.getElementById('resist-prompt')!;
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

  possessionBar.style.width = `${stats.possession}%`;
  possessionPercent.textContent = `${Math.floor(stats.possession)}%`;

  // Update demon shadow opacity
  demonShadow.style.opacity = `${stats.possession / 100}`;

  // Update possession class
  hostBody.classList.remove('possessed-low', 'possessed-medium', 'possessed-high', 'possessed-critical', 'game-over', 'victory');
  if (stats.possession < 25) {
    hostBody.classList.add('possessed-low');
  } else if (stats.possession < 50) {
    hostBody.classList.add('possessed-medium');
  } else if (stats.possession < 75) {
    hostBody.classList.add('possessed-high');
  } else {
    hostBody.classList.add('possessed-critical');
  }

  if (stats.isRunning) {
    startBtn.style.display = 'none';
    resistBtn.disabled = false;
    resistPrompt.style.display = 'block';
  } else {
    startBtn.style.display = 'block';
    resistBtn.disabled = true;
    resistPrompt.style.display = 'none';

    if (stats.possession >= 100) {
      hostBody.classList.add('game-over');
    } else if (stats.possession === 0 || statusMsg.textContent?.includes('resist')) {
      hostBody.classList.add('victory');
    }
  }
}

function renderControlPoints(points: { id: number; x: number; y: number; strength: number }[]) {
  controlPointsContainer.innerHTML = '';
  points.forEach(point => {
    const el = document.createElement('div');
    el.className = 'control-point';
    el.style.left = `${point.x}%`;
    el.style.top = `${point.y}%`;
    el.textContent = '👁';
    el.addEventListener('click', () => {
      game.removeControlPoint(point.id);
    });
    controlPointsContainer.appendChild(el);
  });
}

function init() {
  game.setLocale(currentLocale);
  game.setOnStateChange(render);
  game.setOnControlPointsChange(renderControlPoints);
  game.setOnMessage((key) => {
    statusMsg.textContent = t(`game.msgs.${key}`);
    statusMsg.className = `status-msg ${key === 'win' || key === 'resist' || key === 'purge' ? 'success' : 'danger'}`;
  });

  startBtn.addEventListener('click', () => {
    game.start();
  });

  resistBtn.addEventListener('click', () => {
    game.resist();
  });

  // Also allow spacebar to resist
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && game.getStats().isRunning) {
      e.preventDefault();
      game.resist();
    }
  });

  // I18n Init
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  render();
}

init();
