import { IceFieldRunGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const fishDisplay = document.getElementById("fish-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: IceFieldRunGame;
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
  game = new IceFieldRunGame();
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

  // Arctic sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#1a3a4a");
  skyGradient.addColorStop(0.5, "#4a7a8a");
  skyGradient.addColorStop(1, "#8ab4c4");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Northern lights effect
  ctx.fillStyle = "rgba(100, 255, 200, 0.1)";
  for (let i = 0; i < 3; i++) {
    const y = 30 + i * 20 + Math.sin(Date.now() * 0.001 + i) * 10;
    ctx.beginPath();
    ctx.ellipse(width / 2, y, 150 + i * 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant icebergs
  ctx.fillStyle = "#b8d4e3";
  drawIceberg(50, height - 140, 60, 80);
  drawIceberg(180, height - 160, 80, 100);
  drawIceberg(350, height - 130, 50, 70);

  // Ice ground
  const groundY = height - 60;
  const iceGradient = ctx.createLinearGradient(0, groundY, 0, height);
  iceGradient.addColorStop(0, "#e8f4f8");
  iceGradient.addColorStop(1, "#c4dce8");
  ctx.fillStyle = iceGradient;
  ctx.fillRect(0, groundY + 25, width, 40);

  // Ice shine
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const x = (i * 60 + Date.now() * 0.02) % width;
    ctx.beginPath();
    ctx.moveTo(x, groundY + 30);
    ctx.lineTo(x + 30, groundY + 35);
    ctx.stroke();
  }

  // Snowflakes
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  state.snowflakes.forEach(flake => {
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Lane markers
  ctx.strokeStyle = "rgba(100, 150, 200, 0.3)";
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Cold meter
  if (state.phase === 'playing') {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(10, 10, 100, 10);
    const coldColor = state.cold > 70 ? "#00BFFF" : state.cold > 40 ? "#87CEEB" : "#E0FFFF";
    ctx.fillStyle = coldColor;
    ctx.fillRect(10, 10, state.cold, 10);
    ctx.strokeStyle = "#4a7a8a";
    ctx.strokeRect(10, 10, 100, 10);
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(26, 58, 74, 0.9)";
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

  // Warmth effect
  if (state.hasWarmth) {
    ctx.fillStyle = "rgba(255, 150, 100, 0.15)";
    ctx.fillRect(0, 0, width, height);
  }
}

function drawIceberg(x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * 0.3, y - h);
  ctx.lineTo(x + w * 0.7, y - h * 0.8);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Penguin body
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.ellipse(0, -5, 16, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // White belly
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(0, -28, 12, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.ellipse(-5, -30, 4, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(5, -30, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-5, -29, 2, 0, Math.PI * 2);
  ctx.arc(5, -29, 2, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#FFA500";
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(-4, -22);
  ctx.lineTo(4, -22);
  ctx.closePath();
  ctx.fill();

  // Feet
  ctx.fillStyle = "#FFA500";
  const footOffset = Math.sin(Date.now() * 0.012) * 5;
  ctx.beginPath();
  ctx.ellipse(-6 - footOffset, 18, 6, 3, -0.2, 0, Math.PI * 2);
  ctx.ellipse(6 + footOffset, 18, 6, 3, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.ellipse(-16, -5, 5, 12, -0.3, 0, Math.PI * 2);
  ctx.ellipse(16, -5, 5, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "iceberg":
      ctx.fillStyle = "#e8f4f8";
      ctx.beginPath();
      ctx.moveTo(-20, 25);
      ctx.lineTo(-15, -20);
      ctx.lineTo(5, -25);
      ctx.lineTo(20, -15);
      ctx.lineTo(20, 25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c4dce8";
      ctx.beginPath();
      ctx.moveTo(-10, 25);
      ctx.lineTo(-5, 0);
      ctx.lineTo(10, 5);
      ctx.lineTo(15, 25);
      ctx.closePath();
      ctx.fill();
      break;

    case "seal":
      ctx.fillStyle = "#708090";
      ctx.beginPath();
      ctx.ellipse(0, 5, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-20, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-25, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      // Whiskers
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-28, 2);
      ctx.lineTo(-35, 0);
      ctx.moveTo(-28, 4);
      ctx.lineTo(-35, 5);
      ctx.stroke();
      break;

    case "crack":
      ctx.strokeStyle = "#4a7a8a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-10, 3);
      ctx.lineTo(0, -2);
      ctx.lineTo(12, 4);
      ctx.lineTo(22, 0);
      ctx.stroke();
      ctx.fillStyle = "rgba(26, 58, 74, 0.5)";
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(18, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case "snowDrift":
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(0, 10, 28, 15, 0, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-10, 5, 15, 12, -0.2, 0, Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(12, 8, 12, 10, 0.2, 0, Math.PI);
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
    case "fish":
      ctx.fillStyle = "#4169E1";
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.quadraticCurveTo(5, -8, -10, 0);
      ctx.quadraticCurveTo(5, 8, 15, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-18, -6);
      ctx.lineTo(-18, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(10, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "warmth":
      ctx.fillStyle = "#FF6347";
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.bezierCurveTo(-10, -5, -10, 5, 0, 12);
      ctx.bezierCurveTo(10, 5, 10, -5, 0, -10);
      ctx.fill();
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "slide":
      ctx.fillStyle = "#00CED1";
      ctx.beginPath();
      ctx.moveTo(-12, 5);
      ctx.lineTo(0, -10);
      ctx.lineTo(12, 5);
      ctx.lineTo(6, 5);
      ctx.lineTo(6, 10);
      ctx.lineTo(-6, 10);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  fishDisplay.textContent = state.fish.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.fish")}</div><div class="stat-value">${state.fish}</div></div>
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
