import {
  createInitialState,
  update,
  moveLeft,
  moveRight,
  jump,
  slide,
  startGame,
  getStats,
  GameState,
  getLaneY,
  getLaneX,
} from './game';
import { translations } from './i18n';

type Lang = keyof typeof translations;

let currentLang: Lang = 'zh-TW';
let state: GameState;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let lastTime = 0;
let animationId: number;

const LANE_COUNT = 3;
const LANE_WIDTH = 80;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;
const PLAYER_SLIDE_HEIGHT = 25;

function t(key: string): string {
  return translations[currentLang][key as keyof (typeof translations)['zh-TW']] || key;
}

function updateUI(): void {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 400;
}

function drawBackground(): void {
  const { width, height } = canvas;
  const shake = state.shakeIntensity;
  const offsetX = (Math.random() - 0.5) * shake;
  const offsetY = (Math.random() - 0.5) * shake;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Dark industrial background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, '#1a1a1a');
  bgGradient.addColorStop(0.5, '#2d2d2d');
  bgGradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Warning zone (danger approaching from left)
  const warningGradient = ctx.createLinearGradient(0, 0, state.warningZone + 30, 0);
  warningGradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
  warningGradient.addColorStop(0.7, 'rgba(255, 100, 0, 0.4)');
  warningGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = warningGradient;
  ctx.fillRect(0, 0, state.warningZone + 30, height);

  // Industrial pipes at top
  ctx.fillStyle = '#444';
  for (let i = 0; i < 5; i++) {
    const pipeY = 20 + i * 25;
    ctx.fillRect(0, pipeY, width, 15);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, pipeY + 12, width, 3);
    ctx.fillStyle = '#444';
  }

  // Floor
  const groundY = height * 0.75;
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, groundY, width, height - groundY);

  // Floor pattern (moving)
  ctx.fillStyle = '#2a2a2a';
  const tileWidth = 60;
  const offset = (state.distance * 2) % tileWidth;
  for (let x = -offset; x < width + tileWidth; x += tileWidth) {
    ctx.fillRect(x, groundY, tileWidth / 2, 5);
  }

  // Lane markers
  const roadLeft = (width - LANE_WIDTH * LANE_COUNT) / 2;
  ctx.strokeStyle = '#ff660066';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 10]);
  for (let lane = 0; lane <= LANE_COUNT; lane++) {
    const laneX = roadLeft + lane * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(laneX, groundY - 100);
    ctx.lineTo(laneX, groundY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Alert lights on ceiling
  const alertPhase = Date.now() / 200;
  if (state.alertLevel > 30) {
    const lightIntensity = Math.sin(alertPhase) * 0.5 + 0.5;
    for (let x = 50; x < width; x += 120) {
      ctx.fillStyle = `rgba(255, 0, 0, ${lightIntensity * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, 30, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawDebris(): void {
  ctx.fillStyle = '#666';
  for (const debris of state.debris) {
    ctx.save();
    ctx.translate(debris.x, debris.y);
    ctx.rotate(debris.rotation);
    ctx.fillRect(-debris.size / 2, -debris.size / 2, debris.size, debris.size);
    ctx.restore();
  }
}

function drawPlayer(): void {
  const { player } = state;
  const height = player.sliding ? PLAYER_SLIDE_HEIGHT : PLAYER_HEIGHT;
  const x = player.x;
  const y = player.y;

  // Invincibility flash
  if (player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + PLAYER_WIDTH / 2, y + 3, PLAYER_WIDTH / 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x, y - height, PLAYER_WIDTH, height);

  // Head
  if (!player.sliding) {
    ctx.fillStyle = '#f5d0c5';
    ctx.beginPath();
    ctx.arc(x + PLAYER_WIDTH / 2, y - height - 8, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#4a3728';
    ctx.beginPath();
    ctx.arc(x + PLAYER_WIDTH / 2, y - height - 12, 8, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Helmet visor (when sliding)
  if (player.sliding) {
    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + 5, y - height + 3, PLAYER_WIDTH - 10, 8);
  }

  ctx.globalAlpha = 1;
}

function drawObstacle(obstacle: typeof state.obstacles[0]): void {
  const x = obstacle.x - obstacle.width / 2;
  const y = obstacle.y - obstacle.height;

  switch (obstacle.type) {
    case 'barrier':
      // Metal barrier
      ctx.fillStyle = '#666';
      ctx.fillRect(x, y, obstacle.width, obstacle.height);
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(x, y, obstacle.width, 10);
      ctx.fillRect(x, y + obstacle.height - 10, obstacle.width, 10);
      // Warning stripes
      ctx.fillStyle = '#111';
      for (let i = 0; i < obstacle.height; i += 20) {
        ctx.fillRect(x, y + i, obstacle.width, 5);
      }
      break;

    case 'laser':
      if (obstacle.active) {
        // Laser beam
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, obstacle.width, obstacle.height);
        // Glow
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(x, y - 5, obstacle.width, obstacle.height + 10);
      } else {
        // Inactive emitters
        ctx.fillStyle = '#444';
        ctx.fillRect(x, y, 10, obstacle.height);
        ctx.fillRect(x + obstacle.width - 10, y, 10, obstacle.height);
      }
      break;

    case 'spike':
      // Metal spikes
      ctx.fillStyle = '#888';
      const spikeCount = 5;
      const spikeWidth = obstacle.width / spikeCount;
      for (let i = 0; i < spikeCount; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * spikeWidth, obstacle.y);
        ctx.lineTo(x + i * spikeWidth + spikeWidth / 2, y);
        ctx.lineTo(x + (i + 1) * spikeWidth, obstacle.y);
        ctx.closePath();
        ctx.fill();
      }
      break;

    case 'falling':
      // Falling debris/ceiling piece
      ctx.fillStyle = '#555';
      ctx.fillRect(x, y, obstacle.width, obstacle.height);
      ctx.fillStyle = '#666';
      ctx.fillRect(x + 5, y + 5, obstacle.width - 10, obstacle.height - 10);
      // Crack pattern
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + obstacle.width, y + obstacle.height);
      ctx.moveTo(x + obstacle.width, y);
      ctx.lineTo(x, y + obstacle.height);
      ctx.stroke();
      break;

    case 'electric':
      // Electric hazard
      ctx.fillStyle = '#333';
      ctx.fillRect(x, y, obstacle.width, obstacle.height);
      if (obstacle.active) {
        // Electric arcs
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(x + obstacle.width / 2, y);
          let currentY = y;
          while (currentY < obstacle.y) {
            const nextY = currentY + 10;
            const offsetX = (Math.random() - 0.5) * 15;
            ctx.lineTo(x + obstacle.width / 2 + offsetX, nextY);
            currentY = nextY;
          }
          ctx.stroke();
        }
        // Glow
        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.fillRect(x - 5, y, obstacle.width + 10, obstacle.height);
      }
      break;
  }
}

function drawCollectible(collectible: typeof state.collectibles[0]): void {
  const x = collectible.x;
  const y = collectible.y;
  const bobOffset = Math.sin(Date.now() / 200) * 3;

  ctx.save();
  ctx.translate(x, y + bobOffset);

  // Glow
  let glowColor: string;
  let iconColor: string;
  let icon: string;

  switch (collectible.type) {
    case 'health':
      glowColor = 'rgba(46, 204, 113, 0.3)';
      iconColor = '#2ecc71';
      icon = '+';
      break;
    case 'shield':
      glowColor = 'rgba(52, 152, 219, 0.3)';
      iconColor = '#3498db';
      icon = 'O';
      break;
    case 'boost':
      glowColor = 'rgba(243, 156, 18, 0.3)';
      iconColor = '#f39c12';
      icon = '*';
      break;
    case 'key':
      glowColor = 'rgba(255, 217, 61, 0.4)';
      iconColor = '#ffd93d';
      icon = 'K';
      break;
    default:
      glowColor = 'rgba(255,255,255,0.3)';
      iconColor = '#fff';
      icon = '?';
  }

  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = iconColor;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 0, 0);

  ctx.restore();
}

function drawParticles(): void {
  for (const particle of state.particles) {
    const alpha = particle.life / particle.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHealthBar(): void {
  const { player } = state;
  const { width } = canvas;

  // Health hearts
  const heartSize = 20;
  const startX = width - 80;
  const startY = 15;

  for (let i = 0; i < player.maxHealth; i++) {
    const x = startX + i * (heartSize + 5);
    if (i < player.health) {
      ctx.fillStyle = '#e74c3c';
    } else {
      ctx.fillStyle = '#444';
    }
    // Simple heart shape
    ctx.beginPath();
    ctx.arc(x, startY, heartSize / 3, 0, Math.PI * 2);
    ctx.arc(x + heartSize / 3, startY, heartSize / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - heartSize / 3, startY);
    ctx.lineTo(x + heartSize / 6, startY + heartSize / 2);
    ctx.lineTo(x + heartSize / 3 + heartSize / 3, startY);
    ctx.fill();
  }
}

function render(): void {
  const { width, height } = canvas;

  ctx.clearRect(0, 0, width, height);

  drawBackground();
  drawDebris();

  // Draw collectibles
  for (const collectible of state.collectibles) {
    if (!collectible.collected) drawCollectible(collectible);
  }

  // Draw obstacles
  for (const obstacle of state.obstacles) {
    drawObstacle(obstacle);
  }

  // Draw player
  drawPlayer();

  // Draw particles
  drawParticles();

  // Draw health
  drawHealthBar();

  // Update UI
  document.getElementById('score-display')!.textContent = Math.floor(state.score).toString();
  document.getElementById('keys-display')!.textContent = state.keysCollected.toString();
  document.getElementById('health-display')!.textContent = state.player.health.toString();
  document.getElementById('speed-display')!.textContent = state.speed.toFixed(1);

  // Alert bar
  const alertBar = document.getElementById('alert-bar')!;
  const alertPercent = (state.alertLevel / state.maxAlertLevel) * 100;
  alertBar.style.width = `${alertPercent}%`;
  alertBar.style.background = alertPercent > 70 ? 'linear-gradient(90deg, #e74c3c, #c0392b)' :
                              alertPercent > 40 ? 'linear-gradient(90deg, #f39c12, #e67e22)' :
                              'linear-gradient(90deg, #f39c12, #e67e22)';
}

function gameLoop(timestamp: number): void {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  if (state.phase === 'playing') {
    update(state, deltaTime, canvas.width, canvas.height);
    render();

    if (state.phase === 'gameover') {
      showGameOver();
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}

function showGameOver(): void {
  const overlay = document.getElementById('game-overlay')!;
  const title = document.getElementById('overlay-title')!;
  const msg = document.getElementById('overlay-msg')!;
  const finalScore = document.getElementById('final-score')!;
  const statsGrid = document.getElementById('stats-grid')!;
  const btn = document.getElementById('start-btn')!;

  const stats = getStats(state);

  title.textContent = t('game.gameover');
  msg.style.display = 'none';
  finalScore.style.display = 'block';
  finalScore.textContent = stats.score.toString();

  statsGrid.style.display = 'grid';
  statsGrid.innerHTML = `
    <div class="stat-item"><span class="stat-label">${t('game.distance')}</span><span class="stat-value">${stats.distance}m</span></div>
    <div class="stat-item"><span class="stat-label">${t('game.keysCollected')}</span><span class="stat-value">${stats.keysCollected}</span></div>
    <div class="stat-item"><span class="stat-label">${t('game.alert')}</span><span class="stat-value">${stats.alertLevel}%</span></div>
    <div class="stat-item"><span class="stat-label">${t('game.speed')}</span><span class="stat-value">${state.speed.toFixed(1)}</span></div>
  `;

  btn.textContent = t('game.restart');
  overlay.style.display = 'flex';
}

function handleStart(): void {
  const overlay = document.getElementById('game-overlay')!;
  const msg = document.getElementById('overlay-msg')!;
  const finalScore = document.getElementById('final-score')!;
  const statsGrid = document.getElementById('stats-grid')!;

  startGame(state);
  overlay.style.display = 'none';
  msg.style.display = 'block';
  finalScore.style.display = 'none';
  statsGrid.style.display = 'none';
}

function setupEventListeners(): void {
  document.addEventListener('keydown', (e) => {
    if (state.phase !== 'playing') return;

    switch (e.key.toLowerCase()) {
      case 'a':
      case 'arrowleft':
        moveLeft(state);
        break;
      case 'd':
      case 'arrowright':
        moveRight(state);
        break;
      case ' ':
        e.preventDefault();
        jump(state);
        break;
      case 's':
      case 'arrowdown':
        slide(state);
        break;
    }
  });

  document.getElementById('start-btn')!.addEventListener('click', handleStart);

  document.getElementById('left-btn')!.addEventListener('touchstart', (e) => {
    e.preventDefault();
    moveLeft(state);
  });
  document.getElementById('right-btn')!.addEventListener('touchstart', (e) => {
    e.preventDefault();
    moveRight(state);
  });
  document.getElementById('jump-btn')!.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump(state);
  });
  document.getElementById('slide-btn')!.addEventListener('touchstart', (e) => {
    e.preventDefault();
    slide(state);
  });

  document.getElementById('language-select')!.addEventListener('change', (e) => {
    currentLang = (e.target as HTMLSelectElement).value as Lang;
    updateUI();
  });

  window.addEventListener('resize', resizeCanvas);
}

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  state = createInitialState();
  resizeCanvas();
  setupEventListeners();
  updateUI();
  render();

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

init();
