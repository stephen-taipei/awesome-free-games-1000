import { DimensionRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const riftsDisplay = document.getElementById("rifts-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: DimensionRunGame;
let animationFrame: number | null = null;

const DIMENSION_COLORS = [
  { bg1: "#001a1a", bg2: "#003333", accent: "#00ffff" },
  { bg1: "#1a001a", bg2: "#330033", accent: "#ff00ff" },
  { bg1: "#1a1a00", bg2: "#333300", accent: "#ffff00" },
  { bg1: "#001a00", bg2: "#003300", accent: "#00ff00" },
];

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
  game = new DimensionRunGame();
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
  const time = Date.now() * 0.001;
  const dim = DIMENSION_COLORS[state.dimension];

  // Dimension-based background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, dim.bg1);
  gradient.addColorStop(1, dim.bg2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Grid lines (dimension effect)
  ctx.strokeStyle = `${dim.accent}33`;
  ctx.lineWidth = 1;
  const gridOffset = (time * 50) % 50;
  for (let x = -gridOffset; x < width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height * 0.3, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Glitch effect
  if (Math.random() < 0.05) {
    const glitchY = Math.random() * height;
    const glitchH = 5 + Math.random() * 20;
    ctx.fillStyle = dim.accent + "22";
    ctx.fillRect(0, glitchY, width, glitchH);
  }

  // Ground platform
  const groundY = height - 80;
  ctx.fillStyle = dim.accent + "44";
  ctx.fillRect(0, groundY + 20, width, 60);

  // Platform grid
  ctx.strokeStyle = dim.accent + "66";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, groundY + 20);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Lane dividers
  ctx.strokeStyle = dim.accent + "55";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(i * (width / 3), groundY - 50);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (state.phase === "idle") {
    ctx.fillStyle = dim.accent + "cc";
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
  state.collectibles.forEach((col) => drawCollectible(col, dim.accent));

  // Obstacles
  state.obstacles.forEach((obs) => drawObstacle(obs, dim.accent));

  // Player
  drawPlayer(state, dim.accent);
}

function drawPlayer(state: GameState, accentColor: string): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Phase shield effect
  if (state.hasShield) {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();
    // Rotating hexagon
    const shieldTime = Date.now() * 0.002;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = shieldTime + (Math.PI * 2 * i) / 6;
      const x = Math.cos(angle) * 35;
      const y = Math.sin(angle) * 35;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Digital body
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(-12, -20, 24, 40);

  // Dimension glow
  ctx.fillStyle = accentColor;
  ctx.fillRect(-10, -18, 20, 36);

  // Face screen
  ctx.fillStyle = "#0a0a15";
  ctx.fillRect(-8, -15, 16, 12);

  // Digital eyes
  ctx.fillStyle = accentColor;
  ctx.fillRect(-6, -12, 4, 4);
  ctx.fillRect(2, -12, 4, 4);

  // Body lines
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.moveTo(-8, 8);
  ctx.lineTo(8, 8);
  ctx.stroke();

  // Legs animation
  const legOffset = Math.sin(Date.now() * 0.02) * 5;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(-10, 20, 8, 15 + legOffset);
  ctx.fillRect(2, 20, 8, 15 - legOffset);

  ctx.restore();
}

function drawObstacle(obs: Obstacle, accentColor: string): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  const time = Date.now() * 0.003;

  switch (obs.type) {
    case "glitch":
      // Glitchy cube
      ctx.fillStyle = "#ff0066";
      const glitchOffset = Math.sin(time * 10) * 3;
      ctx.fillRect(-obs.width / 2 + glitchOffset, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "#00ff66";
      ctx.fillRect(-obs.width / 2 - glitchOffset, -obs.height / 2 + 3, obs.width, obs.height - 6);
      ctx.fillStyle = "#0066ff";
      ctx.fillRect(-obs.width / 2, -obs.height / 2 - 3, obs.width - 3, obs.height);
      break;
    case "void":
      // Void sphere
      const voidGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, obs.width / 2);
      voidGrad.addColorStop(0, "#000000");
      voidGrad.addColorStop(0.7, "#1a0033");
      voidGrad.addColorStop(1, "transparent");
      ctx.fillStyle = voidGrad;
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Void ring
      ctx.strokeStyle = "#6600cc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "fracture":
      // Dimensional fracture
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(-5, -obs.height / 4);
      ctx.lineTo(5, 0);
      ctx.lineTo(-5, obs.height / 4);
      ctx.lineTo(0, obs.height / 2);
      ctx.stroke();
      // Glow effect
      ctx.strokeStyle = accentColor + "44";
      ctx.lineWidth = 8;
      ctx.stroke();
      break;
    case "anomaly":
      // Rotating anomaly
      ctx.save();
      ctx.rotate(obs.phase);
      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const angle = (Math.PI / 2) * i;
        ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
        ctx.lineTo(Math.cos(angle) * 25, Math.sin(angle) * 25);
        ctx.stroke();
      }
      // Center
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible, accentColor: string): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
  const rotate = Date.now() * 0.003;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "rift":
      // Dimensional rift
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 8, rotate, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 12, rotate, 0, Math.PI * 2);
      ctx.stroke();
      // Core
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "crystal":
      // Dimension crystal
      ctx.fillStyle = "#66ffff";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      // Inner glow
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
      break;
    case "phase":
      // Phase orb
      ctx.strokeStyle = "#ff66ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      // Phase rings
      ctx.strokeStyle = "#ff66ff88";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 16, rotate, rotate + Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 16, rotate + Math.PI, rotate + Math.PI * 2);
      ctx.stroke();
      // Core
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  riftsDisplay.textContent = state.rifts.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.rifts")}</div><div class="stat-value">${state.rifts}</div></div>
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
