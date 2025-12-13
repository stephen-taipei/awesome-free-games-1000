import { SnowSlideGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: SnowSlideGame;
let animationFrame: number | null = null;

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
  game = new SnowSlideGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
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

  // Sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#87CEEB");
  skyGradient.addColorStop(0.6, "#B0E0E6");
  skyGradient.addColorStop(1, "#E0FFFF");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Mountains in background
  ctx.fillStyle = "#A8C8D8";
  drawMountain(50, height - 150, 120, 100);
  drawMountain(200, height - 180, 150, 130);
  drawMountain(350, height - 140, 100, 90);

  // Snow ground
  const groundY = height - 60;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, groundY + 25, width, 40);

  // Lane markers
  ctx.strokeStyle = "rgba(100, 149, 237, 0.3)";
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Snowflakes
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  state.snowflakes.forEach(flake => {
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
    ctx.fill();
  });

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(0, 0, 100, 0.6)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);

  // Boost indicator
  if (state.hasBoost) {
    ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
    ctx.fillRect(0, 0, width, 5);
  }
}

function drawMountain(x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w / 2, y - h);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();

  // Snow cap
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - h);
  ctx.lineTo(x + w / 2 - 15, y - h + 25);
  ctx.lineTo(x + w / 2 + 15, y - h + 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#A8C8D8";
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Boost glow
  if (state.hasBoost) {
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 20;
  }

  // Skier body
  ctx.fillStyle = "#E74C3C";
  ctx.beginPath();
  ctx.ellipse(0, -10, 12, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#FFE4C4";
  ctx.beginPath();
  ctx.arc(0, -35, 10, 0, Math.PI * 2);
  ctx.fill();

  // Goggles
  ctx.fillStyle = "#333";
  ctx.fillRect(-8, -38, 16, 6);
  ctx.fillStyle = "#00BFFF";
  ctx.fillRect(-6, -37, 5, 4);
  ctx.fillRect(1, -37, 5, 4);

  // Skis
  ctx.fillStyle = "#4169E1";
  ctx.fillRect(-18, 15, 36, 5);
  ctx.fillRect(-20, 15, 5, 5);
  ctx.fillRect(15, 15, 5, 5);

  // Poles
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -5);
  ctx.lineTo(-20, 15);
  ctx.moveTo(10, -5);
  ctx.lineTo(20, 15);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "tree":
      // Trunk
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(-5, 10, 10, 20);
      // Foliage
      ctx.fillStyle = "#228B22";
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(-20, 10);
      ctx.lineTo(20, 10);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.closePath();
      ctx.fill();
      // Snow
      ctx.fillStyle = "#FFF";
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(-8, -18);
      ctx.lineTo(8, -18);
      ctx.closePath();
      ctx.fill();
      break;

    case "rock":
      ctx.fillStyle = "#696969";
      ctx.beginPath();
      ctx.ellipse(0, 5, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#808080";
      ctx.beginPath();
      ctx.ellipse(-5, 0, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "snowman":
      ctx.fillStyle = "#FFF";
      ctx.beginPath();
      ctx.arc(0, 15, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -5, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -20, 8, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-3, -22, 2, 0, Math.PI * 2);
      ctx.arc(3, -22, 2, 0, Math.PI * 2);
      ctx.fill();
      // Carrot nose
      ctx.fillStyle = "#FF6600";
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(8, -17);
      ctx.lineTo(0, -16);
      ctx.closePath();
      ctx.fill();
      break;

    case "log":
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#A0522D";
      ctx.beginPath();
      ctx.arc(-25, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(25, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "coin":
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFA500";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("$", 0, 4);
      break;

    case "gem":
      ctx.fillStyle = "#00CED1";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#40E0D0";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case "boost":
      ctx.fillStyle = "#FF4500";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, 0);
      ctx.lineTo(3, 0);
      ctx.lineTo(3, 12);
      ctx.lineTo(-3, 12);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  coinsDisplay.textContent = state.coins.toString();
  speedDisplay.textContent = state.speed.toFixed(1);
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.coins")}</div><div class="stat-value">${state.coins}</div></div>
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
