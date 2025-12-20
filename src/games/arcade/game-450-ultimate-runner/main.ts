import { UltimateRunnerGame } from './game';
import { translations } from './i18n';
import { i18n, type Locale } from '../../../shared/i18n';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
const scoreDisplay = document.getElementById('score-display')!;
const coinsDisplay = document.getElementById('coins-display')!;
const highDisplay = document.getElementById('high-display')!;
const distanceDisplay = document.getElementById('distance-display')!;
const comboDisplay = document.getElementById('combo-display')!;
const powerupDisplay = document.getElementById('powerup-display')!;
const overlay = document.getElementById('game-overlay')!;
const overlayTitle = document.getElementById('overlay-title')!;
const overlayMsg = document.getElementById('overlay-msg')!;
const startBtn = document.getElementById('start-btn')!;

let game: UltimateRunnerGame;
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

  // Dynamic background based on distance
  const hue = (state.distance / 10) % 360;
  ctx.fillStyle = `hsl(${hue}, 30%, 20%)`;
  ctx.fillRect(0, 0, width, height);

  // Stars
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  for (let i = 0; i < 30; i++) {
    const x = ((i * 47 + state.distance) % width);
    const y = (i * 31) % (state.groundY - 50);
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lane markers
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const x = state.lanePositions[0] - 35 + i * 70;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.groundY);
    ctx.stroke();
  }

  // Ground
  ctx.fillStyle = `hsl(${hue}, 40%, 30%)`;
  ctx.fillRect(0, state.groundY, width, height - state.groundY);

  // Collectibles
  for (const col of state.collectibles) {
    if (col.collected) continue;
    if (col.type === 'coin') {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(col.x, col.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(col.x, col.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (col.type === 'gem') {
      ctx.fillStyle = '#9b59b6';
      ctx.beginPath();
      ctx.moveTo(col.x, col.y - 12);
      ctx.lineTo(col.x + 10, col.y);
      ctx.lineTo(col.x, col.y + 12);
      ctx.lineTo(col.x - 10, col.y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Power-up
      const colors: Record<string, string> = {
        speed: '#3498db',
        magnet: '#e74c3c',
        shield: '#27ae60',
        double: '#f39c12',
      };
      ctx.fillStyle = colors[col.powerUpType || 'speed'];
      ctx.beginPath();
      ctx.arc(col.x, col.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(col.powerUpType?.[0].toUpperCase() || '?', col.x, col.y + 4);
    }
  }

  // Obstacles
  for (const obs of state.obstacles) {
    switch (obs.type) {
      case 'barrier':
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, 10);
        break;
      case 'spike':
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width / 2, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        break;
      case 'beam':
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = 'rgba(241, 196, 15, 0.3)';
        ctx.fillRect(obs.x, obs.y + obs.height, obs.width, state.groundY - obs.y - obs.height);
        break;
      case 'wall':
        ctx.fillStyle = '#34495e';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.strokeRect(obs.x + 5, obs.y + 5 + i * 20, obs.width - 10, 15);
        }
        break;
    }
  }

  // Player
  const p = state.player;
  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

  // Power-up effect
  if (p.powerUp) {
    const colors: Record<string, string> = {
      speed: 'rgba(52, 152, 219, 0.4)',
      magnet: 'rgba(231, 76, 60, 0.4)',
      shield: 'rgba(39, 174, 96, 0.4)',
      double: 'rgba(243, 156, 18, 0.4)',
    };
    ctx.fillStyle = colors[p.powerUp];
    ctx.beginPath();
    ctx.arc(0, 0, p.width + 10, 0, Math.PI * 2);
    ctx.fill();
  }

  if (p.isSliding) {
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-p.width / 2, -5, p.width, 15);
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(p.width / 3, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Body
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-p.width / 3, -5, p.width * 2 / 3, p.height / 2 + 5);
    // Head
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, -p.height / 4, 10, 0, Math.PI * 2);
    ctx.fill();
    // Helmet
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(0, -p.height / 4 - 2, 11, Math.PI, Math.PI * 2);
    ctx.fill();
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
  scoreDisplay.textContent = Math.floor(state.score).toString();
  coinsDisplay.textContent = state.coins.toString();
  highDisplay.textContent = state.highScore.toString();
  distanceDisplay.textContent = `${Math.floor(state.distance)}m`;

  if (state.combo > 1) {
    comboDisplay.textContent = `${state.combo}x ${i18n.t('game.combo')}!`;
    comboDisplay.style.color = '#f39c12';
  } else {
    comboDisplay.textContent = '';
  }

  if (state.player.powerUp) {
    const names: Record<string, string> = { speed: 'SPEED', magnet: 'MAGNET', shield: 'SHIELD', double: '2X' };
    powerupDisplay.textContent = `${names[state.player.powerUp]} ${Math.ceil(state.player.powerUpTime)}s`;
  } else {
    powerupDisplay.textContent = '';
  }

  if (state.phase === 'gameOver') {
    showOverlay(i18n.t('game.over'), `${i18n.t('game.score')}: ${Math.floor(state.score)}`, i18n.t('game.restart'));
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
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        game.moveLeft();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        game.moveRight();
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
  const leftBtn = document.getElementById('mobile-left');
  const rightBtn = document.getElementById('mobile-right');

  jumpBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.jump(); });
  slideBtn?.addEventListener('touchstart', (e) => { e.preventDefault(); game.slide(true); });
  slideBtn?.addEventListener('touchend', () => game.slide(false));
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

game = new UltimateRunnerGame();
initI18n();
resize();
setupInput();
draw();
