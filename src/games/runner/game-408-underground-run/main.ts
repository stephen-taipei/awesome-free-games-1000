import { UndergroundRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
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

let game: UndergroundRunGame;
let animationFrame: number | null = null;

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) =>
    i18n.loadTranslations(locale as Locale, trans)
  );
  const browserLang = navigator.language;
  if (browserLang.includes("zh")) i18n.setLocale("zh-TW");
  else if (browserLang.includes("ja")) i18n.setLocale("ja");
  else i18n.setLocale("en");
  languageSelect.value = i18n.getLocale();
  updateTexts();
  languageSelect.addEventListener("change", () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateTexts();
  });
}

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  resizeCanvas();
  game = new UndergroundRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code))
      e.preventDefault();
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

  // Background - cave gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1a1510");
  gradient.addColorStop(0.5, "#2a2520");
  gradient.addColorStop(1, "#3a3530");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Cave ceiling stalactites
  ctx.fillStyle = "#2d251a";
  for (let i = 0; i < 15; i++) {
    const x = i * 35 + 10;
    const h = 20 + Math.sin(i * 1.5) * 15;
    ctx.beginPath();
    ctx.moveTo(x - 10, 0);
    ctx.lineTo(x, h);
    ctx.lineTo(x + 10, 0);
    ctx.fill();
  }

  // Glowing crystals on walls
  const time = Date.now() * 0.002;
  for (let i = 0; i < 8; i++) {
    const x = 30 + i * 60;
    const y = 80 + Math.sin(i * 2) * 30;
    const glow = 0.3 + Math.sin(time + i) * 0.2;
    ctx.fillStyle = `rgba(100, 200, 255, ${glow})`;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();
  }

  // Ground (cave floor)
  const groundY = height - 80;
  ctx.fillStyle = "#4a4035";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Rock texture
  ctx.fillStyle = "#5a5045";
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(i * 25 + 10, groundY + 40 + Math.sin(i) * 5, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(139, 115, 85, 0.3)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(200, 180, 150, 0.8)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles
  state.particles.forEach((p) => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
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
  ctx.save();
  ctx.translate(player.x, player.y);

  // Torch glow effect
  if (state.hasShield) {
    const gradient = ctx.createRadialGradient(0, -10, 5, 0, -10, 50);
    gradient.addColorStop(0, "rgba(255, 150, 50, 0.4)");
    gradient.addColorStop(1, "rgba(255, 150, 50, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, -10, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  // Explorer body
  ctx.fillStyle = "#5a4030";
  ctx.beginPath();
  ctx.ellipse(0, 5, 12, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jacket details
  ctx.strokeStyle = "#3a2a20";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, 20);
  ctx.stroke();

  // Head
  ctx.fillStyle = "#e8c8a8";
  ctx.beginPath();
  ctx.arc(0, -15, 12, 0, Math.PI * 2);
  ctx.fill();

  // Hat
  ctx.fillStyle = "#4a3a2a";
  ctx.beginPath();
  ctx.ellipse(0, -22, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-8, -28, 16, 8);

  // Eyes
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-4, -15, 2, 0, Math.PI * 2);
  ctx.arc(4, -15, 2, 0, Math.PI * 2);
  ctx.fill();

  // Torch if has shield
  if (state.hasShield) {
    ctx.fillStyle = "#5a3a20";
    ctx.fillRect(15, -25, 5, 30);
    // Flame
    ctx.fillStyle = "#ff9933";
    ctx.beginPath();
    ctx.arc(17.5, -30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(17.5, -32, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Running legs animation
  const legOffset = Math.sin(Date.now() * 0.02) * 8;
  ctx.strokeStyle = "#4a3520";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-5, 20);
  ctx.lineTo(-5 + legOffset, 35);
  ctx.moveTo(5, 20);
  ctx.lineTo(5 - legOffset, 35);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  const time = Date.now() * 0.005;

  switch (obs.type) {
    case "stalactite":
      ctx.fillStyle = "#5a5045";
      ctx.beginPath();
      ctx.moveTo(0, obs.height / 2);
      ctx.lineTo(-obs.width / 2, -obs.height / 2);
      ctx.lineTo(obs.width / 2, -obs.height / 2);
      ctx.closePath();
      ctx.fill();
      // Drip
      ctx.fillStyle = "#7a9aaa";
      ctx.beginPath();
      ctx.arc(0, obs.height / 2 + 5 + Math.sin(time) * 3, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bat":
      // Bat body
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      const wingFlap = Math.sin(time * 10) * 15;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(-25, -10 + wingFlap, -30, 5);
      ctx.quadraticCurveTo(-20, 0, -8, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.quadraticCurveTo(25, -10 + wingFlap, 30, 5);
      ctx.quadraticCurveTo(20, 0, 8, 0);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#ff3333";
      ctx.beginPath();
      ctx.arc(-4, -2, 2, 0, Math.PI * 2);
      ctx.arc(4, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "rock":
      ctx.fillStyle = "#5a5045";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(obs.width / 2, -obs.height / 4);
      ctx.lineTo(obs.width / 2 - 5, obs.height / 2);
      ctx.lineTo(-obs.width / 2 + 5, obs.height / 2);
      ctx.lineTo(-obs.width / 2, -obs.height / 4);
      ctx.closePath();
      ctx.fill();
      // Crack
      ctx.strokeStyle = "#3a3530";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -10);
      ctx.lineTo(0, 0);
      ctx.lineTo(5, 10);
      ctx.stroke();
      break;
    case "pit":
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Edge rocks
      ctx.fillStyle = "#4a4035";
      ctx.fillRect(-obs.width / 2 - 5, -obs.height / 2 - 5, 10, 10);
      ctx.fillRect(obs.width / 2 - 5, -obs.height / 2 - 5, 10, 10);
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
      // Crystal gem
      ctx.fillStyle = "#66ccff";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, -4);
      ctx.lineTo(6, 10);
      ctx.lineTo(-6, 10);
      ctx.lineTo(-10, -4);
      ctx.closePath();
      ctx.fill();
      // Shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.moveTo(-2, -8);
      ctx.lineTo(2, -8);
      ctx.lineTo(0, -2);
      ctx.closePath();
      ctx.fill();
      break;
    case "gold":
      // Gold nugget
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(3, 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff8dc";
      ctx.beginPath();
      ctx.arc(-3, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "torch":
      // Torch
      ctx.fillStyle = "#5a3a20";
      ctx.fillRect(-3, -5, 6, 20);
      // Flame
      ctx.fillStyle = "#ff9933";
      ctx.beginPath();
      ctx.arc(0, -10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.arc(0, -12, 5, 0, Math.PI * 2);
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
window.addEventListener("beforeunload", () => {
  game?.destroy();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});
initI18n();
initGame();
