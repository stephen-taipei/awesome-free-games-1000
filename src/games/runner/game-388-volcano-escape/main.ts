import { VolcanoEscapeGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const crystalsDisplay = document.getElementById("crystals-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: VolcanoEscapeGame;
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
  game = new VolcanoEscapeGame();
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

  // Volcanic sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#1a0a0a");
  skyGradient.addColorStop(0.3, "#4a1515");
  skyGradient.addColorStop(0.6, "#8B0000");
  skyGradient.addColorStop(1, "#FF4500");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Volcano in background
  ctx.fillStyle = "#2d1810";
  ctx.beginPath();
  ctx.moveTo(width / 2 - 150, height);
  ctx.lineTo(width / 2, 50);
  ctx.lineTo(width / 2 + 150, height);
  ctx.closePath();
  ctx.fill();

  // Lava glow from crater
  const glowGradient = ctx.createRadialGradient(width / 2, 70, 10, width / 2, 70, 80);
  glowGradient.addColorStop(0, "rgba(255, 100, 0, 0.8)");
  glowGradient.addColorStop(1, "rgba(255, 50, 0, 0)");
  ctx.fillStyle = glowGradient;
  ctx.fillRect(width / 2 - 100, 0, 200, 150);

  // Ground
  const groundY = height - 70;
  ctx.fillStyle = "#3d2817";
  ctx.fillRect(0, groundY + 25, width, 50);

  // Cracks in ground
  ctx.strokeStyle = "#FF4500";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const x = (i * 100 + Date.now() * 0.02) % width;
    ctx.beginPath();
    ctx.moveTo(x, groundY + 25);
    ctx.lineTo(x + 10, groundY + 35);
    ctx.lineTo(x - 5, groundY + 45);
    ctx.stroke();
  }

  // Rising lava at bottom
  const lavaY = height - state.lavaLevel;
  const lavaGradient = ctx.createLinearGradient(0, lavaY, 0, height);
  lavaGradient.addColorStop(0, "#FF6600");
  lavaGradient.addColorStop(0.5, "#FF4500");
  lavaGradient.addColorStop(1, "#CC0000");
  ctx.fillStyle = lavaGradient;
  ctx.fillRect(0, lavaY, width, state.lavaLevel);

  // Lava bubbles
  ctx.fillStyle = "#FFFF00";
  for (let i = 0; i < 5; i++) {
    const bx = (i * 90 + Date.now() * 0.03) % width;
    const by = lavaY + 5 + Math.sin(Date.now() * 0.005 + i) * 3;
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lava particles
  state.lavaParticles.forEach(p => {
    const alpha = p.life / 1500;
    ctx.fillStyle = `rgba(255, ${100 + Math.random() * 50}, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Lane markers
  ctx.strokeStyle = "rgba(255, 100, 0, 0.3)";
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 200, 150, 0.9)";
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

  // Shield effect
  if (state.hasShield) {
    ctx.strokeStyle = "#00BFFF";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, 35, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Body
  ctx.fillStyle = "#2F4F4F";
  ctx.beginPath();
  ctx.ellipse(0, -5, 14, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head with helmet
  ctx.fillStyle = "#FFE4C4";
  ctx.beginPath();
  ctx.arc(0, -32, 10, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = "#CD853F";
  ctx.beginPath();
  ctx.arc(0, -35, 12, Math.PI, 0);
  ctx.fill();

  // Goggles
  ctx.fillStyle = "#FF6600";
  ctx.beginPath();
  ctx.ellipse(0, -32, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.ellipse(-4, -32, 4, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(4, -32, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  const legOffset = Math.sin(Date.now() * 0.015) * 8;
  ctx.strokeStyle = "#2F4F4F";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-5, 15);
  ctx.lineTo(-5 - legOffset, 28);
  ctx.moveTo(5, 15);
  ctx.lineTo(5 + legOffset, 28);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "lavaPool":
      const lavaPoolGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 25);
      lavaPoolGrad.addColorStop(0, "#FFFF00");
      lavaPoolGrad.addColorStop(0.5, "#FF6600");
      lavaPoolGrad.addColorStop(1, "#CC0000");
      ctx.fillStyle = lavaPoolGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bubbles
      ctx.fillStyle = "#FFFF00";
      ctx.beginPath();
      ctx.arc(-8 + Math.sin(Date.now() * 0.01) * 3, -2, 3, 0, Math.PI * 2);
      ctx.arc(5, -1 + Math.sin(Date.now() * 0.012) * 2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "fallingRock":
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#777";
      ctx.beginPath();
      ctx.arc(-5, -5, 6, 0, Math.PI * 2);
      ctx.fill();
      // Fire trail
      ctx.fillStyle = "rgba(255, 100, 0, 0.7)";
      ctx.beginPath();
      ctx.moveTo(-10, -15);
      ctx.lineTo(0, -30);
      ctx.lineTo(10, -15);
      ctx.closePath();
      ctx.fill();
      break;

    case "fireball":
      const fireGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 15);
      fireGrad.addColorStop(0, "#FFFFFF");
      fireGrad.addColorStop(0.3, "#FFFF00");
      fireGrad.addColorStop(0.6, "#FF6600");
      fireGrad.addColorStop(1, "#FF0000");
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      ctx.fillStyle = "rgba(255, 100, 0, 0.5)";
      ctx.beginPath();
      ctx.moveTo(12, -5);
      ctx.lineTo(30, 0);
      ctx.lineTo(12, 5);
      ctx.closePath();
      ctx.fill();
      break;

    case "crack":
      ctx.strokeStyle = "#FF4500";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-10, 5);
      ctx.lineTo(0, -3);
      ctx.lineTo(10, 5);
      ctx.lineTo(20, 0);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 100, 0, 0.5)";
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(15, 0);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.006) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "crystal":
      ctx.fillStyle = "#FF1493";
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(8, -5);
      ctx.lineTo(8, 8);
      ctx.lineTo(0, 15);
      ctx.lineTo(-8, 8);
      ctx.lineTo(-8, -5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#FF69B4";
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(4, -3);
      ctx.lineTo(0, 8);
      ctx.lineTo(-4, -3);
      ctx.closePath();
      ctx.fill();
      break;

    case "shield":
      ctx.strokeStyle = "#00BFFF";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(0, 191, 255, 0.3)";
      ctx.fill();
      ctx.fillStyle = "#00BFFF";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case "speedBoost":
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.moveTo(5, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(2, 0);
      ctx.lineTo(5, 12);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-2, 0);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  crystalsDisplay.textContent = state.crystals.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.crystals")}</div><div class="stat-value">${state.crystals}</div></div>
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
