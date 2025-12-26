import { StationSprintGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const ticketsDisplay = document.getElementById("tickets-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: StationSprintGame;
let animationFrame: number | null = null;
let pillars: { x: number }[] = [];

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) => i18n.loadTranslations(locale as Locale, trans));
  const browserLang = navigator.language;
  if (browserLang.includes("zh")) i18n.setLocale("zh-TW");
  else if (browserLang.includes("ja")) i18n.setLocale("ja");
  else i18n.setLocale("en");
  languageSelect.value = i18n.getLocale();
  updateTexts();
  languageSelect.addEventListener("change", () => { i18n.setLocale(languageSelect.value as Locale); updateTexts(); });
}

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  resizeCanvas();
  initBackground();
  game = new StationSprintGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function initBackground(): void {
  pillars = [];
  for (let i = 0; i < 4; i++) {
    pillars.push({ x: i * 130 + 50 });
  }
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");
  const slideBtn = document.getElementById("slide-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  slideBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.slide(); });
}

function resizeCanvas(): void {
  canvas.width = Math.min(canvas.parentElement!.getBoundingClientRect().width, 450);
  canvas.height = 400;
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;
  const groundY = height - 80;

  // Station platform background
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(0, 0, width, height);

  // Arched ceiling
  ctx.fillStyle = '#bdbdbd';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(width / 2, 60, width, 0);
  ctx.lineTo(width, 50);
  ctx.quadraticCurveTo(width / 2, 100, 0, 50);
  ctx.closePath();
  ctx.fill();

  // Support pillars
  const pillarSpeed = state.phase === 'playing' ? state.speed * 0.08 : 0.06;
  pillars.forEach(pillar => {
    pillar.x -= pillarSpeed;
    if (pillar.x < -30) {
      pillar.x = width + 100;
    }
    drawPillar(pillar.x, 50, groundY - 50);
  });

  // Train arrival board
  ctx.fillStyle = '#212121';
  ctx.fillRect(15, 60, 120, 50);
  ctx.fillStyle = '#ff5722';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('PLATFORM 3', 22, 78);
  ctx.fillStyle = '#4caf50';
  ctx.fillText('DEPARTING', 22, 92);
  ctx.fillStyle = '#ffeb3b';
  const countdown = Math.max(0, Math.floor(state.countdown));
  ctx.fillText(`00:${countdown.toString().padStart(2, '0')}`, 22, 106);

  // Platform edge (yellow safety line)
  ctx.fillStyle = '#ffeb3b';
  ctx.fillRect(0, groundY - 5, width, 5);

  // Platform floor
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(0, groundY, width, 30);

  // Floor tiles
  ctx.strokeStyle = '#757575';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, groundY);
    ctx.lineTo(i, height);
    ctx.stroke();
  }

  // Track area
  ctx.fillStyle = '#424242';
  ctx.fillRect(0, groundY + 30, width, 50);

  // Rails
  ctx.fillStyle = '#616161';
  ctx.fillRect(0, groundY + 40, width, 4);
  ctx.fillRect(0, groundY + 55, width, 4);

  // Lane dividers
  ctx.strokeStyle = 'rgba(255, 87, 34, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 14]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), 0);
    ctx.lineTo(i * (width / 3), groundY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Countdown meter
  drawCountdownMeter(state.countdown);

  if (state.phase === 'idle') {
    ctx.fillStyle = 'rgba(255, 87, 34, 0.9)';
    ctx.font = '18px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText(i18n.t('game.controls'), width / 2, height / 2 - 20);
    return;
  }

  // Particles
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawPillar(x: number, y: number, height: number): void {
  // Pillar base
  ctx.fillStyle = '#757575';
  ctx.fillRect(x - 15, y, 30, height);
  // Pillar detail
  ctx.fillStyle = '#616161';
  ctx.fillRect(x - 18, y, 36, 8);
  ctx.fillRect(x - 18, y + height - 8, 36, 8);
}

function drawCountdownMeter(countdown: number): void {
  const barWidth = 100;
  const barHeight = 12;
  const x = width - barWidth - 20;
  const y = 20;
  const width = canvas.width;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(x, y, barWidth, barHeight);

  const pct = countdown / 100;
  const color = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  ctx.strokeStyle = '#ff5722';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.fillStyle = '#212121';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(countdown)}s`, x + barWidth / 2, y + 10);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding commuter
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-16, 4, 32, 11);
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(-5, 4, 6, 0, Math.PI * 2);
    ctx.fill();
    // Briefcase
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(6, 2, 12, 10);
  } else {
    const legAngle = player.isJumping ? 0.15 : Math.sin(Date.now() * 0.02) * 0.4;

    // Briefcase
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(10, -5, 12, 18);
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(10, -8, 12, 4);

    // Body (suit)
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-9, -18, 18, 26);

    // Tie
    ctx.fillStyle = '#ff5722';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-2, 3);
    ctx.lineTo(0, 6);
    ctx.lineTo(2, 3);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(0, -24, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(0, -28, 8, Math.PI, 0);
    ctx.fill();

    // Worried face
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-3, -25, 1.5, 0, Math.PI * 2);
    ctx.arc(3, -25, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(-5 - Math.cos(legAngle) * 7, 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(5 + Math.cos(legAngle) * 7, 24);
    ctx.stroke();

    // Shoes
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(-5 - Math.cos(legAngle) * 7, 26, 4, 0, Math.PI * 2);
    ctx.arc(5 + Math.cos(legAngle) * 7, 26, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case 'bench':
      // Bench seat
      ctx.fillStyle = '#795548';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, 10);
      // Bench back
      ctx.fillRect(-obs.width / 2, -obs.height / 2 - 15, obs.width, 8);
      // Legs
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2 + 10, 6, obs.height - 10);
      ctx.fillRect(obs.width / 2 - 11, -obs.height / 2 + 10, 6, obs.height - 10);
      break;

    case 'pillar':
      ctx.fillStyle = '#757575';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = '#616161';
      ctx.fillRect(-obs.width / 2 - 3, -obs.height / 2, obs.width + 6, 8);
      ctx.fillRect(-obs.width / 2 - 3, obs.height / 2 - 8, obs.width + 6, 8);
      break;

    case 'vendor':
      // Vending machine body
      ctx.fillStyle = '#c62828';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Display window
      ctx.fillStyle = '#fff';
      ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2 + 5, obs.width - 10, 25);
      // Buttons
      ctx.fillStyle = '#212121';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-10 + i * 10, obs.height / 2 - 15, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'luggage':
      // Suitcase
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Handle
      ctx.fillStyle = '#0d47a1';
      ctx.fillRect(-5, -obs.height / 2 - 10, 10, 12);
      // Wheels
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(-obs.width / 2 + 6, obs.height / 2, 4, 0, Math.PI * 2);
      ctx.arc(obs.width / 2 - 6, obs.height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'ticket-gate':
      // Gate pillars
      ctx.fillStyle = '#546e7a';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, 10, obs.height);
      ctx.fillRect(obs.width / 2 - 10, -obs.height / 2, 10, obs.height);
      // Top bar
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, 8);
      // Sensor
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 20, 5, 0, Math.PI * 2);
      ctx.fill();
      // Card reader
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(-8, 0, 16, 10);
      break;

    case 'sign':
      // Sign board
      ctx.fillStyle = '#ff5722';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PLATFORM 3 →', 0, 3);
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);
  const pulse = Math.sin(Date.now() * 0.008) * 0.13 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case 'ticket':
      // Train ticket
      ctx.fillStyle = '#ff5722';
      ctx.fillRect(-14, -8, 28, 16);
      // Perforation
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      // Text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TICKET', 0, -2);
      break;

    case 'coin':
      // Gold coin
      ctx.fillStyle = '#ffc107';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8f00';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffc107';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
      break;

    case 'watch':
      // Wristwatch
      ctx.fillStyle = '#607d8b';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      // Watch face
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      // Hands
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -4);
      ctx.moveTo(0, 0);
      ctx.lineTo(3, 2);
      ctx.stroke();
      // Band
      ctx.fillStyle = '#455a64';
      ctx.fillRect(-12, -3, 4, 6);
      ctx.fillRect(8, -3, 4, 6);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + 'm';
  ticketsDisplay.textContent = state.tickets.toString();
  coinsDisplay.textContent = state.coins.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameover');
  overlayMsg.textContent = i18n.t('game.finalScore');
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = 'block';
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t('game.distance')}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.tickets')}</div><div class="stat-value">${state.tickets}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.coins')}</div><div class="stat-value">${state.coins}</div></div>
  `;
  statsGrid.style.display = 'grid';
  startBtn.textContent = i18n.t('game.restart');
}

function startGame(): void {
  overlay.style.display = 'none';
  finalScoreDisplay.style.display = 'none';
  statsGrid.style.display = 'none';
  game.start();
}

startBtn.addEventListener('click', startGame);
window.addEventListener('beforeunload', () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();
