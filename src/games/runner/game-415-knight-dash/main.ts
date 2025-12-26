import { KnightDashGame, GameState, Obstacle, Collectible } from "./game";
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

let game: KnightDashGame;
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
  game = new KnightDashGame();
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

  // Medieval sky background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#4a6fa5");
  gradient.addColorStop(0.4, "#7b9cc5");
  gradient.addColorStop(0.7, "#b5c7d8");
  gradient.addColorStop(1, "#d4c5a9");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Clouds
  for (let i = 0; i < 4; i++) {
    const cloudX = ((i * 130 + Date.now() * 0.015) % (width + 100)) - 50;
    const cloudY = 30 + i * 25;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(cloudX, cloudY, 20, 0, Math.PI * 2);
    ctx.arc(cloudX + 25, cloudY - 5, 25, 0, Math.PI * 2);
    ctx.arc(cloudX + 50, cloudY, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // Castle in background
  ctx.fillStyle = "#5a5a6e";
  ctx.fillRect(width - 120, height * 0.25, 40, 80);
  ctx.fillRect(width - 70, height * 0.3, 35, 70);
  ctx.fillRect(width - 100, height * 0.2, 20, 30);
  // Castle flags
  ctx.fillStyle = "#cc0000";
  ctx.beginPath();
  ctx.moveTo(width - 90, height * 0.2);
  ctx.lineTo(width - 70, height * 0.15);
  ctx.lineTo(width - 70, height * 0.2);
  ctx.fill();

  // Trees
  for (let i = 0; i < 4; i++) {
    const treeX = 40 + i * 120;
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(treeX - 5, height * 0.4, 10, 50);
    ctx.fillStyle = "#2e7d32";
    ctx.beginPath();
    ctx.moveTo(treeX, height * 0.25);
    ctx.lineTo(treeX - 25, height * 0.42);
    ctx.lineTo(treeX + 25, height * 0.42);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(treeX, height * 0.3);
    ctx.lineTo(treeX - 20, height * 0.4);
    ctx.lineTo(treeX + 20, height * 0.4);
    ctx.fill();
  }

  // Ground (stone path)
  const groundY = height - 80;
  ctx.fillStyle = "#8b7355";
  ctx.fillRect(0, groundY + 20, width, 60);
  ctx.fillStyle = "#a0926c";
  ctx.fillRect(0, groundY + 20, width, 12);

  // Stone tiles
  for (let i = 0; i < width; i += 45) {
    ctx.strokeStyle = "#6b5344";
    ctx.lineWidth = 2;
    ctx.strokeRect(i + 5, groundY + 25, 35, 20);
    ctx.strokeRect(i + 20, groundY + 48, 35, 20);
  }

  // Grass patches
  ctx.fillStyle = "#4a7c23";
  for (let i = 0; i < width; i += 30) {
    ctx.fillRect(i, groundY + 15, 8, 8);
    ctx.fillRect(i + 15, groundY + 12, 6, 10);
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(90, 80, 60, 0.4)";
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
    ctx.fillStyle = "#4a3728";
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

  // Holy shield aura
  if (state.hasShield) {
    ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.008) * 0.15;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
    gradient.addColorStop(0, "#ffd700");
    gradient.addColorStop(0.5, "#4169e1");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Legs (armor greaves)
  const legOffset = Math.sin(player.frame * 2) * 3;
  ctx.fillStyle = "#4a4a5e";
  ctx.fillRect(x - 10, y + 10, 8, 14 + legOffset);
  ctx.fillRect(x + 2, y + 10, 8, 14 - legOffset);

  // Body armor
  ctx.fillStyle = "#5a5a7e";
  ctx.fillRect(x - 14, y - 12, 28, 24);

  // Chest plate
  ctx.fillStyle = "#6a6a8e";
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 10);
  ctx.lineTo(x, y - 5);
  ctx.lineTo(x + 12, y - 10);
  ctx.lineTo(x + 12, y + 8);
  ctx.lineTo(x - 12, y + 8);
  ctx.fill();

  // Shoulders
  ctx.fillStyle = "#5a5a7e";
  ctx.beginPath();
  ctx.arc(x - 16, y - 8, 8, 0, Math.PI * 2);
  ctx.arc(x + 16, y - 8, 8, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.fillStyle = "#4a4a6e";
  ctx.beginPath();
  ctx.arc(x, y - 22, 12, 0, Math.PI * 2);
  ctx.fill();

  // Helmet visor
  ctx.fillStyle = "#2a2a3e";
  ctx.fillRect(x - 8, y - 24, 16, 6);

  // Eye slit
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(x - 6, y - 22, 12, 3);

  // Helmet plume
  ctx.fillStyle = "#cc0000";
  ctx.beginPath();
  ctx.moveTo(x, y - 34);
  ctx.lineTo(x - 4, y - 30);
  ctx.lineTo(x + 8, y - 28);
  ctx.lineTo(x + 4, y - 34);
  ctx.fill();

  // Sword
  ctx.fillStyle = "#c0c0c0";
  ctx.save();
  ctx.translate(x + 18, y - 5);
  ctx.rotate(0.3);
  ctx.fillRect(-2, -25, 4, 35);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(-4, 8, 8, 6);
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(-3, 14, 6, 10);
  ctx.restore();

  // Shield on arm
  ctx.fillStyle = "#4169e1";
  ctx.beginPath();
  ctx.moveTo(x - 22, y - 8);
  ctx.lineTo(x - 30, y - 4);
  ctx.lineTo(x - 30, y + 8);
  ctx.lineTo(x - 22, y + 14);
  ctx.lineTo(x - 14, y + 8);
  ctx.lineTo(x - 14, y - 4);
  ctx.fill();
  // Shield emblem
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(x - 22, y + 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacle(obs: Obstacle): void {
  const x = obs.x;
  const y = obs.y;

  switch (obs.type) {
    case "goblin":
      // Small goblin enemy
      ctx.fillStyle = "#4a8c4a";
      ctx.beginPath();
      ctx.arc(x, y - 8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 8, y, 16, 18);
      // Ears
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 10);
      ctx.lineTo(x - 18, y - 20);
      ctx.lineTo(x - 8, y - 15);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 10, y - 10);
      ctx.lineTo(x + 18, y - 20);
      ctx.lineTo(x + 8, y - 15);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(x - 6, y - 10, 4, 4);
      ctx.fillRect(x + 2, y - 10, 4, 4);
      break;
    case "orc":
      // Large orc enemy
      ctx.fillStyle = "#5a7c5a";
      ctx.beginPath();
      ctx.arc(x, y - 12, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 14, y, 28, 22);
      // Tusks
      ctx.fillStyle = "#fffff0";
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 4);
      ctx.lineTo(x - 12, y + 8);
      ctx.lineTo(x - 4, y);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 4);
      ctx.lineTo(x + 12, y + 8);
      ctx.lineTo(x + 4, y);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(x - 8, y - 14, 5, 5);
      ctx.fillRect(x + 3, y - 14, 5, 5);
      // Club
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(x + 14, y - 20, 8, 35);
      break;
    case "spike":
      // Floor spikes
      ctx.fillStyle = "#4a4a4a";
      ctx.fillRect(x - 18, y + 4, 36, 10);
      ctx.fillStyle = "#808080";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 14 + i * 10, y + 4);
        ctx.lineTo(x - 10 + i * 10, y - 14);
        ctx.lineTo(x - 6 + i * 10, y + 4);
        ctx.fill();
      }
      break;
    case "dragon":
      // Flying dragon
      ctx.fillStyle = "#8b0000";
      ctx.beginPath();
      ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      const wingFlap = Math.sin(Date.now() * 0.015) * 8;
      ctx.fillStyle = "#a00000";
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 5);
      ctx.lineTo(x - 35, y - 20 + wingFlap);
      ctx.lineTo(x - 25, y + 5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 10, y - 5);
      ctx.lineTo(x + 35, y - 20 + wingFlap);
      ctx.lineTo(x + 25, y + 5);
      ctx.fill();
      // Head
      ctx.fillStyle = "#8b0000";
      ctx.beginPath();
      ctx.arc(x + 20, y, 10, 0, Math.PI * 2);
      ctx.fill();
      // Eye
      ctx.fillStyle = "#ffff00";
      ctx.fillRect(x + 22, y - 3, 4, 4);
      // Fire breath
      ctx.fillStyle = "#ff6600";
      ctx.beginPath();
      ctx.moveTo(x + 30, y);
      ctx.lineTo(x + 45, y - 5);
      ctx.lineTo(x + 45, y + 5);
      ctx.fill();
      break;
  }
}

