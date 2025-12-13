import { SpaceRunnerGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const starsDisplay = document.getElementById("stars-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: SpaceRunnerGame;
let animationFrame: number | null = null;
let stars: { x: number; y: number; size: number; speed: number }[] = [];

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
  initStars();
  game = new SpaceRunnerGame();
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

function initStars(): void {
  stars = [];
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * 450,
      y: Math.random() * 400,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 2 + 1,
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

  // Background - space
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, width, height);

  // Stars
  const speed = state.phase === "playing" ? state.speed : 1;
  stars.forEach(star => {
    star.x -= star.speed * speed * 0.1;
    if (star.x < 0) { star.x = width; star.y = Math.random() * height; }
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + star.size / 4})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ground (space platform)
  const groundY = height - 80;
  ctx.fillStyle = "#1a1a3a";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Lane lines
  ctx.strokeStyle = "#00d4ff33";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
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
    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0, 212, 255, 0.1)";
    ctx.fill();
  }

  // Spaceship body
  ctx.fillStyle = "#4a90d9";
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-15, -15);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-15, 15);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#00d4ff";
  ctx.beginPath();
  ctx.ellipse(5, 0, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Engine glow
  ctx.fillStyle = "#ff6b35";
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(-25 - Math.random() * 10, 0);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "meteor":
      ctx.fillStyle = "#8b4513";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#654321";
      ctx.beginPath();
      ctx.arc(-5, -5, 5, 0, Math.PI * 2);
      ctx.arc(8, 3, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "satellite":
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(-10, -5, 20, 10);
      ctx.fillStyle = "#4169e1";
      ctx.fillRect(-25, -3, 15, 6);
      ctx.fillRect(10, -3, 15, 6);
      break;
    case "laser":
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "#ff6666";
      ctx.fillRect(-obs.width / 2, -2, obs.width, 4);
      break;
    case "debris":
      ctx.fillStyle = "#666666";
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(12, -5);
      ctx.lineTo(8, 10);
      ctx.lineTo(-8, 12);
      ctx.lineTo(-12, -3);
      ctx.closePath();
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
    case "star":
      ctx.fillStyle = "#ffd700";
      drawStar(0, 0, 5, 12, 6);
      break;
    case "energy":
      ctx.fillStyle = "#00ff00";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case "shield":
      ctx.strokeStyle = "#00d4ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(0, 212, 255, 0.3)";
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  starsDisplay.textContent = state.stars.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.stars")}</div><div class="stat-value">${state.stars}</div></div>
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
