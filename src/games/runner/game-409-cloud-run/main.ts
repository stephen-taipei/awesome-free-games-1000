import { CloudRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const feathersDisplay = document.getElementById("feathers-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: CloudRunGame;
let animationFrame: number | null = null;
let clouds: { x: number; y: number; size: number; speed: number }[] = [];

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
  initClouds();
  game = new CloudRunGame();
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

function initClouds(): void {
  clouds = [];
  for (let i = 0; i < 10; i++) {
    clouds.push({
      x: Math.random() * 500,
      y: 50 + Math.random() * 150,
      size: 30 + Math.random() * 40,
      speed: 0.5 + Math.random() * 1,
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

  // Sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#87ceeb");
  gradient.addColorStop(0.5, "#b0e0e6");
  gradient.addColorStop(1, "#e0f0ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = "#fff5cc";
  ctx.beginPath();
  ctx.arc(width - 60, 60, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffdd66";
  ctx.beginPath();
  ctx.arc(width - 60, 60, 30, 0, Math.PI * 2);
  ctx.fill();

  // Background clouds
  const speed = state.phase === "playing" ? state.speed : 1;
  clouds.forEach((cloud) => {
    cloud.x -= cloud.speed * speed * 0.1;
    if (cloud.x < -cloud.size * 2) {
      cloud.x = width + cloud.size;
      cloud.y = 50 + Math.random() * 150;
    }
    drawCloud(cloud.x, cloud.y, cloud.size, 0.5);
  });

  // Cloud platform
  const groundY = height - 80;
  drawCloudPlatform(0, groundY + 20, width, 60);

  // Lane dividers (subtle)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(100, 150, 200, 0.8)";
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

function drawCloud(x: number, y: number, size: number, alpha: number): void {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y, size * 0.45, 0, Math.PI * 2);
  ctx.arc(x + size * 0.4, y + size * 0.1, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloudPlatform(x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  for (let i = 0; i < w; i += 30) {
    ctx.beginPath();
    ctx.arc(x + i + 15, y, 25, 0, Math.PI * 2);
    ctx.arc(x + i + 30, y + 10, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Wings effect
  if (state.hasShield) {
    const wingFlap = Math.sin(Date.now() * 0.02) * 10;
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.quadraticCurveTo(-40, -20 + wingFlap, -50, 5);
    ctx.quadraticCurveTo(-35, 10, -15, 5);
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.quadraticCurveTo(40, -20 + wingFlap, 50, 5);
    ctx.quadraticCurveTo(35, 10, 15, 5);
    ctx.fill();
  }

  // Angel/cherub body
  ctx.fillStyle = "#ffe0cc";
  ctx.beginPath();
  ctx.ellipse(0, 5, 12, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // White robe
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-15, 25);
  ctx.lineTo(15, 25);
  ctx.lineTo(12, 0);
  ctx.fill();

  // Head
  ctx.fillStyle = "#ffe0cc";
  ctx.beginPath();
  ctx.arc(0, -12, 12, 0, Math.PI * 2);
  ctx.fill();

  // Hair (golden curls)
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(-8, -18, 5, 0, Math.PI * 2);
  ctx.arc(0, -20, 5, 0, Math.PI * 2);
  ctx.arc(8, -18, 5, 0, Math.PI * 2);
  ctx.fill();

  // Halo
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -28, 10, 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = "#4a90d9";
  ctx.beginPath();
  ctx.arc(-4, -12, 3, 0, Math.PI * 2);
  ctx.arc(4, -12, 3, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = "#cc8866";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -8, 4, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  const time = Date.now() * 0.003;

  switch (obs.type) {
    case "storm":
      // Storm cloud
      ctx.fillStyle = "#4a5568";
      drawCloud(0, 0, obs.width, 1);
      // Rain drops
      ctx.strokeStyle = "#6699cc";
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        const rainY = (time * 100 + i * 50) % 40;
        ctx.beginPath();
        ctx.moveTo(i * 10, 15 + rainY);
        ctx.lineTo(i * 10 - 3, 25 + rainY);
        ctx.stroke();
      }
      break;
    case "bird":
      // Bird body
      ctx.fillStyle = "#2d3748";
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      const wingFlap = Math.sin(time * 8) * 15;
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.quadraticCurveTo(-20, -20 + wingFlap, -25, -5);
      ctx.quadraticCurveTo(-15, 0, -5, -5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5, -5);
      ctx.quadraticCurveTo(20, -20 + wingFlap, 25, -5);
      ctx.quadraticCurveTo(15, 0, 5, -5);
      ctx.fill();
      // Beak
      ctx.fillStyle = "#f6ad55";
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(25, 2);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();
      // Eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(8, -2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(9, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "lightning":
      // Lightning bolt
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(10, -10);
      ctx.lineTo(3, -10);
      ctx.lineTo(12, 20);
      ctx.lineTo(-5, 0);
      ctx.lineTo(2, 0);
      ctx.lineTo(-8, -30);
      ctx.closePath();
      ctx.fill();
      // Glow
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    case "airplane":
      // Airplane body
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.ellipse(0, 0, obs.width / 2, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      ctx.fillStyle = "#cbd5e0";
      ctx.fillRect(-15, -3, 30, 6);
      // Tail
      ctx.beginPath();
      ctx.moveTo(-obs.width / 2, 0);
      ctx.lineTo(-obs.width / 2 - 10, -15);
      ctx.lineTo(-obs.width / 2 + 5, -5);
      ctx.closePath();
      ctx.fill();
      // Windows
      ctx.fillStyle = "#4299e1";
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(i * 8, -3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
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
    case "feather":
      // White feather
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(8, 0, 0, 15);
      ctx.quadraticCurveTo(-8, 0, 0, -12);
      ctx.fill();
      // Feather line
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 12);
      ctx.stroke();
      break;
    case "rainbow":
      // Rainbow arc
      const colors = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#8b00ff"];
      for (let i = 0; i < colors.length; i++) {
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 5, 12 - i * 1.5, Math.PI, 0);
        ctx.stroke();
      }
      break;
    case "wings":
      // Angel wings
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-15, -10, -20, 5);
      ctx.quadraticCurveTo(-10, 10, 0, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(15, -10, 20, 5);
      ctx.quadraticCurveTo(10, 10, 0, 5);
      ctx.fill();
      // Glow
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  feathersDisplay.textContent = state.feathers.toString();
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
window.addEventListener("beforeunload", () => {
  game?.destroy();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});
initI18n();
initGame();
