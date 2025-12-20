import { FactoryEscapeGame } from './game';
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

let game: FactoryEscapeGame;
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

  // Background - dark factory
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // Background pipes
  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 50 + i * 60);
    ctx.lineTo(width, 50 + i * 60);
    ctx.stroke();
  }

  // Ground - metal floor
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, state.groundY, width, height - state.groundY);
  ctx.fillStyle = '#5a5a5a';
  for (let i = 0; i < width / 40; i++) {
    ctx.fillRect(i * 40, state.groundY, 2, height - state.groundY);
  }

  // Collectibles
  for (const col of state.collectibles) {
    if (col.collected) continue;
    ctx.fillStyle = col.type === 'bolt' ? '#bdc3c7' : col.type === 'gear' ? '#f39c12' : '#27ae60';
    if (col.type === 'gear') {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? 12 : 8;
        const x = col.x + Math.cos(angle) * r;
        const y = col.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(col.x, col.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Obstacles
  for (const obs of state.obstacles) {
    switch (obs.type) {
      case 'crate':
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#5d3a1a';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x + 5, obs.y + 5, obs.width - 10, obs.height - 10);
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.moveTo(obs.x + obs.width, obs.y);
        ctx.lineTo(obs.x, obs.y + obs.height);
        ctx.stroke();
        break;
      case 'machine':
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(obs.x + 10, obs.y + 10, 15, 15);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(obs.x + 35, obs.y + 10, 15, 15);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(obs.x + 5, obs.y + 40, obs.width - 10, 30);
        break;
      case 'pipe':
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(obs.x, obs.y, obs.width, 8);
        ctx.fillRect(obs.x, obs.y + obs.height - 8, obs.width, 8);
        break;
      case 'gear':
        ctx.fillStyle = '#f39c12';
        ctx.save();
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
        ctx.rotate(Date.now() / 500);
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const r = i % 2 === 0 ? 30 : 20;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      case 'steam':
        ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
        for (let i = 0; i < 5; i++) {
          const offset = Math.sin(Date.now() / 200 + i) * 10;
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2 + offset, obs.y + obs.height - i * 40, 25 - i * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  }

  // Player (worker)
  const p = state.player;
  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

  if (p.isSliding) {
    // Sliding pose
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-p.width / 2, -5, p.width, 15);
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(p.width / 3, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(-p.width / 2 + 5, -10, p.width - 10, 5);
  } else {
    // Standing pose
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-p.width / 3, -5, p.width * 2 / 3, p.height / 2 + 5);
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, -p.height / 4, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(-12, -p.height / 4 - 12, 24, 8);
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

game = new FactoryEscapeGame();
initI18n();
resize();
setupInput();
draw();