function drawCollectible(col: Collectible): void {
  const x = col.x;
  const y = col.y;
  const bounce = Math.sin(Date.now() * 0.005) * 4;

  switch (col.type) {
    case "gem":
      // Gem
      ctx.fillStyle = "#00bfff";
      ctx.beginPath();
      ctx.moveTo(x, y - 12 + bounce);
      ctx.lineTo(x - 10, y + bounce);
      ctx.lineTo(x - 6, y + 10 + bounce);
      ctx.lineTo(x + 6, y + 10 + bounce);
      ctx.lineTo(x + 10, y + bounce);
      ctx.fill();
      ctx.fillStyle = "#87ceeb";
      ctx.beginPath();
      ctx.moveTo(x, y - 8 + bounce);
      ctx.lineTo(x - 5, y + 2 + bounce);
      ctx.lineTo(x + 5, y + 2 + bounce);
      ctx.fill();
      break;
    case "sword":
      // Golden sword
      ctx.fillStyle = "#ffd700";
      ctx.save();
      ctx.translate(x, y + bounce);
      ctx.rotate(-Math.PI / 6);
      ctx.fillRect(-2, -20, 4, 30);
      ctx.fillStyle = "#ff8c00";
      ctx.fillRect(-5, 8, 10, 4);
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-3, 12, 6, 8);
      ctx.restore();
      // Glow
      ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + bounce, 18, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "holy":
      // Holy shield orb
      const gradient = ctx.createRadialGradient(x, y + bounce, 0, x, y + bounce, 15);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.4, "#ffd700");
      gradient.addColorStop(0.7, "#4169e1");
      gradient.addColorStop(1, "rgba(65, 105, 225, 0.3)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y + bounce, 15, 0, Math.PI * 2);
      ctx.fill();
      // Cross symbol
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 2, y - 8 + bounce, 4, 16);
      ctx.fillRect(x - 6, y - 2 + bounce, 12, 4);
      break;
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance) + "m";
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
