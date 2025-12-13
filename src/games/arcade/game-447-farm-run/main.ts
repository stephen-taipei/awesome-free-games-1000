import { FarmRunGame } from './game';
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

let game: FarmRunGame;
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

  // Ground with lanes
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(0, state.groundY, width, height - state.groundY);

  // Lane markers
  ctx.fillStyle = '#654321';
  for (let i = 0; i < 4; i++) {
    const x = state.lanePositions[0] - 40 + i * 80;
    ctx.fillRect(x, state.groundY, 2, height - state.groundY);
  }

  // Grass
  ctx.fillStyle = '#228b22';
  ctx.fillRect(0, state.groundY - 8, width, 8);

  // Collectibles
  for (const col of state.collectibles) {
    if (col.collected) continue;
    const emoji = col.type === 'corn' ? '🌽' : col.type === 'carrot' ? '🥕' : '🥚';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, col.x, col.y + 8);
  }

  // Obstacles
  for (const obs of state.obstacles) {
    switch (obs.type) {
      case 'haybale':
        ctx.fillStyle = '#daa520';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + 10 + i * 15);
          ctx.lineTo(obs.x + obs.width, obs.y + 10 + i * 15);
          ctx.stroke();
        }
        break;
      case 'tractor':
        ctx.fillStyle = '#dc143c';
        ctx.fillRect(obs.x + 10, obs.y, obs.width - 20, obs.height - 20);
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(obs.x + 15, obs.y + obs.height - 10, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(obs.x + obs.width - 15, obs.y + obs.height - 10, 15, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'fence':
        ctx.fillStyle = '#deb887';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(obs.x + 5, obs.y, 5, obs.height);
        ctx.fillRect(obs.x + obs.width - 10, obs.y, 5, obs.height);
        ctx.fillRect(obs.x, obs.y + 10, obs.width, 5);
        break;
      case 'cow':
        ctx.fillStyle = '#f5f5f5';
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2 - 10, obs.y + 15, 5, 0, Math.PI * 2);
        ctx.arc(obs.x + obs.width / 2 + 10, obs.y + 15, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffc0cb';
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.width / 2, obs.y + 25, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  // Player (farmer)
  const p = state.player;
  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

  // Body
  ctx.fillStyle = '#2e8b57';
  ctx.fillRect(-p.width / 3, -5, p.width * 2 / 3, p.height / 2 + 5);

  // Head
  ctx.fillStyle = '#ffeaa7';
  ctx.beginPath();
  ctx.arc(0, -p.height / 4, 12, 0, Math.PI * 2);
  ctx.fill();

  // Hat
  ctx.fillStyle = '#daa520';
  ctx.fillRect(-15, -p.height / 4 - 15, 30, 8);
  ctx.fillRect(-10, -p.height / 4 - 22, 20, 10);

  // Legs
  ctx.fillStyle = '#4169e1';
  ctx.fillRect(-8, p.height / 4, 6, 15);
  ctx.fillRect(2, p.height / 4, 6, 15);

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
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        game.moveLeft();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        game.moveRight();
      }
    }
  });

  const jumpBtn = document.getElementById('mobile-jump');
  const leftBtn = document.getElementById('mobile-left');
  const rightBtn = document.getElementById('mobile-right');

  jumpBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.jump(); });
  leftBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.moveRight(); });
}

startBtn.addEventListener('click', () => {
  hideOverlay();
  game.start();
  cancelAnimationFrame(animationId);
  gameLoop();
});

window.addEventListener('resize', resize);

game = new FarmRunGame();
initI18n();
resize();
setupInput();
draw();
