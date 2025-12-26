import { PixelAdventureRunGame, GameState, Obstacle, Collectible } from "./game";
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

let game: PixelAdventureRunGame;
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
  game = new PixelAdventureRunGame();
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

function setupMobileControls(): void {
  document.getElementById("left-btn")?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  document.getElementById("right-btn")?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  document.getElementById("jump-btn")?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
}

function resizeCanvas(): void {
  canvas.width = Math.min(canvas.parentElement!.getBoundingClientRect().width, 450);
  canvas.height = 400;
}

function startRenderLoop(): void {
  const render = () => { drawGame(game.getState()); animationFrame = requestAnimationFrame(render); };
  animationFrame = requestAnimationFrame(render);
}

function drawPixelRect(x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Sky gradient (pixelated look)
  drawPixelRect(0, 0, width, height * 0.6, "#87ceeb");
  drawPixelRect(0, height * 0.6, width, height * 0.4, "#98d8c8");

  // Pixel clouds
  for (let i = 0; i < 4; i++) {
    const cloudX = ((i * 120 + Date.now() * 0.02) % (width + 80)) - 40;
    drawPixelRect(cloudX, 40 + i * 30, 48, 16, "#fff");
    drawPixelRect(cloudX + 8, 32 + i * 30, 32, 8, "#fff");
  }

  // Ground
  const groundY = height - 80;
  drawPixelRect(0, groundY + 20, width, 60, "#8b5a2b");
  drawPixelRect(0, groundY + 20, width, 8, "#6b8e23");

  // Grass tufts
  for (let i = 0; i < width; i += 24) {
    drawPixelRect(i, groundY + 16, 8, 8, "#228b22");
    drawPixelRect(i + 12, groundY + 12, 8, 12, "#228b22");
  }

  // Lane dividers
  ctx.strokeStyle = "#6b8e23aa";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "#333";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles
  state.particles.forEach((p) => {
    ctx.globalAlpha = p.life / p.maxLife;
    drawPixelRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, p.color);
    ctx.globalAlpha = 1;
  });

  // Collectibles
  state.collectibles.forEach((col) => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach((obs) => drawObstacle(obs));

  // Player
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  const x = player.x - player.width / 2;
  const y = player.y - player.height / 2;

  // Star effect
  if (state.hasShield) {
    const blink = Math.sin(Date.now() * 0.02) > 0;
    if (blink) {
      drawPixelRect(x - 4, y - 4, player.width + 8, player.height + 8, "#ffd700aa");
    }
  }

  // Body
  drawPixelRect(x + 8, y + 8, 16, 24, "#4169e1");
  // Head
  drawPixelRect(x + 8, y, 16, 12, "#ffdab9");
  // Hair
  drawPixelRect(x + 8, y, 16, 4, "#8b4513");
  // Eyes
  drawPixelRect(x + 12, y + 4, 4, 4, "#000");
  drawPixelRect(x + 20, y + 4, 4, 4, "#000");
  // Legs animation
  const legFrame = Math.floor(player.frame) % 2;
  if (legFrame === 0) {
    drawPixelRect(x + 8, y + 32, 6, 8, "#333");
    drawPixelRect(x + 18, y + 28, 6, 12, "#333");
  } else {
    drawPixelRect(x + 8, y + 28, 6, 12, "#333");
    drawPixelRect(x + 18, y + 32, 6, 8, "#333");
  }
}

function drawObstacle(obs: Obstacle): void {
  const x = obs.x - obs.width / 2;
  const y = obs.y - obs.height / 2;

  switch (obs.type) {
    case "slime":
      drawPixelRect(x, y + 8, obs.width, obs.height - 8, "#32cd32");
      drawPixelRect(x + 4, y + 4, obs.width - 8, 8, "#32cd32");
      drawPixelRect(x + 8, y + 8, 4, 4, "#000");
      drawPixelRect(x + 20, y + 8, 4, 4, "#000");
      break;
    case "spike":
      drawPixelRect(x + 12, y, 8, obs.height, "#808080");
      drawPixelRect(x + 8, y + 8, 16, obs.height - 8, "#808080");
      drawPixelRect(x + 12, y - 4, 8, 8, "#c0c0c0");
      break;
    case "bat":
      drawPixelRect(x + 8, y + 8, 16, 12, "#4a0080");
      drawPixelRect(x, y + 4, 8, 8, "#4a0080");
      drawPixelRect(x + 24, y + 4, 8, 8, "#4a0080");
      drawPixelRect(x + 10, y + 10, 4, 4, "#ff0");
      drawPixelRect(x + 18, y + 10, 4, 4, "#ff0");
      break;
    case "crate":
      drawPixelRect(x, y, obs.width, obs.height, "#deb887");
      drawPixelRect(x + 4, y + 4, obs.width - 8, obs.height - 8, "#d2b48c");
      drawPixelRect(x + obs.width / 2 - 4, y + 4, 8, obs.height - 8, "#8b4513");
      drawPixelRect(x + 4, y + obs.height / 2 - 4, obs.width - 8, 8, "#8b4513");
      break;
  }
}

function drawCollectible(col: Collectible): void {
  const x = col.x - 12;
  const y = col.y - 12;
  const bounce = Math.sin(Date.now() * 0.005) * 4;

  switch (col.type) {
    case "coin":
      drawPixelRect(x + 4, y + bounce, 16, 24, "#ffd700");
      drawPixelRect(x + 8, y + 4 + bounce, 8, 16, "#ffec8b");
      break;
    case "heart":
      drawPixelRect(x + 4, y + 4 + bounce, 8, 8, "#ff1493");
      drawPixelRect(x + 12, y + 4 + bounce, 8, 8, "#ff1493");
      drawPixelRect(x + 4, y + 8 + bounce, 16, 8, "#ff1493");
      drawPixelRect(x + 8, y + 16 + bounce, 8, 4, "#ff1493");
      break;
    case "star":
      drawPixelRect(x + 8, y + bounce, 8, 24, "#ffff00");
      drawPixelRect(x, y + 8 + bounce, 24, 8, "#ffff00");
      drawPixelRect(x + 4, y + 4 + bounce, 4, 4, "#ffff00");
      drawPixelRect(x + 16, y + 4 + bounce, 4, 4, "#ffff00");
      drawPixelRect(x + 4, y + 16 + bounce, 4, 4, "#ffff00");
      drawPixelRect(x + 16, y + 16 + bounce, 4, 4, "#ffff00");
      break;
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance) + "m";
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
