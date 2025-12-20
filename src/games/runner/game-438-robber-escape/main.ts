import { RobberEscapeGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const goldDisplay = document.getElementById("gold-display")!;
const diamondsDisplay = document.getElementById("diamonds-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: RobberEscapeGame;
let animationFrame: number | null = null;
let vaultWalls: { x: number; height: number }[] = [];

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
  game = new RobberEscapeGame();
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
  vaultWalls = [];
  for (let i = 0; i < 6; i++) {
    vaultWalls.push({
      x: i * 100,
      height: 250 + Math.random() * 50,
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

  // Bank vault background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#1a1a2e");
  bgGradient.addColorStop(0.5, "#16213e");
  bgGradient.addColorStop(1, "#0f0f23");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Vault walls
  const wallSpeed = state.phase === "playing" ? state.speed * 0.15 : 0.1;
  vaultWalls.forEach(wall => {
    wall.x -= wallSpeed;
    if (wall.x < -60) {
      wall.x = width + 40;
      wall.height = 250 + Math.random() * 50;
    }
    drawVaultWall(wall.x, groundY, wall.height);
  });

  // Floor - marble tiles
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(0, groundY, width, 80);

  // Tile pattern
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, groundY);
    ctx.lineTo(i, height);
    ctx.stroke();
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(241, 196, 15, 0.2)";
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 15]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY);
    ctx.lineTo(i * (width / 3), height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Alert level indicator
  drawAlertIndicator(state.alertLevel);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
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

function drawVaultWall(x: number, groundY: number, height: number): void {
  const y = groundY - height;

  // Steel wall
  ctx.fillStyle = "#34495e";
  ctx.fillRect(x, y, 50, height);

  // Rivets
  ctx.fillStyle = "#7f8c8d";
  for (let row = 0; row < height / 40; row++) {
    ctx.beginPath();
    ctx.arc(x + 10, y + 20 + row * 40, 4, 0, Math.PI * 2);
    ctx.arc(x + 40, y + 20 + row * 40, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAlertIndicator(alertLevel: number): void {
  const barWidth = 100;
  const barHeight = 12;
  const x = 20;
  const y = 20;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(x, y, barWidth, barHeight);

  const pct = alertLevel / 100;
  const color = pct < 0.3 ? "#27ae60" : pct < 0.6 ? "#f39c12" : "#e74c3c";
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  // Flashing when high
  if (pct > 0.7) {
    ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.3;
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  // Alarm icon
  ctx.fillStyle = pct > 0.5 ? "#e74c3c" : "#7f8c8d";
  ctx.font = "14px sans-serif";
  ctx.fillText("🚨", x + barWidth + 8, y + 11);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding pose
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-20, 5, 40, 15);
    ctx.fillStyle = "#1a252f";
    ctx.beginPath();
    ctx.arc(-10, 5, 8, 0, Math.PI * 2);
    ctx.fill();
    // Money bag
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(10, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Running pose - robber with mask
    const legAngle = player.isJumping ? 0.2 : Math.sin(Date.now() * 0.02) * 0.4;

    // Body (dark clothes)
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-12, -18, 24, 28);

    // Head with mask
    ctx.fillStyle = "#1a252f";
    ctx.beginPath();
    ctx.arc(0, -22, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eyes through mask
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-4, -24, 3, 0, Math.PI * 2);
    ctx.arc(4, -24, 3, 0, Math.PI * 2);
    ctx.fill();

    // Money bag on back
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.ellipse(8, -5, 12, 15, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("$", 10, 0);

    // Legs
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-5, 10);
    ctx.lineTo(-8 - Math.cos(legAngle) * 8, 25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(8 + Math.cos(legAngle) * 8, 25);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "safe":
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "#34495e";
      ctx.beginPath();
      ctx.arc(8, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.lineTo(8, 5);
      ctx.stroke();
      break;

    case "vault":
      ctx.fillStyle = "#95a5a6";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 4;
      ctx.stroke();
      // Handle
      ctx.fillStyle = "#f1c40f";
      ctx.fillRect(-5, -2, 10, 4);
      break;

    case "laser":
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2, 0);
      ctx.lineTo(obs.width / 2, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      // Glow effect
      ctx.shadowColor = "#e74c3c";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2, 0);
      ctx.lineTo(obs.width / 2, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;

    case "guard":
      // Guard body
      ctx.fillStyle = "#34495e";
      ctx.fillRect(-12, -obs.height / 2 + 15, 24, 35);
      // Head
      ctx.fillStyle = "#f5d6ba";
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      // Cap
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(-12, -obs.height / 2, 24, 8);
      break;

    case "camera":
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(-5, 0, 10, 15);
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.arc(0, -5, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, -5, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "alarm":
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      // Blinking light
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.5;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);
  const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "gold":
      ctx.fillStyle = "#f1c40f";
      ctx.fillRect(-12, -6, 24, 12);
      ctx.fillStyle = "#e67e22";
      ctx.fillRect(-10, -4, 20, 8);
      break;

    case "diamond":
      ctx.fillStyle = "#3498db";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#5dade2";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case "cash":
      ctx.fillStyle = "#27ae60";
      ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("$", 0, 4);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  goldDisplay.textContent = state.gold.toString();
  diamondsDisplay.textContent = state.diamonds.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.gold")}</div><div class="stat-value">${state.gold}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.diamonds")}</div><div class="stat-value">${state.diamonds}</div></div>
  `;
  statsGrid.style.display = "grid";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  statsGrid.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
window.addEventListener("beforeunload", () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();
