import {
  createInitialState,
  update,
  moveLeft,
  moveRight,
  jump,
  activateNitro,
  startGame,
  getStats,
  GameState,
  getLaneY,
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

function drawRoad(): void {
  const { width, height } = canvas;

  // Sky gradient (city at dusk)
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.3);
  skyGradient.addColorStop(0, '#1a1a2e');
  skyGradient.addColorStop(1, '#16213e');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.3);

  // City buildings silhouette
  ctx.fillStyle = '#0f0f1a';
  for (let i = 0; i < 15; i++) {
    const bw = 30 + Math.random() * 40;
    const bh = 30 + Math.random() * 60;
    const bx = (i * width / 15) + (state.distance * 0.1) % (width / 15) - width / 15;
    ctx.fillRect(bx, height * 0.3 - bh, bw, bh);

    // Windows
    ctx.fillStyle = '#ffd93d33';
    for (let wy = height * 0.3 - bh + 5; wy < height * 0.3 - 5; wy += 12) {
      for (let wx = bx + 5; wx < bx + bw - 5; wx += 10) {
        if (Math.random() > 0.3) {
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
    ctx.fillStyle = '#0f0f1a';
  }

  // Road
  const roadTop = height * 0.3;
  const roadHeight = height * 0.6;

  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, roadTop, width, roadHeight);

  // Road markings (moving)
  const roadLeft = (width - LANE_WIDTH * LANE_COUNT) / 2;
  const roadRight = roadLeft + LANE_WIDTH * LANE_COUNT;

  // Lane dividers
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.setLineDash([30, 20]);
  const offset = (state.distance * 3) % 50;

  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const laneX = roadLeft + lane * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(laneX, roadTop);
    ctx.lineTo(laneX, roadTop + roadHeight);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Road edges
  ctx.strokeStyle = '#ffd93d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(roadLeft, roadTop);
  ctx.lineTo(roadLeft, roadTop + roadHeight);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(roadRight, roadTop);
  ctx.lineTo(roadRight, roadTop + roadHeight);
  ctx.stroke();

  // Sidewalk
  ctx.fillStyle = '#444';
  ctx.fillRect(0, roadTop + roadHeight, width, height * 0.1);
}

function drawPlayer(): void {
  const { player, sirenPhase } = state;
  const { width, height } = canvas;

  const carWidth = 50;
  const carHeight = 30;
  const x = player.x;
  const y = player.y;

  // Car shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + carWidth / 2, y + 5, carWidth / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Car body (police car)
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x, y - carHeight, carWidth, carHeight);

  // Hood and trunk (white)
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x + 5, y - carHeight + 3, 15, carHeight - 6);
  ctx.fillRect(x + carWidth - 20, y - carHeight + 3, 15, carHeight - 6);

  // Roof (black)
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x + 15, y - carHeight + 5, carWidth - 30, carHeight - 10);

  // Windows
  ctx.fillStyle = '#4a90d9';
  ctx.fillRect(x + 18, y - carHeight + 7, carWidth - 36, carHeight - 14);

  // Siren lights
  if (player.sirensOn) {
    const sirenY = y - carHeight - 5;
    const redIntensity = Math.max(0, Math.sin(sirenPhase));
    const blueIntensity = Math.max(0, -Math.sin(sirenPhase));

    // Red light (left)
    ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + redIntensity * 0.5})`;
    ctx.fillRect(x + 18, sirenY, 8, 5);
    if (redIntensity > 0.5) {
      ctx.fillStyle = `rgba(255, 0, 0, ${redIntensity * 0.3})`;
      ctx.beginPath();
      ctx.arc(x + 22, sirenY + 2, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blue light (right)
    ctx.fillStyle = `rgba(0, 100, 255, ${0.5 + blueIntensity * 0.5})`;
    ctx.fillRect(x + carWidth - 26, sirenY, 8, 5);
    if (blueIntensity > 0.5) {
      ctx.fillStyle = `rgba(0, 100, 255, ${blueIntensity * 0.3})`;
      ctx.beginPath();
      ctx.arc(x + carWidth - 22, sirenY + 2, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 5, y - 5, 10, 8);
  ctx.fillRect(x + carWidth - 15, y - 5, 10, 8);

  // Boost effect
  if (player.boostActive) {
    ctx.fillStyle = '#ffd93d';
    ctx.beginPath();
    ctx.moveTo(x - 5, y - carHeight / 2);
    ctx.lineTo(x - 20, y - carHeight / 2 - 8);
    ctx.lineTo(x - 10, y - carHeight / 2);
    ctx.lineTo(x - 20, y - carHeight / 2 + 8);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCriminal(criminal: typeof state.criminals[0]): void {
  const { width, height } = canvas;

  let carWidth: number, carHeight: number;
  let color: string;

  switch (criminal.type) {
    case 'bike':
      carWidth = 30;
      carHeight = 20;
      color = '#ff6b6b';
      break;
    case 'truck':
      carWidth = 60;
      carHeight = 35;
      color = '#8b4513';
      break;
    default: // car
      carWidth = 45;
      carHeight = 28;
      color = '#c0392b';
  }

  const x = criminal.x - carWidth / 2;
  const y = criminal.y;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(criminal.x, y + 3, carWidth / 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Vehicle body
  ctx.fillStyle = color;
  ctx.fillRect(x, y - carHeight, carWidth, carHeight);

  // Windows
  ctx.fillStyle = '#333';
  if (criminal.type === 'bike') {
    ctx.fillRect(x + 8, y - carHeight + 3, carWidth - 16, carHeight - 8);
  } else {
    ctx.fillRect(x + 5, y - carHeight + 5, carWidth - 10, carHeight * 0.4);
  }

  // Health bar
  const healthWidth = carWidth;
  const healthHeight = 4;
  const healthX = x;
  const healthY = y - carHeight - 8;

  ctx.fillStyle = '#333';
  ctx.fillRect(healthX, healthY, healthWidth, healthHeight);

  const healthRatio = criminal.health / criminal.maxHealth;
  ctx.fillStyle = healthRatio > 0.5 ? '#2ecc71' : healthRatio > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(healthX, healthY, healthWidth * healthRatio, healthHeight);

  // Wanted star
  ctx.fillStyle = '#ffd93d';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('*', criminal.x, y - carHeight - 12);
}

function drawTraffic(traffic: typeof state.traffic[0]): void {
  const x = traffic.x - traffic.width / 2;
  const y = traffic.y;

  let color: string;
  switch (traffic.type) {
    case 'bus':
      color = '#f39c12';
      break;
    case 'suv':
      color = '#27ae60';
      break;
    default:
      color = '#3498db';
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(traffic.x, y + 3, traffic.width / 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(x, y - traffic.height, traffic.width, traffic.height);

  // Windows
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(x + 5, y - traffic.height + 5, traffic.width - 10, traffic.height * 0.4);
}

function drawPowerup(powerup: typeof state.powerups[0]): void {
  const x = powerup.x;
  const y = powerup.y - 15;
  const size = 20;

  // Glow
  ctx.fillStyle = powerup.type === 'nitro' ? 'rgba(255, 100, 0, 0.3)' :
                  powerup.type === 'spike' ? 'rgba(150, 150, 150, 0.3)' :
                  'rgba(100, 150, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(x, y, size + 5, 0, Math.PI * 2);
  ctx.fill();

  // Icon background
  ctx.fillStyle = powerup.type === 'nitro' ? '#ff6600' :
                  powerup.type === 'spike' ? '#666' : '#4a90d9';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Icon
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    powerup.type === 'nitro' ? 'N' : powerup.type === 'spike' ? 'S' : 'E',
    x, y
  );
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

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Draw background and road
  drawRoad();

  // Draw powerups
  for (const powerup of state.powerups) {
    if (!powerup.collected) drawPowerup(powerup);
  }

  // Draw traffic
  for (const traffic of state.traffic) {
    drawTraffic(traffic);
  }

  // Draw criminals
  for (const criminal of state.criminals) {
    if (!criminal.captured) drawCriminal(criminal);
  }

  // Draw player
  drawPlayer();

  // Draw particles
  drawParticles();

  // Update UI displays
  document.getElementById('score-display')!.textContent = Math.floor(state.score).toString();
  document.getElementById('captures-display')!.textContent = state.captures.toString();
  document.getElementById('streak-display')!.textContent = state.streak.toString();
  document.getElementById('speed-display')!.textContent = state.speed.toFixed(1);

  // Pursuit bar
  const pursuitBar = document.getElementById('pursuit-bar')!;
  const pursuitPercent = (state.pursuitMeter / state.maxPursuitMeter) * 100;
  pursuitBar.style.width = `${pursuitPercent}%`;
  pursuitBar.style.background = pursuitPercent > 50 ? 'linear-gradient(90deg, #2ecc71, #27ae60)' :
                                 pursuitPercent > 25 ? 'linear-gradient(90deg, #f39c12, #e67e22)' :
                                 'linear-gradient(90deg, #e74c3c, #c0392b)';

  // Nitro count
  document.getElementById('nitro-count')!.textContent = state.nitroCount.toString();

  // Streak color
  const streakEl = document.getElementById('streak-display')!;
  if (state.streak >= 5) {
    streakEl.style.color = '#ffd93d';
  } else if (state.streak >= 3) {
    streakEl.style.color = '#e74c3c';
  } else {
    streakEl.style.color = '#e74c3c';
  }
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
    <div class="stat-item"><span class="stat-label">${t('game.captures')}</span><span class="stat-value">${stats.captures}</span></div>
    <div class="stat-item"><span class="stat-label">${t('game.maxStreak')}</span><span class="stat-value">${stats.maxStreak}</span></div>
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
  // Keyboard
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
      case 'shift':
        activateNitro(state);
        break;
    }
  });

  // Start button
  document.getElementById('start-btn')!.addEventListener('click', handleStart);

  // Mobile controls
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
  document.getElementById('nitro-btn')!.addEventListener('touchstart', (e) => {
    e.preventDefault();
    activateNitro(state);
  });

  // Language select
  document.getElementById('language-select')!.addEventListener('change', (e) => {
    currentLang = (e.target as HTMLSelectElement).value as Lang;
    updateUI();
  });

  // Resize
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
