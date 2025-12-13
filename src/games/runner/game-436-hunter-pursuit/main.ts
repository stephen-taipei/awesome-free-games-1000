import { HunterPursuitGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const berriesDisplay = document.getElementById("berries-display")!;
const feathersDisplay = document.getElementById("feathers-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: HunterPursuitGame;
let animationFrame: number | null = null;
let trees: { x: number; height: number; type: number }[] = [];

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
  initBackground();
  game = new HunterPursuitGame();
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

function initBackground(): void {
  trees = [];
  for (let i = 0; i < 10; i++) {
    trees.push({
      x: i * 80 + Math.random() * 40,
      height: 120 + Math.random() * 80,
      type: Math.floor(Math.random() * 3),
    });
  }
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");
  const slideBtn = document.getElementById("slide-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  slideBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.slide(); });
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
  const groundY = height - 80;

  // Sky gradient - forest theme
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#1a472a");
  skyGradient.addColorStop(0.5, "#2d5a27");
  skyGradient.addColorStop(1, "#4a7c3f");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Background trees
  const treeSpeed = state.phase === "playing" ? state.speed * 0.1 : 0.1;
  trees.forEach(tree => {
    tree.x -= treeSpeed;
    if (tree.x < -50) {
      tree.x = width + Math.random() * 50;
      tree.height = 120 + Math.random() * 80;
      tree.type = Math.floor(Math.random() * 3);
    }
    drawTree(tree.x, groundY, tree.height, tree.type);
  });

  // Ground - forest floor
  ctx.fillStyle = "#3d2914";
  ctx.fillRect(0, groundY, width, 30);

  // Grass on ground
  ctx.fillStyle = "#2d5a27";
  for (let i = 0; i < width; i += 8) {
    ctx.fillRect(i, groundY - 5, 3, 8);
  }

  // Lane markers (subtle)
  ctx.strokeStyle = "rgba(139, 69, 19, 0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 15]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 60);
    ctx.lineTo(i * (width / 3), groundY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Hunter distance indicator
  drawHunterIndicator(state.hunter.distanceFromPlayer);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
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

function drawTree(x: number, groundY: number, height: number, type: number): void {
  // Trunk
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(x - 8, groundY - height, 16, height);

  // Leaves
  ctx.fillStyle = type === 0 ? "#1b5e20" : type === 1 ? "#2e7d32" : "#388e3c";
  ctx.beginPath();
  ctx.moveTo(x, groundY - height - 40);
  ctx.lineTo(x - 35, groundY - height + 20);
  ctx.lineTo(x + 35, groundY - height + 20);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, groundY - height - 20);
  ctx.lineTo(x - 30, groundY - height + 40);
  ctx.lineTo(x + 30, groundY - height + 40);
  ctx.closePath();
  ctx.fill();
}

function drawHunterIndicator(distance: number): void {
  const barWidth = 100;
  const barHeight = 12;
  const x = 20;
  const y = 20;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(x, y, barWidth, barHeight);

  // Distance bar (red = close, green = far)
  const pct = (distance - 30) / 120;
  const color = pct > 0.5 ? "#27ae60" : pct > 0.25 ? "#f39c12" : "#e74c3c";
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  // Border
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  // Hunter icon
  ctx.fillStyle = "#c0392b";
  ctx.font = "14px sans-serif";
  ctx.fillText("🏹", x + barWidth + 8, y + 11);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding pose
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-20, 5, 40, 15);
    ctx.fillStyle = "#D2691E";
    ctx.beginPath();
    ctx.arc(-10, 5, 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Running pose
    const legAngle = player.isJumping ? 0.2 : Math.sin(Date.now() * 0.02) * 0.4;

    // Body (deer/forest creature)
    ctx.fillStyle = "#D2691E";
    ctx.fillRect(-10, -15, 20, 25);

    // Head
    ctx.fillStyle = "#CD853F";
    ctx.beginPath();
    ctx.arc(0, -22, 10, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(-8, -28);
    ctx.lineTo(-12, -38);
    ctx.lineTo(-4, -30);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -28);
    ctx.lineTo(12, -38);
    ctx.lineTo(4, -30);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-4, -24, 2, 0, Math.PI * 2);
    ctx.arc(4, -24, 2, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-5, 10);
    ctx.lineTo(-8 - Math.cos(legAngle) * 8, 25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(8 + Math.cos(legAngle) * 8, 25);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "log":
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "#4e342e";
      ctx.beginPath();
      ctx.arc(-obs.width / 2, 0, obs.height / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(obs.width / 2, 0, obs.height / 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "rock":
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(obs.width / 2, obs.height / 4);
      ctx.lineTo(obs.width / 3, obs.height / 2);
      ctx.lineTo(-obs.width / 3, obs.height / 2);
      ctx.lineTo(-obs.width / 2, obs.height / 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#95a5a6";
      ctx.beginPath();
      ctx.arc(-5, -5, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "bush":
      ctx.fillStyle = "#27ae60";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.arc(-10, -5, obs.width / 4, 0, Math.PI * 2);
      ctx.arc(10, 5, obs.width / 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "trap":
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-obs.width / 2, -5, obs.width, 10);
      ctx.fillStyle = "#c0392b";
      for (let i = -15; i <= 15; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, -5);
        ctx.lineTo(i - 4, -15);
        ctx.lineTo(i + 4, -15);
        ctx.closePath();
        ctx.fill();
      }
      break;

    case "tree-branch":
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(-obs.width / 2, -5, obs.width, 10);
      ctx.fillStyle = "#27ae60";
      for (let i = -25; i <= 25; i += 15) {
        ctx.beginPath();
        ctx.arc(i, 0, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case "puddle":
      ctx.fillStyle = "rgba(41, 128, 185, 0.6)";
      ctx.beginPath();
      ctx.ellipse(0, 0, obs.width / 2, obs.height, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(52, 152, 219, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);
  const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "berry":
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.arc(-3, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#27ae60";
      ctx.fillRect(-2, -14, 4, 6);
      break;

    case "mushroom":
      ctx.fillStyle = "#9b59b6";
      ctx.beginPath();
      ctx.arc(0, -5, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.arc(-4, -8, 3, 0, Math.PI * 2);
      ctx.arc(4, -6, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ecf0f1";
      ctx.fillRect(-4, -5, 8, 12);
      break;

    case "feather":
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.quadraticCurveTo(10, 0, 0, 15);
      ctx.quadraticCurveTo(-10, 0, 0, -15);
      ctx.fill();
      ctx.strokeStyle = "#e67e22";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  berriesDisplay.textContent = state.berries.toString();
  feathersDisplay.textContent = state.feathers.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.berries")}</div><div class="stat-value">${state.berries}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.feathers")}</div><div class="stat-value">${state.feathers}</div></div>
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
