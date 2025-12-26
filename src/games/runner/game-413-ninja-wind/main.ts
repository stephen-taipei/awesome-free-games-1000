import { NinjaWindGame, GameState, Obstacle, Collectible } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const scrollsDisplay = document.getElementById("scrolls-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: NinjaWindGame;
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
  game = new NinjaWindGame();
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

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Night sky background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0a0a1a");
  gradient.addColorStop(0.5, "#1a1a3a");
  gradient.addColorStop(1, "#2a2a4a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Stars
  for (let i = 0; i < 30; i++) {
    const starX = (i * 47 + Date.now() * 0.01) % width;
    const starY = (i * 31) % (height * 0.5);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(Date.now() * 0.003 + i) * 0.3})`;
    ctx.fillRect(starX, starY, 2, 2);
  }

  // Moon
  ctx.fillStyle = "#ffffcc";
  ctx.beginPath();
  ctx.arc(width - 60, 50, 25, 0, Math.PI * 2);
  ctx.fill();

  // Ground (traditional Japanese style)
  const groundY = height - 80;
  ctx.fillStyle = "#2d2d2d";
  ctx.fillRect(0, groundY + 20, width, 60);
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(0, groundY + 20, width, 8);

  // Bamboo decorations
  for (let i = 0; i < width; i += 80) {
    ctx.fillStyle = "#3d5c3d";
    ctx.fillRect(i + 10, groundY - 60, 8, 80);
    ctx.fillRect(i + 6, groundY - 40, 16, 4);
    ctx.fillRect(i + 6, groundY - 20, 16, 4);
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(100, 100, 150, 0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 60);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "#e0e0e0";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles
  state.particles.forEach((p) => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
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
  const x = player.x;
  const y = player.y;

  // Smoke shield effect
  if (state.hasSmoke) {
    ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
    ctx.fillStyle = "#666666";
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Body (ninja outfit)
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(x - 12, y - 8, 24, 28);

  // Head wrap
  ctx.fillStyle = "#2d2d4a";
  ctx.beginPath();
  ctx.arc(x, y - 14, 10, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#ff4444";
  ctx.fillRect(x - 6, y - 16, 4, 3);
  ctx.fillRect(x + 2, y - 16, 4, 3);

  // Scarf flowing
  const scarfWave = Math.sin(Date.now() * 0.01 + player.frame) * 5;
  ctx.fillStyle = "#cc0000";
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 10);
  ctx.lineTo(x + 25 + scarfWave, y - 5);
  ctx.lineTo(x + 20 + scarfWave, y);
  ctx.lineTo(x + 8, y - 5);
  ctx.fill();

  // Legs animation
  const legOffset = Math.sin(player.frame * 2) * 4;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(x - 8, y + 20, 6, 12 + legOffset);
  ctx.fillRect(x + 2, y + 20, 6, 12 - legOffset);
}

function drawObstacle(obs: Obstacle): void {
  const x = obs.x;
  const y = obs.y;

  switch (obs.type) {
    case "shuriken":
      const rotation = Date.now() * 0.01;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = "#c0c0c0";
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-6, -16);
        ctx.lineTo(0, -12);
        ctx.lineTo(6, -16);
        ctx.fill();
      }
      ctx.restore();
      break;
    case "samurai":
      // Samurai enemy
      ctx.fillStyle = "#8b0000";
      ctx.fillRect(x - 14, y - 18, 28, 36);
      ctx.fillStyle = "#4a0000";
      ctx.beginPath();
      ctx.arc(x, y - 24, 10, 0, Math.PI * 2);
      ctx.fill();
      // Helmet
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(x - 12, y - 32, 24, 8);
      ctx.fillRect(x - 16, y - 28, 32, 4);
      // Sword
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(x + 14, y - 30, 4, 40);
      break;
    case "trap":
      // Spike trap
      ctx.fillStyle = "#4a4a4a";
      ctx.fillRect(x - 20, y, 40, 10);
      ctx.fillStyle = "#808080";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 16 + i * 8, y);
        ctx.lineTo(x - 12 + i * 8, y - 15);
        ctx.lineTo(x - 8 + i * 8, y);
        ctx.fill();
      }
      break;
    case "arrow":
      // Flying arrow
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(x - 20, y - 2, 30, 4);
      ctx.fillStyle = "#808080";
      ctx.beginPath();
      ctx.moveTo(x + 15, y);
      ctx.lineTo(x + 10, y - 6);
      ctx.lineTo(x + 10, y + 6);
      ctx.fill();
      // Feathers
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x - 20, y);
      ctx.lineTo(x - 28, y - 6);
      ctx.lineTo(x - 25, y);
      ctx.lineTo(x - 28, y + 6);
      ctx.fill();
      break;
  }
}

function drawCollectible(col: Collectible): void {
  const x = col.x;
  const y = col.y;
  const bounce = Math.sin(Date.now() * 0.005) * 4;

  switch (col.type) {
    case "scroll":
      // Japanese scroll
      ctx.fillStyle = "#f5deb3";
      ctx.fillRect(x - 8, y - 10 + bounce, 16, 20);
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(x - 10, y - 12 + bounce, 20, 4);
      ctx.fillRect(x - 10, y + 8 + bounce, 20, 4);
      // Text lines
      ctx.fillStyle = "#333";
      ctx.fillRect(x - 4, y - 4 + bounce, 8, 2);
      ctx.fillRect(x - 4, y + bounce, 8, 2);
      ctx.fillRect(x - 4, y + 4 + bounce, 8, 2);
      break;
    case "kunai":
      // Kunai knife
      ctx.fillStyle = "#c0c0c0";
      ctx.beginPath();
      ctx.moveTo(x, y - 15 + bounce);
      ctx.lineTo(x - 6, y + bounce);
      ctx.lineTo(x + 6, y + bounce);
      ctx.fill();
      ctx.fillStyle = "#4a4a4a";
      ctx.fillRect(x - 2, y + bounce, 4, 12);
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(x - 4, y + 10 + bounce, 8, 4);
      break;
    case "smoke":
      // Smoke bomb
      ctx.fillStyle = "#333333";
      ctx.beginPath();
      ctx.arc(x, y + bounce, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#666666";
      ctx.beginPath();
      ctx.arc(x - 4, y - 2 + bounce, 5, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 2 + bounce, 5, 0, Math.PI * 2);
      ctx.fill();
      // Fuse
      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 10 + bounce);
      ctx.lineTo(x + 4, y - 16 + bounce);
      ctx.stroke();
      break;
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance) + "m";
  scrollsDisplay.textContent = state.scrolls.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.scrolls")}</div><div class="stat-value">${state.scrolls}</div></div>
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
