import { RocketBootRunGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const fuelFill = document.getElementById("fuel-fill")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: RocketBootRunGame;
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
  game = new RocketBootRunGame();
  game.onStateChange = (state: GameState) => { updateUI(state); if (state.phase === "gameover") showGameOverOverlay(state); };
  window.addEventListener("keydown", (e) => { if (["Space", "ArrowUp"].includes(e.code)) e.preventDefault(); game.handleKeyDown(e.code); });
  window.addEventListener("keyup", (e) => game.handleKeyUp(e.code));
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const boostBtn = document.getElementById("boost-btn");
  boostBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.boostStart(); });
  boostBtn?.addEventListener("touchend", () => game.boostEnd());
}

function resizeCanvas(): void { canvas.width = Math.min(canvas.parentElement!.getBoundingClientRect().width, 450); canvas.height = 400; }

function startRenderLoop(): void {
  const render = () => { drawGame(game.getState()); animationFrame = requestAnimationFrame(render); };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;
  const groundY = height - 50;

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  // City silhouette
  ctx.fillStyle = "#2d2d44";
  for (let i = 0; i < 10; i++) {
    const bw = 30 + Math.random() * 20;
    const bh = 80 + Math.random() * 100;
    ctx.fillRect(i * 50, groundY - bh, bw, bh);
  }

  // Ground
  ctx.fillStyle = "#3d3d5c";
  ctx.fillRect(0, groundY, width, 50);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
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

  state.obstacles.forEach(obs => drawObstacle(obs, groundY));
  state.collectibles.forEach(col => drawCollectible(col));
  drawPlayer(state, groundY);
}

function drawPlayer(state: GameState, groundY: number): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Body
  ctx.fillStyle = "#3498db";
  ctx.fillRect(-10, -20, 20, 35);

  // Head
  ctx.fillStyle = "#f4d03f";
  ctx.beginPath();
  ctx.arc(0, -25, 10, 0, Math.PI * 2);
  ctx.fill();

  // Helmet visor
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(-8, -28, 16, 8);

  // Rocket boots
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(-12, 15, 10, 12);
  ctx.fillRect(2, 15, 10, 12);

  // Flames when boosting
  if (player.isBoosting) {
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.moveTo(-7, 27);
    ctx.lineTo(-3, 27 + 15 + Math.random() * 10);
    ctx.lineTo(1, 27);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 27);
    ctx.lineTo(7, 27 + 15 + Math.random() * 10);
    ctx.lineTo(11, 27);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle, groundY: number): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "spike":
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(15, 15);
      ctx.lineTo(-15, 15);
      ctx.closePath();
      ctx.fill();
      break;
    case "laser":
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(-5, -40, 10, 80);
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(-2, -40, 4, 80);
      break;
    case "drone":
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-17, -8, 34, 16);
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      // Propellers
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(-25, -3, 12, 6);
      ctx.fillRect(13, -3, 12, 6);
      break;
    case "platform":
      ctx.fillStyle = "#27ae60";
      ctx.fillRect(-40, -10, 80, 20);
      break;
  }
  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  if (col.collected) return;
  ctx.save();
  ctx.translate(col.x, col.y);
  const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "fuel":
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(-8, -12, 16, 24);
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-6, -15, 12, 5);
      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("F", 0, 5);
      break;
    case "coin":
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff8f00";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("$", 0, 5);
      break;
    case "star":
      ctx.fillStyle = "#f1c40f";
      drawStar(0, 0, 5, 15, 7);
      break;
  }
  ctx.restore();
}

function drawStar(cx: number, cy: number, spikes: number, outerR: number, innerR: number): void {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    ctx.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance) + "m";
  coinsDisplay.textContent = state.coins.toString();
  fuelFill.style.width = `${(state.player.fuel / state.player.maxFuel) * 100}%`;
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

function startGame(): void { overlay.style.display = "none"; finalScoreDisplay.style.display = "none"; statsGrid.style.display = "none"; game.start(); }

startBtn.addEventListener("click", startGame);
window.addEventListener("beforeunload", () => { game?.destroy(); if (animationFrame) cancelAnimationFrame(animationFrame); });
initI18n();
initGame();
