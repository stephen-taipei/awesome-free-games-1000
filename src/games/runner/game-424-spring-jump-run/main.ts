import { SpringJumpRunGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const springsDisplay = document.getElementById("springs-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: SpringJumpRunGame;
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
  game = new SpringJumpRunGame();
  game.onStateChange = (state: GameState) => { updateUI(state); if (state.phase === "gameover") showGameOverOverlay(state); };
  window.addEventListener("keydown", (e) => { if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.code)) e.preventDefault(); game.handleKeyDown(e.code); });
  window.addEventListener("keyup", (e) => game.handleKeyUp(e.code));
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
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.chargeStart(); });
  jumpBtn?.addEventListener("touchend", () => game.chargeRelease());
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
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#87ceeb");
  gradient.addColorStop(1, "#e8f5e9");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Ground
  ctx.fillStyle = "#4caf50";
  ctx.fillRect(0, groundY, width, 50);

  // Lane markers
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(width * i / 3, groundY - 100);
    ctx.lineTo(width * i / 3, groundY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
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
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
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

  // Spring base
  ctx.fillStyle = "#7f8c8d";
  ctx.fillRect(-15, player.height/2 - 10, 30, 10);

  // Spring coil
  ctx.strokeStyle = "#27ae60";
  ctx.lineWidth = 4;
  const compression = player.isCharging ? player.chargeTime / 100 : 0;
  const coilHeight = 20 - compression * 15;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const y = player.height/2 - 10 - (i + 1) * (coilHeight / 5);
    ctx.lineTo(i % 2 === 0 ? -10 : 10, y);
  }
  ctx.stroke();

  // Body
  ctx.fillStyle = "#3498db";
  const bodyY = -player.height/2 + (player.isCharging ? compression * 15 : 0);
  ctx.fillRect(-12, bodyY, 24, 30);

  // Head
  ctx.fillStyle = "#f4d03f";
  ctx.beginPath();
  ctx.arc(0, bodyY - 8, 10, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.arc(-4, bodyY - 10, 2, 0, Math.PI * 2);
  ctx.arc(4, bodyY - 10, 2, 0, Math.PI * 2);
  ctx.fill();

  // Charge indicator
  if (player.isCharging) {
    ctx.fillStyle = `rgba(39, 174, 96, ${player.chargeTime / 100})`;
    ctx.fillRect(-20, bodyY - 30, 40 * (player.chargeTime / 100), 5);
    ctx.strokeStyle = "#27ae60";
    ctx.lineWidth = 1;
    ctx.strokeRect(-20, bodyY - 30, 40, 5);
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle, groundY: number): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "block":
      ctx.fillStyle = "#795548";
      ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, 8);
      break;
    case "spike":
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height/2);
      ctx.lineTo(obs.width/2, obs.height/2);
      ctx.lineTo(-obs.width/2, obs.height/2);
      ctx.closePath();
      ctx.fill();
      break;
    case "wall":
      ctx.fillStyle = "#607d8b";
      ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
      // Bricks
      ctx.strokeStyle = "#455a64";
      ctx.lineWidth = 2;
      for (let row = 0; row < 4; row++) {
        const y = -obs.height/2 + row * 20;
        ctx.beginPath();
        ctx.moveTo(-obs.width/2, y);
        ctx.lineTo(obs.width/2, y);
        ctx.stroke();
      }
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
    case "coin":
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "spring":
      ctx.fillStyle = "#27ae60";
      ctx.strokeStyle = "#27ae60";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(i % 2 === 0 ? -8 : 8, -10 + i * 7);
      }
      ctx.stroke();
      ctx.fillRect(-10, 10, 20, 5);
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
  springsDisplay.textContent = state.springs.toString();
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
