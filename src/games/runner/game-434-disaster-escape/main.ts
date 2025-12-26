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
  const shake = state.shakeIntensity;
  const offsetX = (Math.random() - 0.5) * shake;
  const offsetY = (Math.random() - 0.5) * shake;

  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Sky based on disaster type
  let skyColor1: string, skyColor2: string;

  switch (state.disasterType) {
    case 'earthquake':
      skyColor1 = '#4a4a4a';
      skyColor2 = '#6a6a6a';
      break;
    case 'volcano':
      skyColor1 = '#2a1a0a';
      skyColor2 = '#4a2a1a';
      break;
    case 'tsunami':
      skyColor1 = '#1a3a4a';
      skyColor2 = '#2a4a5a';
      break;
    default:
      skyColor1 = '#4a4a4a';
      skyColor2 = '#6a6a6a';
  }

  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  skyGradient.addColorStop(0, skyColor1);
  skyGradient.addColorStop(1, skyColor2);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.5);

  // Disaster-specific background elements
  if (state.disasterType === 'volcano') {
    // Volcano in background
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.moveTo(width * 0.6, height * 0.5);
    ctx.lineTo(width * 0.75, height * 0.15);
    ctx.lineTo(width * 0.9, height * 0.5);
    ctx.closePath();
    ctx.fill();

    // Lava glow
    ctx.fillStyle = `rgba(255, 100, 0, ${0.3 + Math.sin(Date.now() / 200) * 0.2})`;
    ctx.beginPath();
    ctx.arc(width * 0.75, height * 0.15, 30, 0, Math.PI * 2);
    ctx.fill();

    // Rising lava from bottom
    const lavaGradient = ctx.createLinearGradient(0, height - state.lavaLevel, 0, height);
    lavaGradient.addColorStop(0, '#ff6600');
    lavaGradient.addColorStop(0.5, '#ff3300');
    lavaGradient.addColorStop(1, '#cc0000');
    ctx.fillStyle = lavaGradient;
    ctx.fillRect(0, height - state.lavaLevel, width, state.lavaLevel);
  }

  if (state.disasterType === 'tsunami') {
    // Approaching wave
    const waveX = state.waveDistance;
    ctx.fillStyle = '#1a5a7a';
    ctx.beginPath();
    ctx.moveTo(waveX - 50, height);
    ctx.quadraticCurveTo(waveX, height * 0.3, waveX + 30, height);
    ctx.fill();

    // Wave foam
    ctx.fillStyle = '#8ac4e0';
    ctx.beginPath();
    ctx.moveTo(waveX - 30, height * 0.7);
    for (let i = 0; i < 10; i++) {
      const wx = waveX - 30 + i * 5;
      const wy = height * 0.7 + Math.sin(Date.now() / 100 + i) * 10;
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(waveX + 20, height);
    ctx.lineTo(waveX - 30, height);
    ctx.fill();
  }

  // Ground
  const groundY = height * 0.75;
  let groundColor: string;

  switch (state.disasterType) {
    case 'earthquake':
      groundColor = '#5a5a4a';
      break;
    case 'volcano':
      groundColor = '#3a2a1a';
      break;
    case 'tsunami':
      groundColor = '#4a5a5a';
      break;
    default:
      groundColor = '#5a5a4a';
  }

  ctx.fillStyle = groundColor;
  ctx.fillRect(0, groundY, width, height - groundY);

  // Cracks for earthquake
  if (state.disasterType === 'earthquake') {
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    const crackOffset = (state.distance * 0.5) % 100;
    for (let x = -crackOffset; x < width + 100; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 20, groundY + 30);
      ctx.lineTo(x + 10, groundY + 60);
      ctx.stroke();
    }
  }

  // Lane markers
  const roadLeft = (width - LANE_WIDTH * LANE_COUNT) / 2;
  ctx.strokeStyle = '#ffffff33';
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 15]);
  for (let lane = 0; lane <= LANE_COUNT; lane++) {
    const laneX = roadLeft + lane * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(laneX, groundY - 80);
    ctx.lineTo(laneX, groundY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.restore();
}

function drawFallingObjects(): void {
  for (const obj of state.fallingObjects) {
    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.rotate(obj.rotation);

    switch (obj.type) {
      case 'rock':
        ctx.fillStyle = '#666';
        ctx.fillRect(-obj.size / 2, -obj.size / 2, obj.size, obj.size);
        ctx.fillStyle = '#555';
        ctx.fillRect(-obj.size / 4, -obj.size / 4, obj.size / 2, obj.size / 2);
        break;
      case 'ash':
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(0, 0, obj.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'ember':
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(0, 0, obj.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff9900';
        ctx.beginPath();
        ctx.arc(0, 0, obj.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }
}

function drawPlayer(): void {
  const { player } = state;
  const x = player.x;
  const y = player.y;

  // Shield effect
  if (player.shieldActive) {
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + PLAYER_WIDTH / 2, y - PLAYER_HEIGHT / 2, 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
    ctx.beginPath();
    ctx.arc(x + PLAYER_WIDTH / 2, y - PLAYER_HEIGHT / 2, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + PLAYER_WIDTH / 2, y + 3, PLAYER_WIDTH / 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (rescue worker)
  ctx.fillStyle = '#e67e22';
  ctx.fillRect(x, y - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);

  // Reflective stripes
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(x, y - PLAYER_HEIGHT * 0.6, PLAYER_WIDTH, 5);
  ctx.fillRect(x, y - PLAYER_HEIGHT * 0.3, PLAYER_WIDTH, 5);

  // Helmet
  ctx.fillStyle = '#f39c12';
  ctx.beginPath();
  ctx.arc(x + PLAYER_WIDTH / 2, y - PLAYER_HEIGHT - 5, 12, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 3, y - PLAYER_HEIGHT - 5, PLAYER_WIDTH - 6, 8);

  // Face
  ctx.fillStyle = '#d4a574';
  ctx.fillRect(x + 8, y - PLAYER_HEIGHT + 3, PLAYER_WIDTH - 16, 12);
}

function drawObstacle(obstacle: typeof state.obstacles[0]): void {
  const x = obstacle.x - obstacle.width / 2;
  const y = obstacle.y;

  switch (obstacle.type) {
    case 'crack':
      // Ground crack
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + obstacle.width * 0.3, y - obstacle.height);
      ctx.lineTo(x + obstacle.width * 0.5, y - obstacle.height * 0.5);
      ctx.lineTo(x + obstacle.width * 0.7, y - obstacle.height);
      ctx.lineTo(x + obstacle.width, y);
      ctx.closePath();
      ctx.fill();
      break;

    case 'boulder':
      // Rolling boulder
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(obstacle.x, y - obstacle.height / 2, obstacle.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(obstacle.x - 5, y - obstacle.height / 2 - 5, obstacle.width / 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'lavaPool':
      // Lava pool
      const lavaGradient = ctx.createRadialGradient(
        obstacle.x, y - obstacle.height / 2, 0,
        obstacle.x, y - obstacle.height / 2, obstacle.width / 2
      );
      lavaGradient.addColorStop(0, '#ff6600');
      lavaGradient.addColorStop(0.5, '#ff3300');
      lavaGradient.addColorStop(1, '#cc0000');
      ctx.fillStyle = lavaGradient;
      ctx.beginPath();
      ctx.ellipse(obstacle.x, y - obstacle.height / 2, obstacle.width / 2, obstacle.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bubbles
      ctx.fillStyle = '#ff9900';
      const bubblePhase = Date.now() / 200;
      for (let i = 0; i < 3; i++) {
        const bx = x + 10 + i * 20;
        const by = y - obstacle.height - Math.abs(Math.sin(bubblePhase + i)) * 10;
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'debris':
      // Fallen debris
      ctx.fillStyle = '#555';
      ctx.fillRect(x, y - obstacle.height, obstacle.width, obstacle.height);
      ctx.fillStyle = '#666';
      ctx.fillRect(x + 5, y - obstacle.height + 5, obstacle.width - 10, obstacle.height - 10);
      // Rebar
      ctx.strokeStyle = '#8b4513';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - obstacle.height);
      ctx.lineTo(x + obstacle.width, y);
      ctx.stroke();
      break;

    case 'wave':
      // Small wave
      ctx.fillStyle = '#2a7a9a';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(obstacle.x, y - obstacle.height, x + obstacle.width, y);
      ctx.fill();
      // Foam
      ctx.fillStyle = '#8ac4e0';
      ctx.beginPath();
      ctx.arc(obstacle.x, y - obstacle.height * 0.7, 10, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawCollectible(collectible: typeof state.collectibles[0]): void {
  const x = collectible.x;
  const y = collectible.y;
  const bobOffset = Math.sin(Date.now() / 200) * 3;

  ctx.save();
  ctx.translate(x, y + bobOffset);

  let bgColor: string, icon: string;

  switch (collectible.type) {
    case 'survivor':
      bgColor = '#ffd93d';
      icon = 'P';
      break;
    case 'supply':
      bgColor = '#2ecc71';
      icon = 'S';
      break;
    case 'shield':
      bgColor = '#3498db';
      icon = 'O';
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
  drawFallingObjects();

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

  // Update UI
  document.getElementById('score-display')!.textContent = Math.floor(state.score).toString();
  document.getElementById('survivors-display')!.textContent = state.survivors.toString();
  document.getElementById('supplies-display')!.textContent = state.supplies.toString();
  document.getElementById('speed-display')!.textContent = state.speed.toFixed(1);

  // Disaster type
  const disasterTypeEl = document.getElementById('disaster-type')!;
  disasterTypeEl.textContent = t(`game.${state.disasterType}`);
  disasterTypeEl.className = `disaster-type ${state.disasterType}`;
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
    <div class="stat-item"><span class="stat-label">${t('game.survivors')}</span><span class="stat-value">${stats.survivors}</span></div>
    <div class="stat-item"><span class="stat-label">${t('game.supplies')}</span><span class="stat-value">${stats.supplies}</span></div>
    <div class="stat-item"><span class="stat-label">${t('game.disaster')}</span><span class="stat-value">${t(`game.${stats.disasterType}`)}</span></div>
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
