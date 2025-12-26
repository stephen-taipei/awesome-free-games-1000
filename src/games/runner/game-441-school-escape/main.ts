import { SchoolEscapeGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const candiesDisplay = document.getElementById("candies-display")!;
const comicsDisplay = document.getElementById("comics-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: SchoolEscapeGame;
let animationFrame: number | null = null;
let lockers: { x: number; color: string }[] = [];

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
  game = new SchoolEscapeGame();
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
  lockers = [];
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12'];
  for (let i = 0; i < 12; i++) {
    lockers.push({
      x: i * 45,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
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

  // School hallway background
  ctx.fillStyle = '#ecf0f1';
  ctx.fillRect(0, 0, width, height);

  // Ceiling
  ctx.fillStyle = '#bdc3c7';
  ctx.fillRect(0, 0, width, 30);

  // Fluorescent lights
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(50 + i * 150, 8, 80, 14);
    ctx.strokeStyle = '#95a5a6';
    ctx.strokeRect(50 + i * 150, 8, 80, 14);
  }

  // Wall with lockers
  const lockerSpeed = state.phase === 'playing' ? state.speed * 0.15 : 0.1;
  lockers.forEach(locker => {
    locker.x -= lockerSpeed;
    if (locker.x < -45) {
      locker.x = width + 10;
      const colors = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12'];
      locker.color = colors[Math.floor(Math.random() * colors.length)];
    }
    drawLocker(locker.x, 40, locker.color);
  });

  // Floor
  ctx.fillStyle = '#7f8c8d';
  ctx.fillRect(0, groundY, width, 30);

  // Floor tiles pattern
  ctx.strokeStyle = '#95a5a6';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, groundY);
    ctx.lineTo(i, height);
    ctx.stroke();
  }

  // Baseboard
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(0, groundY + 30, width, 50);

  // Lane dividers
  ctx.strokeStyle = 'rgba(52, 73, 94, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 15]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY);
    ctx.lineTo(i * (width / 3), height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Suspicion meter
  drawSuspicionMeter(state.suspicion);

  if (state.phase === 'idle') {
    ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
    ctx.font = '18px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText(i18n.t('game.controls'), width / 2, height / 2);
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

function drawLocker(x: number, y: number, color: string): void {
  // Locker body
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 40, 100);

  // Locker door lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y + 2, 36, 96);

  // Vent slots
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 8, y + 8 + i * 8, 24, 3);
  }

  // Handle
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(x + 30, y + 50, 6, 12);
}

function drawSuspicionMeter(suspicion: number): void {
  const barWidth = 100;
  const barHeight = 12;
  const x = 20;
  const y = 20;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(x, y, barWidth, barHeight);

  const pct = suspicion / 100;
  const color = pct < 0.4 ? '#27ae60' : pct < 0.7 ? '#f39c12' : '#e74c3c';
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.fillStyle = '#2c3e50';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(suspicion)}%`, x + barWidth / 2, y + 10);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding student
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-16, 4, 32, 10);
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(-6, 4, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Running student
    const legAngle = player.isJumping ? 0.15 : Math.sin(Date.now() * 0.018) * 0.35;

    // Backpack
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(-12, -15, 10, 22);

    // Body (shirt)
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-8, -16, 16, 24);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(0, -22, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(0, -26, 7, Math.PI, 0);
    ctx.fill();

    // Shorts
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-7, 8, 14, 8);

    // Legs
    ctx.strokeStyle = '#f5d6ba';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-3, 16);
    ctx.lineTo(-5 - Math.cos(legAngle) * 6, 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, 16);
    ctx.lineTo(5 + Math.cos(legAngle) * 6, 26);
    ctx.stroke();

    // Sneakers
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-5 - Math.cos(legAngle) * 6, 28, 4, 0, Math.PI * 2);
    ctx.arc(5 + Math.cos(legAngle) * 6, 28, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case 'desk':
      // Desk top
      ctx.fillStyle = '#d35400';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, 8);
      // Desk legs
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2 + 8, 5, obs.height - 8);
      ctx.fillRect(obs.width / 2 - 10, -obs.height / 2 + 8, 5, obs.height - 8);
      break;

    case 'locker':
      ctx.fillStyle = '#9b59b6';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2 + 5 + i * 6, obs.width - 10, 3);
      }
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(obs.width / 2 - 8, 0, 5, 10);
      break;

    case 'teacher':
      // Teacher body
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-10, -obs.height / 2 + 18, 20, 32);
      // Head
      ctx.fillStyle = '#f5d6ba';
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      // Glasses
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-5, -obs.height / 2 + 8, 4, 0, Math.PI * 2);
      ctx.arc(5, -obs.height / 2 + 8, 4, 0, Math.PI * 2);
      ctx.stroke();
      // Hair/bald
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 5, 8, Math.PI, 0);
      ctx.fill();
      break;

    case 'mop-bucket':
      // Bucket
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2, -obs.height / 2);
      ctx.lineTo(-obs.width / 2 + 5, obs.height / 2);
      ctx.lineTo(obs.width / 2 - 5, obs.height / 2);
      ctx.lineTo(obs.width / 2, -obs.height / 2);
      ctx.closePath();
      ctx.fill();
      // Water
      ctx.fillStyle = '#3498db';
      ctx.fillRect(-obs.width / 2 + 3, -obs.height / 2 + 5, obs.width - 6, 8);
      // Mop handle
      ctx.fillStyle = '#d35400';
      ctx.fillRect(-2, -obs.height / 2 - 25, 4, 30);
      break;

    case 'trash-can':
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2, -obs.height / 2 + 5);
      ctx.lineTo(-obs.width / 2 + 4, obs.height / 2);
      ctx.lineTo(obs.width / 2 - 4, obs.height / 2);
      ctx.lineTo(obs.width / 2, -obs.height / 2 + 5);
      ctx.closePath();
      ctx.fill();
      // Lid
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(-obs.width / 2 - 2, -obs.height / 2, obs.width + 4, 8);
      break;

    case 'door':
      // Door frame above
      ctx.fillStyle = '#d35400';
      ctx.fillRect(-obs.width / 2, -5, obs.width, obs.height + 5);
      // "EXIT" sign
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-15, -obs.height / 2 - 5, 30, 12);
      ctx.fillStyle = '#fff';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', 0, -obs.height / 2 + 3);
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);
  const pulse = Math.sin(Date.now() * 0.007) * 0.12 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case 'candy':
      // Candy wrapper
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wrapper ends
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-18, -5);
      ctx.lineTo(-18, 5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(18, -5);
      ctx.lineTo(18, 5);
      ctx.closePath();
      ctx.fill();
      break;

    case 'comic':
      // Comic book
      ctx.fillStyle = '#3498db';
      ctx.fillRect(-10, -12, 20, 24);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-8, -10, 16, 12);
      // Star burst
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(0, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'phone':
      // Phone body
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-7, -12, 14, 24);
      // Screen
      ctx.fillStyle = '#3498db';
      ctx.fillRect(-5, -10, 10, 16);
      // Home button
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(0, 9, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + 'm';
  candiesDisplay.textContent = state.candies.toString();
  comicsDisplay.textContent = state.comics.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameover');
  overlayMsg.textContent = i18n.t('game.finalScore');
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = 'block';
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t('game.distance')}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.candies')}</div><div class="stat-value">${state.candies}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.comics')}</div><div class="stat-value">${state.comics}</div></div>
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
