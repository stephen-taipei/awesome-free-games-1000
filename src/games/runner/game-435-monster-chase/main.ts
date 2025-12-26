import {
  createInitialState,
  update,
  moveLeft,
  moveRight,
  jump,
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
  const shake = state.screenShake;
  const offsetX = (Math.random() - 0.5) * shake;
  const offsetY = (Math.random() - 0.5) * shake;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Apocalyptic sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  skyGradient.addColorStop(0, '#1a0a0a');
  skyGradient.addColorStop(0.5, '#3a1a1a');
  skyGradient.addColorStop(1, '#4a2a2a');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.5);

  // Destroyed city skyline
  ctx.fillStyle = '#1a0a0a';
  for (let i = 0; i < 12; i++) {
    const bw = 30 + Math.random() * 50;
    const bh = 40 + Math.random() * 80;
    const bx = ((i * width / 12) + state.distance * 0.2) % (width + 100) - 50;

    // Damaged building shape
    ctx.beginPath();
    ctx.moveTo(bx, height * 0.5);
    ctx.lineTo(bx, height * 0.5 - bh);

    // Jagged top (damage)
    const jaggedPoints = 3 + Math.floor(Math.random() * 4);
    for (let j = 0; j < jaggedPoints; j++) {
      const px = bx + (j / jaggedPoints) * bw;
      const py = height * 0.5 - bh + Math.random() * 20;
      ctx.lineTo(px, py);
    }

    ctx.lineTo(bx + bw, height * 0.5 - bh + Math.random() * 30);
    ctx.lineTo(bx + bw, height * 0.5);
    ctx.closePath();
    ctx.fill();

    // Fire glow on some buildings
    if (Math.random() > 0.7) {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(bx + bw / 2, height * 0.5 - bh / 2, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1a0a0a';
  }

  // Ground (cracked road)
  const groundY = height * 0.75;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, groundY, width, height - groundY);

  // Road markings
  const roadLeft = (width - LANE_WIDTH * LANE_COUNT) / 2;
  ctx.strokeStyle = '#ffffff33';
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 15]);
  const laneOffset = (state.distance * 3) % 35;
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const laneX = roadLeft + lane * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(laneX, groundY - 80);
    ctx.lineTo(laneX, groundY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Cracks in road
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  const crackOffset = (state.distance * 0.5) % 80;
  for (let x = -crackOffset; x < width + 80; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, groundY + 10);
    ctx.lineTo(x + 15, groundY + 40);
    ctx.lineTo(x + 5, groundY + 70);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMonster(): void {
  const { width, height } = canvas;
  const { monster, monsterDistance } = state;

  // Monster position based on distance
  const monsterX = -80 + (200 - monsterDistance) * 0.3;
  const monsterY = height * 0.3;
  const monsterSize = 120 + (200 - monsterDistance) * 0.3;

  ctx.save();
  ctx.translate(monsterX, monsterY);

  // Body (dark silhouette)
  ctx.fillStyle = '#0a0505';
  ctx.beginPath();
  ctx.ellipse(0, 30, monsterSize * 0.4, monsterSize * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(0, -monsterSize * 0.2, monsterSize * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Horns
  ctx.beginPath();
  ctx.moveTo(-monsterSize * 0.3, -monsterSize * 0.4);
  ctx.lineTo(-monsterSize * 0.2, -monsterSize * 0.8);
  ctx.lineTo(-monsterSize * 0.1, -monsterSize * 0.35);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(monsterSize * 0.3, -monsterSize * 0.4);
  ctx.lineTo(monsterSize * 0.2, -monsterSize * 0.8);
  ctx.lineTo(monsterSize * 0.1, -monsterSize * 0.35);
  ctx.fill();

  // Eyes (glowing red)
  const eyeGlow = Math.sin(Date.now() / 200) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
  ctx.beginPath();
  ctx.arc(-monsterSize * 0.12, -monsterSize * 0.25, 8, 0, Math.PI * 2);
  ctx.arc(monsterSize * 0.12, -monsterSize * 0.25, 8, 0, Math.PI * 2);
  ctx.fill();

  // Eye glow effect
  ctx.fillStyle = `rgba(255, 50, 0, ${eyeGlow * 0.3})`;
  ctx.beginPath();
  ctx.arc(-monsterSize * 0.12, -monsterSize * 0.25, 15, 0, Math.PI * 2);
  ctx.arc(monsterSize * 0.12, -monsterSize * 0.25, 15, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  if (monster.mouthOpen) {
    ctx.fillStyle = '#300000';
    ctx.beginPath();
    ctx.ellipse(0, -monsterSize * 0.05, monsterSize * 0.2, monsterSize * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Teeth
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) {
      const toothX = -monsterSize * 0.15 + i * monsterSize * 0.06;
      ctx.beginPath();
      ctx.moveTo(toothX, -monsterSize * 0.12);
      ctx.lineTo(toothX + 5, -monsterSize * 0.02);
      ctx.lineTo(toothX + 10, -monsterSize * 0.12);
      ctx.fill();
    }
  }

  // Arms reaching forward
  ctx.fillStyle = '#0a0505';
  ctx.beginPath();
  ctx.moveTo(monsterSize * 0.3, 0);
  ctx.quadraticCurveTo(monsterSize * 0.8, -20, monsterSize * 0.9, 40);
  ctx.quadraticCurveTo(monsterSize * 0.7, 60, monsterSize * 0.4, 40);
  ctx.fill();

  // Claws
  ctx.fillStyle = '#333';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(monsterSize * 0.85 + i * 8, 35 + i * 5);
    ctx.lineTo(monsterSize * 0.95 + i * 10, 50 + i * 5);
    ctx.lineTo(monsterSize * 0.85 + i * 8, 55 + i * 5);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayer(): void {
  const { player } = state;
  const x = player.x;
  const y = player.y;

  // Adrenaline effect
  if (player.adrenalineMode) {
    ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x - 8 - i * 12, y - PLAYER_HEIGHT / 2, 10 - i * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + PLAYER_WIDTH / 2, y + 3, PLAYER_WIDTH / 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = player.adrenalineMode ? '#ff6600' : '#3498db';
  ctx.fillRect(x, y - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);

  // Head
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(x + PLAYER_WIDTH / 2, y - PLAYER_HEIGHT - 8, 10, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.arc(x + PLAYER_WIDTH / 2, y - PLAYER_HEIGHT - 12, 8, Math.PI, Math.PI * 2);
  ctx.fill();

  // Running pose indicator
  if (player.adrenalineMode) {
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - PLAYER_HEIGHT * 0.7);
    ctx.lineTo(x - 15, y - PLAYER_HEIGHT * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, y - PLAYER_HEIGHT * 0.3);
    ctx.lineTo(x - 15, y - PLAYER_HEIGHT * 0.5);
    ctx.stroke();
  }
}

function drawObstacle(obstacle: typeof state.obstacles[0]): void {
  const x = obstacle.x - obstacle.width / 2;
  const y = obstacle.y;

  switch (obstacle.type) {
    case 'car':
      // Crashed car
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(x, y - obstacle.height, obstacle.width, obstacle.height);
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(x + 5, y - obstacle.height + 5, obstacle.width - 10, obstacle.height * 0.4);
      // Smoke
      ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.beginPath();
      ctx.arc(x + obstacle.width / 2, y - obstacle.height - 10, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'barrier':
      // Concrete barrier
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(x, y - obstacle.height, obstacle.width, obstacle.height);
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(x + 3, y - obstacle.height + 3, obstacle.width - 6, obstacle.height - 6);
      break;

    case 'debris':
      // Building debris
      ctx.fillStyle = '#555';
      ctx.fillRect(x, y - obstacle.height, obstacle.width, obstacle.height);
      ctx.fillStyle = '#666';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(
          x + Math.random() * obstacle.width * 0.7,
          y - obstacle.height + Math.random() * obstacle.height * 0.7,
          obstacle.width * 0.3,
          obstacle.height * 0.3
        );
      }
      break;

    case 'hole':
      // Ground crack/hole
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + obstacle.width * 0.2, y - obstacle.height);
      ctx.lineTo(x + obstacle.width * 0.5, y - obstacle.height * 0.5);
      ctx.lineTo(x + obstacle.width * 0.8, y - obstacle.height);
      ctx.lineTo(x + obstacle.width, y);
      ctx.closePath();
      ctx.fill();
      break;

    case 'fire':
      // Fire
      const firePhase = Date.now() / 100;
      for (let i = 0; i < 5; i++) {
        const flameHeight = obstacle.height * (0.5 + 0.5 * Math.sin(firePhase + i));
        const flameX = x + i * (obstacle.width / 5);
        ctx.fillStyle = i % 2 === 0 ? '#ff6600' : '#ff9900';
        ctx.beginPath();
        ctx.moveTo(flameX, y);
        ctx.lineTo(flameX + obstacle.width / 10, y - flameHeight);
        ctx.lineTo(flameX + obstacle.width / 5, y);
        ctx.closePath();
        ctx.fill();
      }
      break;
  }
}

function drawPowerup(powerup: typeof state.powerups[0]): void {
  const x = powerup.x;
  const y = powerup.y;
  const bobOffset = Math.sin(Date.now() / 200) * 3;

  ctx.save();
  ctx.translate(x, y + bobOffset);

  let bgColor: string, icon: string;

  switch (powerup.type) {
    case 'adrenaline':
      bgColor = '#ff6600';
      icon = 'A';
      break;
    case 'slowdown':
      bgColor = '#3498db';
      icon = 'S';
      break;
    case 'coin':
      bgColor = '#ffd93d';
      icon = '$';
      break;
    default:
      bgColor = '#fff';
      icon = '?';
  }

  // Glow
  ctx.fillStyle = bgColor + '44';
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();

  // Background
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();

  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
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

function render(): void {
  const { width, height } = canvas;

  ctx.clearRect(0, 0, width, height);

  drawBackground();
  drawMonster();

  // Draw powerups
  for (const powerup of state.powerups) {
    if (!powerup.collected) drawPowerup(powerup);
  }

  // Draw obstacles
  for (const obstacle of state.obstacles) {
    drawObstacle(obstacle);
  }

  // Draw player
  drawPlayer();

  // Draw particles
  drawParticles();

  // Update UI
  document.getElementById('score-display')!.textContent = Math.floor(state.score).toString();
  document.getElementById('coins-display')!.textContent = state.coins.toString();
  document.getElementById('escape-display')!.textContent = Math.floor(state.monsterDistance).toString();
  document.getElementById('speed-display')!.textContent = state.speed.toFixed(1);

  // Escape bar
  const escapeBar = document.getElementById('escape-bar')!;
  const escapePercent = ((state.monsterDistance - state.minMonsterDistance) /
    (state.maxMonsterDistance - state.minMonsterDistance)) * 100;
  escapeBar.style.width = `${Math.max(0, Math.min(100, escapePercent))}%`;
  escapeBar.style.background = escapePercent > 50 ? 'linear-gradient(90deg, #2ecc71, #27ae60)' :
                               escapePercent > 25 ? 'linear-gradient(90deg, #f39c12, #e67e22)' :
                               'linear-gradient(90deg, #e74c3c, #c0392b)';

  // Escape display color
  const escapeDisplay = document.getElementById('escape-display')!;
  escapeDisplay.style.color = escapePercent > 50 ? '#2ecc71' : escapePercent > 25 ? '#f39c12' : '#e74c3c';
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
    <div class="stat-item"><span class="stat-label">${t('game.coins')}</span><span class="stat-value">${stats.coins}</span></div>
    <div class="stat-item"><span class="stat-label">${t('game.escapedDistance')}</span><span class="stat-value">${stats.escapedDistance}</span></div>
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
