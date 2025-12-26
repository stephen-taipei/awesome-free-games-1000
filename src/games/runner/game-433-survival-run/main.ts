import {
  createInitialState,
  update,
  moveLeft,
  moveRight,
  jump,
  toggleSprint,
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

  // Sky based on day/night cycle
  const cyclePhase = state.dayNightCycle % 1;
  let skyColor1: string, skyColor2: string;

  if (state.isNight) {
    skyColor1 = '#0a0a1a';
    skyColor2 = '#1a1a3a';
  } else {
    const dayProgress = cyclePhase < 0.5 ? cyclePhase * 2 : 1;
    skyColor1 = `rgb(${Math.floor(100 + 100 * dayProgress)}, ${Math.floor(80 + 70 * dayProgress)}, ${Math.floor(60 + 40 * dayProgress)})`;
    skyColor2 = `rgb(${Math.floor(50 + 100 * dayProgress)}, ${Math.floor(40 + 60 * dayProgress)}, ${Math.floor(30 + 30 * dayProgress)})`;
  }

  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  skyGradient.addColorStop(0, skyColor1);
  skyGradient.addColorStop(1, skyColor2);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.5);

  // Stars at night
  if (state.isNight) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 30; i++) {
      const starX = (i * 47 + state.distance * 0.1) % width;
      const starY = (i * 31) % (height * 0.4);
      const starSize = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ruined buildings silhouette
  ctx.fillStyle = state.isNight ? '#0a0a15' : '#2a2a20';
  for (let i = 0; i < 10; i++) {
    const bw = 40 + Math.random() * 50;
    const bh = 50 + Math.random() * 80;
    const bx = ((i * width / 10) + state.distance * 0.15) % (width + 100) - 50;
    ctx.fillRect(bx, height * 0.5 - bh, bw, bh);

    // Broken windows
    ctx.fillStyle = state.isNight ? '#1a1a25' : '#3a3a30';
    for (let wy = height * 0.5 - bh + 10; wy < height * 0.5 - 10; wy += 20) {
      if (Math.random() > 0.5) {
        ctx.fillRect(bx + 8, wy, 10, 12);
      }
    }
    ctx.fillStyle = state.isNight ? '#0a0a15' : '#2a2a20';
  }

  // Ground
  const groundY = height * 0.75;
  ctx.fillStyle = state.isNight ? '#1a1a15' : '#3a3a2a';
  ctx.fillRect(0, groundY, width, height - groundY);

  // Cracked ground pattern
  ctx.strokeStyle = state.isNight ? '#252520' : '#4a4a3a';
  ctx.lineWidth = 2;
  const offset = (state.distance * 2) % 80;
  for (let x = -offset; x < width + 80; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + 20, groundY + 30);
    ctx.lineTo(x + 40, groundY + 10);
    ctx.stroke();
  }

  // Lane markers (faded road)
  const roadLeft = (width - LANE_WIDTH * LANE_COUNT) / 2;
  ctx.strokeStyle = state.isNight ? '#2a2a2533' : '#5a5a4a33';
  ctx.lineWidth = 3;
  ctx.setLineDash([15, 15]);
  for (let lane = 0; lane <= LANE_COUNT; lane++) {
    const laneX = roadLeft + lane * LANE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(laneX, groundY - 80);
    ctx.lineTo(laneX, groundY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Day/Night indicator
  ctx.fillStyle = state.isNight ? '#ffd93d' : '#f39c12';
  ctx.beginPath();
  ctx.arc(width - 30, 30, 15, 0, Math.PI * 2);
  ctx.fill();
  if (state.isNight) {
    ctx.fillStyle = skyColor1;
    ctx.beginPath();
    ctx.arc(width - 25, 28, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(): void {
  const { player } = state;
  const x = player.x;
  const y = player.y;

  // Sprint effect
  if (player.sprinting) {
    ctx.fillStyle = 'rgba(241, 196, 15, 0.3)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x - 10 - i * 10, y - PLAYER_HEIGHT / 2, 8 - i * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x + PLAYER_WIDTH / 2, y + 3, PLAYER_WIDTH / 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (survivor)
  ctx.fillStyle = '#4a7c59';
  ctx.fillRect(x, y - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);

  // Backpack
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(x + PLAYER_WIDTH - 5, y - PLAYER_HEIGHT + 10, 8, 25);

  // Head
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(x + PLAYER_WIDTH / 2, y - PLAYER_HEIGHT - 8, 10, 0, Math.PI * 2);
  ctx.fill();

  // Bandana
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(x + 3, y - PLAYER_HEIGHT - 12, PLAYER_WIDTH - 6, 5);
}

function drawZombie(zombie: typeof state.zombies[0]): void {
  let width: number, height: number;
  let bodyColor: string;

  switch (zombie.type) {
    case 'walker':
      width = 30;
      height = 45;
      bodyColor = '#4a7c59';
      break;
    case 'runner':
      width = 25;
      height = 40;
      bodyColor = '#3d6b4e';
      break;
    case 'crawler':
      width = 40;
      height = 25;
      bodyColor = '#2d5a3d';
      break;
    default:
      width = 30;
      height = 45;
      bodyColor = '#4a7c59';
  }

  const x = zombie.x - width / 2;
  const y = zombie.y;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(zombie.x, y + 2, width / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x, y - height, width, height);

  // Head
  if (zombie.type !== 'crawler') {
    ctx.fillStyle = '#5a8c69';
    ctx.beginPath();
    ctx.arc(zombie.x, y - height - 6, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Red eyes
  ctx.fillStyle = '#ff0000';
  const eyeY = zombie.type === 'crawler' ? y - height + 8 : y - height - 6;
  ctx.beginPath();
  ctx.arc(zombie.x - 3, eyeY, 2, 0, Math.PI * 2);
  ctx.arc(zombie.x + 3, eyeY, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHazard(hazard: typeof state.hazards[0]): void {
  const x = hazard.x - hazard.width / 2;
  const y = hazard.y;

  switch (hazard.type) {
    case 'fire':
      // Fire animation
      const firePhase = Date.now() / 100;
      for (let i = 0; i < 5; i++) {
        const flameHeight = hazard.height * (0.5 + 0.5 * Math.sin(firePhase + i));
        const flameX = x + i * (hazard.width / 5);
        ctx.fillStyle = i % 2 === 0 ? '#ff6600' : '#ff9900';
        ctx.beginPath();
        ctx.moveTo(flameX, y);
        ctx.lineTo(flameX + hazard.width / 10, y - flameHeight);
        ctx.lineTo(flameX + hazard.width / 5, y);
        ctx.closePath();
        ctx.fill();
      }
      break;

    case 'toxic':
      // Toxic puddle
      ctx.fillStyle = '#7cfc00';
      ctx.beginPath();
      ctx.ellipse(hazard.x, y - 5, hazard.width / 2, hazard.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bubbles
      ctx.fillStyle = '#9aff4d';
      const bubblePhase = Date.now() / 300;
      for (let i = 0; i < 3; i++) {
        const bubbleY = y - 10 - Math.abs(Math.sin(bubblePhase + i)) * 15;
        ctx.beginPath();
        ctx.arc(x + 10 + i * 15, bubbleY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'pitfall':
      // Dark pit
      ctx.fillStyle = '#111';
      ctx.fillRect(x, y - hazard.height, hazard.width, hazard.height + 20);
      // Edge
      ctx.fillStyle = '#333';
      ctx.fillRect(x - 5, y - hazard.height, 5, hazard.height + 20);
      ctx.fillRect(x + hazard.width, y - hazard.height, 5, hazard.height + 20);
      break;

    case 'barricade':
      // Wooden barricade
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(x, y - hazard.height, hazard.width, hazard.height);
      // Planks
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - hazard.height / 3);
      ctx.lineTo(x + hazard.width, y - hazard.height / 3);
      ctx.moveTo(x, y - hazard.height * 2 / 3);
      ctx.lineTo(x + hazard.width, y - hazard.height * 2 / 3);
      ctx.stroke();
      // Nails
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(x + 5, y - hazard.height / 3, 2, 0, Math.PI * 2);
      ctx.arc(x + hazard.width - 5, y - hazard.height / 3, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawResource(resource: typeof state.resources[0]): void {
  const x = resource.x;
  const y = resource.y;
  const bobOffset = Math.sin(Date.now() / 200) * 3;

  ctx.save();
  ctx.translate(x, y + bobOffset);

  let bgColor: string, iconColor: string, icon: string;

  switch (resource.type) {
    case 'food':
      bgColor = '#f39c12';
      iconColor = '#fff';
      icon = 'F';
      break;
    case 'water':
      bgColor = '#3498db';
      iconColor = '#fff';
      icon = 'W';
      break;
    case 'medkit':
      bgColor = '#e74c3c';
      iconColor = '#fff';
      icon = '+';
      break;
    case 'ammo':
      bgColor = '#95a5a6';
      iconColor = '#2c3e50';
      icon = 'A';
      break;
    default:
      bgColor = '#fff';
      iconColor = '#000';
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
  ctx.fillStyle = iconColor;
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

  // Draw resources
  for (const resource of state.resources) {
    if (!resource.collected) drawResource(resource);
  }

  // Draw hazards
  for (const hazard of state.hazards) {
    drawHazard(hazard);
  }

  // Draw zombies
  for (const zombie of state.zombies) {
    drawZombie(zombie);
  }

  // Draw player
  drawPlayer();

  // Draw particles
  drawParticles();

  // Update UI
  document.getElementById('score-display')!.textContent = Math.floor(state.score).toString();
  document.getElementById('days-display')!.textContent = state.survivalDays.toString();
  document.getElementById('hunger-display')!.textContent = Math.floor(state.hunger).toString();
  document.getElementById('thirst-display')!.textContent = Math.floor(state.thirst).toString();

  // Hunger/thirst color
  const hungerEl = document.getElementById('hunger-display')!;
  const thirstEl = document.getElementById('thirst-display')!;
  hungerEl.style.color = state.hunger < 30 ? '#e74c3c' : '#f39c12';
  thirstEl.style.color = state.thirst < 30 ? '#e74c3c' : '#3498db';

  // Stamina bar
  const staminaBar = document.getElementById('stamina-bar')!;
  const staminaPercent = (state.player.stamina / state.player.maxStamina) * 100;
  staminaBar.style.width = `${staminaPercent}%`;
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
    <div class="stat-item"><span class="stat-label">${t('game.survivalDays')}</span><span class="stat-value">${stats.survivalDays}</span></div>
    <div class="stat-item"><span class="stat-label">${t('game.resources')}</span><span class="stat-value">${stats.resourcesCollected}</span></div>
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
      case 'shift':
        toggleSprint(state, true);
        break;
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
      toggleSprint(state, false);
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
  document.getElementById('sprint-btn')!.addEventListener('touchstart', (e) => {
    e.preventDefault();
    toggleSprint(state, true);
  });
  document.getElementById('sprint-btn')!.addEventListener('touchend', (e) => {
    e.preventDefault();
    toggleSprint(state, false);
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
