import { AirportRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const passportsDisplay = document.getElementById("passports-display")!;
const ticketsDisplay = document.getElementById("tickets-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: AirportRunGame;
let animationFrame: number | null = null;
let windows: { x: number }[] = [];

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
  game = new AirportRunGame();
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
  windows = [];
  for (let i = 0; i < 6; i++) {
    windows.push({ x: i * 85 });
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

  // Airport terminal background
  ctx.fillStyle = '#eceff1';
  ctx.fillRect(0, 0, width, height);

  // Ceiling
  ctx.fillStyle = '#cfd8dc';
  ctx.fillRect(0, 0, width, 40);

  // Ceiling lights
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(30 + i * 100, 10, 60, 20);
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1;
    ctx.strokeRect(30 + i * 100, 10, 60, 20);
  }

  // Windows showing outside (runway/planes)
  const windowSpeed = state.phase === 'playing' ? state.speed * 0.1 : 0.08;
  windows.forEach(win => {
    win.x -= windowSpeed;
    if (win.x < -80) {
      win.x = width + 10;
    }
    drawWindow(win.x, 55);
  });

  // Gate signs
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(20, 150, 60, 25);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GATE A1', 50, 167);

  // Floor - polished tiles
  ctx.fillStyle = '#b0bec5';
  ctx.fillRect(0, groundY, width, 30);

  // Floor shine effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  for (let i = 0; i < width; i += 60) {
    ctx.fillRect(i, groundY, 30, 30);
  }

  // Baseboard
  ctx.fillStyle = '#546e7a';
  ctx.fillRect(0, groundY + 30, width, 50);

  // Lane dividers
  ctx.strokeStyle = 'rgba(33, 150, 243, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 14]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY);
    ctx.lineTo(i * (width / 3), height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Time meter
  drawTimeMeter(state.timeLeft);

  if (state.phase === 'idle') {
    ctx.fillStyle = 'rgba(21, 101, 192, 0.9)';
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

function drawWindow(x: number, y: number): void {
  // Window frame
  ctx.fillStyle = '#78909c';
  ctx.fillRect(x, y, 70, 80);
  // Window glass (sky)
  ctx.fillStyle = '#81d4fa';
  ctx.fillRect(x + 4, y + 4, 62, 72);
  // Plane silhouette
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 40);
  ctx.lineTo(x + 50, y + 35);
  ctx.lineTo(x + 55, y + 40);
  ctx.lineTo(x + 50, y + 45);
  ctx.lineTo(x + 20, y + 40);
  ctx.fill();
  // Runway
  ctx.fillStyle = '#37474f';
  ctx.fillRect(x + 4, y + 60, 62, 16);
}

function drawTimeMeter(timeLeft: number): void {
  const barWidth = 100;
  const barHeight = 12;
  const x = 20;
  const y = 20;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(x, y, barWidth, barHeight);

  const pct = timeLeft / 100;
  const color = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  ctx.strokeStyle = '#1565c0';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.fillStyle = '#1565c0';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(timeLeft)}s`, x + barWidth / 2, y + 10);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding traveler
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(-16, 4, 32, 11);
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(-5, 4, 6, 0, Math.PI * 2);
    ctx.fill();
    // Suitcase
    ctx.fillStyle = '#795548';
    ctx.fillRect(6, 2, 12, 10);
  } else {
    const legAngle = player.isJumping ? 0.15 : Math.sin(Date.now() * 0.02) * 0.4;

    // Rolling suitcase behind
    ctx.fillStyle = '#795548';
    ctx.fillRect(-18, 5, 14, 18);
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(-14, 25, 3, 0, Math.PI * 2);
    ctx.arc(-8, 25, 3, 0, Math.PI * 2);
    ctx.fill();
    // Suitcase handle
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, 5);
    ctx.lineTo(-11, -10);
    ctx.lineTo(-5, -10);
    ctx.stroke();

    // Body (business casual)
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(-8, -17, 16, 25);

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.arc(0, -23, 9, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(0, -27, 8, Math.PI, 0);
    ctx.fill();

    // Worried expression
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-3, -24, 1.5, 0, Math.PI * 2);
    ctx.arc(3, -24, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-3, 8);
    ctx.lineTo(-5 - Math.cos(legAngle) * 7, 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, 8);
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
    case 'luggage-cart':
      // Cart base
      ctx.fillStyle = '#78909c';
      ctx.fillRect(-obs.width / 2, -obs.height / 2 + 10, obs.width, obs.height - 15);
      // Handle
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2 + 5, -obs.height / 2);
      ctx.lineTo(-obs.width / 2 + 5, -obs.height / 2 - 15);
      ctx.lineTo(obs.width / 2 - 5, -obs.height / 2 - 15);
      ctx.stroke();
      // Luggage on cart
      ctx.fillStyle = '#795548';
      ctx.fillRect(-obs.width / 2 + 8, -obs.height / 2 + 5, 15, 12);
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(-obs.width / 2 + 25, -obs.height / 2 + 3, 12, 14);
      // Wheels
      ctx.fillStyle = '#37474f';
      ctx.beginPath();
      ctx.arc(-obs.width / 2 + 8, obs.height / 2, 4, 0, Math.PI * 2);
      ctx.arc(obs.width / 2 - 8, obs.height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'security-gate':
      // Gate frame
      ctx.fillStyle = '#546e7a';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, 8, obs.height);
      ctx.fillRect(obs.width / 2 - 8, -obs.height / 2, 8, obs.height);
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, 10);
      // Gate sensor
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 20, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'crowd':
      // Group of people
      for (let i = 0; i < 3; i++) {
        const px = -12 + i * 12;
        ctx.fillStyle = ['#1565c0', '#c62828', '#2e7d32'][i];
        ctx.fillRect(px - 6, -obs.height / 2 + 18, 12, 28);
        ctx.fillStyle = '#f5d6ba';
        ctx.beginPath();
        ctx.arc(px, -obs.height / 2 + 10, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'cleaning-cart':
      // Cart body
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height - 5);
      // Warning stripes
      ctx.fillStyle = '#f44336';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-obs.width / 2 + 5 + i * 14, -obs.height / 2 + 3, 8, obs.height - 10);
      }
      // Mop handle
      ctx.fillStyle = '#795548';
      ctx.fillRect(obs.width / 2 - 8, -obs.height / 2 - 25, 4, 30);
      // Wheels
      ctx.fillStyle = '#37474f';
      ctx.beginPath();
      ctx.arc(-obs.width / 2 + 6, obs.height / 2 - 2, 4, 0, Math.PI * 2);
      ctx.arc(obs.width / 2 - 6, obs.height / 2 - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'sign-post':
      // Sign board
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GATE B2 →', 0, 3);
      break;

    case 'barrier':
      // Rope stanchions
      ctx.fillStyle = '#78909c';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, 6, obs.height);
      ctx.fillRect(obs.width / 2 - 6, -obs.height / 2, 6, obs.height);
      // Rope
      ctx.strokeStyle = '#c62828';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2 + 3, -obs.height / 2 + 8);
      ctx.quadraticCurveTo(0, 5, obs.width / 2 - 3, -obs.height / 2 + 8);
      ctx.stroke();
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
    case 'passport':
      // Passport book
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(-10, -12, 20, 24);
      // Gold emblem
      ctx.fillStyle = '#ffc107';
      ctx.beginPath();
      ctx.arc(0, -3, 6, 0, Math.PI * 2);
      ctx.fill();
      // Text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PASSPORT', 0, 8);
      break;

    case 'ticket':
      // Boarding pass
      ctx.fillStyle = '#fff';
      ctx.fillRect(-14, -8, 28, 16);
      // Airline stripe
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(-14, -8, 28, 5);
      // Barcode
      ctx.fillStyle = '#000';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(-10 + i * 3, 2, 2, 4);
      }
      break;

    case 'coffee':
      // Coffee cup
      ctx.fillStyle = '#795548';
      ctx.beginPath();
      ctx.moveTo(-8, -10);
      ctx.lineTo(-6, 10);
      ctx.lineTo(6, 10);
      ctx.lineTo(8, -10);
      ctx.closePath();
      ctx.fill();
      // Lid
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(-9, -12, 18, 5);
      // Steam
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, -14);
      ctx.quadraticCurveTo(-5, -18, -3, -22);
      ctx.moveTo(3, -14);
      ctx.quadraticCurveTo(5, -18, 3, -22);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + 'm';
  passportsDisplay.textContent = state.passports.toString();
  ticketsDisplay.textContent = state.tickets.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = 'flex';
  overlayTitle.textContent = i18n.t('game.gameover');
  overlayMsg.textContent = i18n.t('game.finalScore');
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = 'block';
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t('game.distance')}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.passports')}</div><div class="stat-value">${state.passports}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t('game.tickets')}</div><div class="stat-value">${state.tickets}</div></div>
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
