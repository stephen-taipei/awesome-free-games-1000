import { DesertDashGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const gemsDisplay = document.getElementById("gems-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: DesertDashGame;
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
  game = new DesertDashGame();
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
  skyGradient.addColorStop(0.4, "#FFE4B5");
  skyGradient.addColorStop(1, "#DEB887");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.arc(380, 60, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFA500";
  ctx.beginPath();
  ctx.arc(380, 60, 30, 0, Math.PI * 2);
  ctx.fill();

  // Dunes in background
  ctx.fillStyle = "#D2B48C";
  drawDune(0, height - 120, 150, 60);
  drawDune(120, height - 140, 180, 80);
  drawDune(280, height - 110, 140, 50);

  // Sand ground
  const groundY = height - 60;
  ctx.fillStyle = "#EDC9AF";
  ctx.fillRect(0, groundY + 25, width, 40);

  // Sand particles
  ctx.fillStyle = "rgba(210, 180, 140, 0.6)";
  state.sandParticles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Lane markers
  ctx.strokeStyle = "rgba(139, 90, 43, 0.3)";
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Heat bar
  if (state.phase === 'playing') {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(10, 10, 100, 10);
    const heatColor = state.heat > 70 ? "#FF4500" : state.heat > 40 ? "#FFA500" : "#32CD32";
    ctx.fillStyle = heatColor;
    ctx.fillRect(10, 10, state.heat, 10);
    ctx.strokeStyle = "#333";
    ctx.strokeRect(10, 10, 100, 10);
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(139, 90, 43, 0.8)";
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

  // Water effect
  if (state.hasWater) {
    ctx.fillStyle = "rgba(0, 191, 255, 0.2)";
    ctx.fillRect(0, 0, width, height);
  }
}

function drawDune(x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + w / 2, y - h, x + w, y);
  ctx.lineTo(x + w, y + 50);
  ctx.lineTo(x, y + 50);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Body
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.ellipse(0, -8, 12, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head wrap
  ctx.fillStyle = "#F5F5DC";
  ctx.beginPath();
  ctx.arc(0, -35, 12, 0, Math.PI * 2);
  ctx.fill();

  // Face
  ctx.fillStyle = "#DEB887";
  ctx.beginPath();
  ctx.arc(0, -32, 8, 0, Math.PI);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-3, -34, 2, 0, Math.PI * 2);
  ctx.arc(3, -34, 2, 0, Math.PI * 2);
  ctx.fill();

  // Legs running animation
  const legOffset = Math.sin(Date.now() * 0.015) * 8;
  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-5, 10);
  ctx.lineTo(-5 - legOffset, 25);
  ctx.moveTo(5, 10);
  ctx.lineTo(5 + legOffset, 25);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "cactus":
      ctx.fillStyle = "#228B22";
      ctx.fillRect(-5, -25, 10, 50);
      ctx.fillRect(-20, -15, 15, 8);
      ctx.fillRect(5, -5, 15, 8);
      ctx.fillRect(-20, -15, 8, -15);
      ctx.fillRect(12, -5, 8, -20);
      // Spines
      ctx.strokeStyle = "#006400";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-5, -20 + i * 10);
        ctx.lineTo(-8, -22 + i * 10);
        ctx.moveTo(5, -20 + i * 10);
        ctx.lineTo(8, -22 + i * 10);
        ctx.stroke();
      }
      break;

    case "rock":
      ctx.fillStyle = "#8B7355";
      ctx.beginPath();
      ctx.moveTo(-20, 15);
      ctx.lineTo(-15, -10);
      ctx.lineTo(0, -15);
      ctx.lineTo(18, -8);
      ctx.lineTo(20, 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#A0522D";
      ctx.beginPath();
      ctx.ellipse(5, 0, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "snake":
      ctx.strokeStyle = "#8B4513";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      for (let i = 0; i < 5; i++) {
        ctx.quadraticCurveTo(-10 + i * 10, (i % 2 === 0 ? -8 : 8), i * 10, 0);
      }
      ctx.stroke();
      // Head
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.ellipse(20, 0, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(22, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      // Tongue
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(35, -3);
      ctx.moveTo(28, 0);
      ctx.lineTo(35, 3);
      ctx.stroke();
      break;

    case "tumbleweed":
      ctx.strokeStyle = "#D2691E";
      ctx.lineWidth = 2;
      const rotation = Date.now() * 0.005;
      for (let i = 0; i < 8; i++) {
        const angle = rotation + (i * Math.PI / 4);
        ctx.beginPath();
        ctx.arc(0, 0, 15, angle, angle + 0.5);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(210, 105, 30, 0.5)";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
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
    case "gem":
      ctx.fillStyle = "#FF6347";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#FF7F50";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case "water":
      ctx.fillStyle = "#00BFFF";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(10, 0, 0, 12);
      ctx.quadraticCurveTo(-10, 0, 0, -12);
      ctx.fill();
      ctx.fillStyle = "#87CEEB";
      ctx.beginPath();
      ctx.ellipse(-3, -2, 3, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "speed":
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(6, -4);
      ctx.lineTo(2, -4);
      ctx.lineTo(2, 12);
      ctx.lineTo(-2, 12);
      ctx.lineTo(-2, -4);
      ctx.lineTo(-6, -4);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  gemsDisplay.textContent = state.gems.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.gems")}</div><div class="stat-value">${state.gems}</div></div>
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
