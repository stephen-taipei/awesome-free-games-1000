import { LabEscapeGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const distanceDisplay = document.getElementById('distance-display')!;
const highDisplay = document.getElementById('high-display')!;
const shieldBar = document.getElementById('shield-bar')!;
const shieldFill = document.getElementById('shield-fill')!;
const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;

let game: LabEscapeGame;
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

  // Background - lab environment
  ctx.fillStyle = '#ecf0f1';
  ctx.fillRect(0, 0, width, height);

  // Grid pattern
  ctx.strokeStyle = '#bdc3c7';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Ground - lab floor
  ctx.fillStyle = '#95a5a6';
  ctx.fillRect(0, state.groundY, width, height - state.groundY);
  ctx.fillStyle = '#7f8c8d';
  for (let i = 0; i < width / 60; i++) {
    ctx.fillRect(i * 60, state.groundY, 30, height - state.groundY);
  }

  // Collectibles
  for (const col of state.collectibles) {
    if (col.collected) continue;
    if (col.type === 'serum') {
      ctx.fillStyle = '#9b59b6';
      ctx.fillRect(col.x - 6, col.y - 15, 12, 20);
      ctx.fillStyle = '#8e44ad';
      ctx.fillRect(col.x - 4, col.y - 18, 8, 5);
    } else if (col.type === 'data') {
      ctx.fillStyle = '#3498db';
      ctx.fillRect(col.x - 10, col.y - 8, 20, 16);
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(col.x - 8, col.y - 6, 16, 4);
      ctx.fillRect(col.x - 8, col.y + 2, 12, 4);
    } else {
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(col.x, col.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(col.x - 2, col.y - 8, 4, 16);
      ctx.fillRect(col.x - 8, col.y - 2, 16, 4);
    }
  }

  // Obstacles
  for (const obs of state.obstacles) {
    switch (obs.type) {
      case 'laser':
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
        ctx.fillRect(obs.x, obs.y - 5, obs.width, obs.height + 10);
        break;
      case 'chemical':
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(obs.x, obs.y + 20, obs.width, obs.height - 20);
        ctx.fillStyle = '#2ecc71';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(obs.x + 10 + i * 10, obs.y + 15 - i * 5, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#1abc9c';
        ctx.fillRect(obs.x + 5, obs.y + 25, obs.width - 10, 5);
        break;
      case 'robot':
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(obs.x, obs.y + 20, obs.width, obs.height - 20);
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + 15, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2 - 5, obs.y + 12, 4, 0, Math.PI * 2);
        ctx.arc(obs.x + obs.width / 2 + 5, obs.y + 12, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'electricity':
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        let y = obs.y;
        ctx.moveTo(obs.x + obs.width / 2, y);
        while (y < obs.y + obs.height) {
          const nextY = Math.min(y + 20, obs.y + obs.height);
          const offsetX = (Math.random() - 0.5) * 15;
          ctx.lineTo(obs.x + obs.width / 2 + offsetX, nextY);
          y = nextY;
        }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
        ctx.lineWidth = 8;
        ctx.stroke();
        break;
      case 'gas':
        ctx.fillStyle = 'rgba(155, 89, 182, 0.4)';
        for (let i = 0; i < 6; i++) {
          const offset = Math.sin(Date.now() / 300 + i) * 15;
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2 + offset, obs.y + obs.height - i * 50, 30 - i * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  }

  // Player (scientist)
  const p = state.player;
  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

  // Shield effect
  if (p.shield > 0) {
    ctx.strokeStyle = `rgba(39, 174, 96, ${0.5 + Math.sin(Date.now() / 100) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.width, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (p.isSliding) {
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(-p.width / 2, -5, p.width, 15);
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(p.width / 3, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Lab coat
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(-p.width / 3, -5, p.width * 2 / 3, p.height / 2 + 5);
    // Head
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, -p.height / 4, 10, 0, Math.PI * 2);
    ctx.fill();
    // Glasses
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-5, -p.height / 4, 5, 0, Math.PI * 2);
    ctx.arc(5, -p.height / 4, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -p.height / 4);
    ctx.lineTo(-15, -p.height / 4 - 3);
    ctx.moveTo(10, -p.height / 4);
    ctx.lineTo(15, -p.height / 4 - 3);
    ctx.stroke();
    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-6, p.height / 4, 5, 12);
    ctx.fillRect(1, p.height / 4, 5, 12);
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

  // Update shield bar
  if (state.player.shield > 0) {
    shieldBar.style.display = 'block';
    shieldFill.style.width = `${(state.player.shield / 3) * 100}%`;
  } else {
    shieldBar.style.display = 'none';
  }

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
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') {
      game.slide(false);
    }
  });

  const jumpBtn = document.getElementById('mobile-jump');
  const slideBtn = document.getElementById('mobile-slide');

  jumpBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.jump(); });
  slideBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.slide(true); });
  slideBtn?.addEventListener('touchend', () => game.slide(false));
}

startBtn.addEventListener('click', () => {
  hideOverlay();
  game.start();
  cancelAnimationFrame(animationId);
  gameLoop();
});

window.addEventListener('resize', resize);

game = new LabEscapeGame();
initI18n();
resize();
setupInput();
draw();
