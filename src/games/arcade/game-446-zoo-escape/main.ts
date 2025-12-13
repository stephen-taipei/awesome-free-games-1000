import { ZooEscapeGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const distanceDisplay = document.getElementById('distance-display')!;
const highDisplay = document.getElementById('high-display')!;
const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;

let game: ZooEscapeGame;
let animationId: number;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });
  const lang = navigator.language;
  if (lang.includes('zh')) i18n.setLocale('zh-TW');
  else if (lang.includes('ja')) i18n.setLocale('ja');
  else i18n.setLocale('en');
  languageSelect.value = i18n.getLocale();
  updateTexts();
  languageSelect.addEventListener('change', () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateTexts();
  });
}

function updateTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = i18n.t(key);
  });
}

function resize() {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width;
  const height = Math.min(rect.width * 0.6, 400);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);
  game.setCanvasSize(width, height);
}

function draw() {
  const state = game.getState();
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  // Sky
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, width, height);

  // Ground
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(0, state.groundY, width, height - state.groundY);
  ctx.fillStyle = '#228b22';
  ctx.fillRect(0, state.groundY - 10, width, 10);

  // Collectibles
  for (const col of state.collectibles) {
    if (col.collected) continue;
    ctx.fillStyle = col.type === 'banana' ? '#ffe135' : col.type === 'peanut' ? '#d2691e' : '#228b22';
    ctx.beginPath();
    ctx.arc(col.x, col.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(col.type === 'banana' ? '🍌' : col.type === 'peanut' ? '🥜' : '🌿', col.x, col.y + 4);
  }

  // Obstacles
  for (const obs of state.obstacles) {
    switch (obs.type) {
      case 'cage':
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(obs.x + 10 + i * 12, obs.y);
          ctx.lineTo(obs.x + 10 + i * 12, obs.y + obs.height);
          ctx.stroke();
        }
        break;
      case 'zookeeper':
        ctx.fillStyle = '#2e8b57';
        ctx.fillRect(obs.x, obs.y + 20, obs.width, obs.height - 20);
        ctx.fillStyle = '#ffeaa7';
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + 15, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(obs.x + obs.width / 2 - 10, obs.y, 20, 8);
        break;
      case 'fence':
        ctx.fillStyle = '#deb887';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(obs.x, obs.y, 5, obs.height);
        ctx.fillRect(obs.x + obs.width - 5, obs.y, 5, obs.height);
        break;
      case 'tree':
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(obs.x + 15, obs.y + 50, 10, 50);
        ctx.fillStyle = '#228b22';
        ctx.beginPath();
        ctx.arc(obs.x + 20, obs.y + 30, 30, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  // Player (animal)
  const p = state.player;
  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

  switch (p.animal) {
    case 'monkey':
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffeaa7';
      ctx.beginPath();
      ctx.ellipse(0, 5, p.width / 3, p.height / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(-8, -5, 4, 0, Math.PI * 2);
      ctx.arc(8, -5, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'elephant':
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.width / 2, p.height / 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(p.width / 2, 5, 8, 15, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(-5, -5, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'giraffe':
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(-p.width / 4, -p.height / 2, p.width / 2, p.height);
      ctx.fillStyle = '#8b4513';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-p.width / 4 + 5 + i * 8, -p.height / 2 + 10 + i * 12, 6, 6);
      }
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(-3, -p.height / 2 + 8, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function gameLoop() {
  game.update();
  draw();

  const state = game.getState();
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = `${Math.floor(state.distance)}m`;
  highDisplay.textContent = state.highScore.toString();

  if (state.phase === 'gameOver') {
    showOverlay(i18n.t('game.over'), `${i18n.t('game.score')}: ${state.score}`, i18n.t('game.restart'));
  }

  if (state.phase === 'playing') {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function showOverlay(title: string, msg: string, btn: string) {
  overlay.style.display = 'flex';
  overlayTitle.textContent = title;
  overlayMsg.textContent = msg;
  startBtn.textContent = btn;
}

function hideOverlay() {
  overlay.style.display = 'none';
}

function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (game.getState().phase === 'playing') {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        game.jump();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        game.slide(true);
      } else if (e.code === 'KeyX') {
        e.preventDefault();
        game.switchAnimal();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') {
      game.slide(false);
    }
  });

  // Mobile controls
  const jumpBtn = document.getElementById('mobile-jump');
  const slideBtn = document.getElementById('mobile-slide');
  const switchBtn = document.getElementById('mobile-switch');

  jumpBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.jump(); });
  slideBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.slide(true); });
  slideBtn?.addEventListener('touchend', () => game.slide(false));
  switchBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.switchAnimal(); });
}

startBtn.addEventListener('click', () => {
  hideOverlay();
  game.start();
  cancelAnimationFrame(animationId);
  gameLoop();
});

window.addEventListener('resize', resize);

game = new ZooEscapeGame();
initI18n();
resize();
setupInput();
draw();
