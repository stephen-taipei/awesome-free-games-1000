import { DinoRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const eggsDisplay = document.getElementById("eggs-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: DinoRunGame;
let animationFrame: number | null = null;
let backgroundOffset = 0;
let trees: { x: number; y: number; size: number; speed: number }[] = [];
let volcanoParticles: { x: number; y: number; vy: number; size: number }[] = [];

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
  initEnvironment();
  game = new DinoRunGame();
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

function initEnvironment(): void {
  trees = [];
  for (let i = 0; i < 8; i++) {
    trees.push({
      x: Math.random() * 450,
      y: 320 + Math.random() * 20,
      size: 30 + Math.random() * 20,
      speed: 0.5 + Math.random() * 1,
    });
  }

  volcanoParticles = [];
  for (let i = 0; i < 5; i++) {
    volcanoParticles.push({
      x: 380 + Math.random() * 40,
      y: 150,
      vy: -2 - Math.random() * 2,
      size: 3 + Math.random() * 3,
    });
  }
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

  // Background - jungle/volcanic
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#87CEEB");
  gradient.addColorStop(0.6, "#d4a574");
  gradient.addColorStop(1, "#8b6f47");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Volcano in background
  ctx.fillStyle = "#654321";
  ctx.beginPath();
  ctx.moveTo(350, 300);
  ctx.lineTo(400, 150);
  ctx.lineTo(450, 300);
  ctx.closePath();
  ctx.fill();

  // Lava flow
  ctx.fillStyle = "#ff4500";
  ctx.beginPath();
  ctx.moveTo(400, 150);
  ctx.lineTo(410, 180);
  ctx.lineTo(415, 200);
  ctx.lineTo(420, 250);
  ctx.lineTo(425, 300);
  ctx.lineTo(395, 300);
  ctx.lineTo(390, 250);
  ctx.lineTo(385, 200);
  ctx.lineTo(390, 180);
  ctx.closePath();
  ctx.fill();

  // Volcano particles
  const speed = state.phase === "playing" ? state.speed : 1;
  volcanoParticles.forEach(p => {
    p.y += p.vy;
    if (p.y < 100) {
      p.y = 150;
      p.x = 380 + Math.random() * 40;
    }
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Moving background trees
  trees.forEach(tree => {
    tree.x -= tree.speed * speed * 0.1;
    if (tree.x < -50) { tree.x = width + 50; tree.y = 320 + Math.random() * 20; }

    // Tree trunk
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(tree.x - 5, tree.y - 20, 10, 20);

    // Tree leaves
    ctx.fillStyle = "#228b22";
    ctx.beginPath();
    ctx.arc(tree.x, tree.y - 25, tree.size / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ground
  const groundY = height - 80;
  ctx.fillStyle = "#3d2817";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Ground texture
  ctx.fillStyle = "#8b6f47";
  for (let i = 0; i < 20; i++) {
    const x = ((backgroundOffset * speed * 0.5) + i * 30) % width;
    ctx.fillRect(x, groundY + 25, 20, 5);
  }
  backgroundOffset++;

  // Lane lines
  ctx.strokeStyle = "#8b6f4733";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
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

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Shield effect
  if (state.hasShield) {
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(46, 204, 113, 0.1)";
    ctx.fill();
  }

  // Dinosaur body (cute raptor style)
  ctx.fillStyle = "#2ecc71";

  // Tail
  ctx.beginPath();
  ctx.arc(-15, 5, 8, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(-10, -10, 25, 20);

  // Head
  ctx.beginPath();
  ctx.arc(12, -5, 12, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(16, -8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(17, -8, 2, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = "#27ae60";
  ctx.fillRect(-5, 10, 6, 15);
  ctx.fillRect(5, 10, 6, 15);

  // Spikes on back
  ctx.fillStyle = "#27ae60";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-5 + i * 8, -10);
    ctx.lineTo(-2 + i * 8, -18);
    ctx.lineTo(1 + i * 8, -10);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "rock":
      ctx.fillStyle = "#696969";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#808080";
      ctx.beginPath();
      ctx.arc(-5, -5, 5, 0, Math.PI * 2);
      ctx.arc(8, 3, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "lava":
      ctx.fillStyle = "#ff4500";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "#ff6347";
      ctx.fillRect(-obs.width / 2, -2, obs.width, 4);
      // Bubbles
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#ff8c00";
        ctx.beginPath();
        ctx.arc(-15 + i * 15, Math.sin(Date.now() * 0.01 + i) * 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "pterodactyl":
      ctx.fillStyle = "#8b7355";
      // Body
      ctx.fillRect(-10, -5, 20, 10);
      // Wings
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-20, -15);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(20, -15);
      ctx.lineTo(15, 0);
      ctx.closePath();
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(12, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "trex":
      ctx.fillStyle = "#d2691e";
      // Body
      ctx.fillRect(-15, -20, 30, 40);
      // Head
      ctx.fillStyle = "#d2691e";
      ctx.fillRect(-5, -35, 20, 20);
      // Teeth
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-3 + i * 5, -20);
        ctx.lineTo(-1 + i * 5, -15);
        ctx.lineTo(1 + i * 5, -20);
        ctx.closePath();
        ctx.fill();
      }
      // Arms
      ctx.fillStyle = "#cd853f";
      ctx.fillRect(-20, -10, 8, 15);
      ctx.fillRect(12, -10, 8, 15);
      // Legs
      ctx.fillRect(-12, 20, 8, 15);
      ctx.fillRect(4, 20, 8, 15);
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
    case "egg":
      ctx.fillStyle = "#f0e68c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#daa520";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Spots
      ctx.fillStyle = "#daa520";
      ctx.beginPath();
      ctx.arc(-3, -4, 2, 0, Math.PI * 2);
      ctx.arc(4, 2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bone":
      ctx.fillStyle = "#f5deb3";
      ctx.fillRect(-12, -3, 24, 6);
      ctx.beginPath();
      ctx.arc(-12, 0, 5, 0, Math.PI * 2);
      ctx.arc(12, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "meat":
      ctx.fillStyle = "#dc143c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bone
      ctx.fillStyle = "#f5deb3";
      ctx.fillRect(-2, -12, 4, 8);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  eggsDisplay.textContent = state.eggs.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.eggs")}</div><div class="stat-value">${state.eggs}</div></div>
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
