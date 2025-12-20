import { LightSpeedRunGame, GameState, Obstacle, Collectible, Particle, StarStreak } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const lightyearDisplay = document.getElementById("lightyear-display")!;
const crystalsDisplay = document.getElementById("crystals-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const warpBar = document.getElementById("warp-bar")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: LightSpeedRunGame;
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
  game = new LightSpeedRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "ShiftLeft", "ShiftRight"].includes(e.code)) e.preventDefault();
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
  const warpBtn = document.getElementById("warp-btn");
  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  warpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.warp(); });
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

  // Deep space background
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
  gradient.addColorStop(0, "#0a0a1a");
  gradient.addColorStop(0.5, "#050510");
  gradient.addColorStop(1, "#000005");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Star streaks (hyperspace effect)
  state.starStreaks.forEach(streak => {
    const alpha = streak.brightness * (state.player.isWarping ? 1 : 0.5);
    const length = state.player.isWarping ? streak.length * 2 : streak.length;

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = state.player.isWarping ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(streak.x + length, streak.y);
    ctx.lineTo(streak.x, streak.y);
    ctx.stroke();
  });

  // Warp effect tunnel when warping
  if (state.player.isWarping) {
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const radius = 50 + i * 40 + (Date.now() * 0.1) % 40;
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, radius, radius * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Space platform (ground)
  const groundY = height - 70;
  ctx.fillStyle = "#1a1a2a";
  ctx.fillRect(0, groundY + 20, width, 50);

  // Glowing ground line
  ctx.strokeStyle = state.player.isWarping ? "#88ffff" : "#4466ff";
  ctx.lineWidth = 3;
  ctx.shadowBlur = state.player.isWarping ? 20 : 10;
  ctx.shadowColor = state.player.isWarping ? "#88ffff" : "#4466ff";
  ctx.beginPath();
  ctx.moveTo(0, groundY + 20);
  ctx.lineTo(width, groundY + 20);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Lane indicators
  ctx.strokeStyle = "rgba(100, 150, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.setLineDash([20, 15]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 100);
    ctx.lineTo(i * (width / 3), groundY + 20);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(136, 170, 255, 0.6)";
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

  // Warp glow effect
  if (player.isWarping) {
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#88ffff';

    // Warp aura
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
    gradient.addColorStop(0, 'rgba(136, 255, 255, 0.4)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  // Light ship body
  ctx.fillStyle = player.isWarping ? '#ffffff' : '#88aaff';

  // Streamlined ship shape
  ctx.beginPath();
  ctx.moveTo(25, 0);
  ctx.quadraticCurveTo(15, -15, -15, -12);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-15, 12);
  ctx.quadraticCurveTo(15, 15, 25, 0);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = player.isWarping ? '#ffff88' : '#aaccff';
  ctx.beginPath();
  ctx.ellipse(5, 0, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Engine glow
  const engineColor = player.isWarping ? '#ffffff' : '#4488ff';
  ctx.fillStyle = engineColor;
  ctx.shadowBlur = 20;
  ctx.shadowColor = engineColor;
  ctx.beginPath();
  ctx.moveTo(-20, -5);
  const engineLength = player.isWarping ? -50 : -25;
  ctx.lineTo(engineLength, 0);
  ctx.lineTo(-20, 5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "asteroid":
      ctx.fillStyle = "#5a4a3a";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Craters
      ctx.fillStyle = "#3a2a1a";
      ctx.beginPath();
      ctx.arc(-8, -5, 6, 0, Math.PI * 2);
      ctx.arc(5, 8, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "wormhole":
      // Swirling wormhole
      for (let i = 3; i >= 0; i--) {
        ctx.fillStyle = `rgba(100, 50, 150, ${0.3 + i * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 25 - i * 5, 35 - i * 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "dark_matter":
      // Dark, ominous sphere
      const dmGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, obs.width / 2);
      dmGradient.addColorStop(0, "#000");
      dmGradient.addColorStop(0.7, "#1a0a2a");
      dmGradient.addColorStop(1, "#2a1a3a");
      ctx.fillStyle = dmGradient;
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Dark corona
      ctx.strokeStyle = "#4a2a5a";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case "photon_barrier":
      ctx.fillStyle = "rgba(255, 200, 100, 0.6)";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = "#ffcc66";
      ctx.lineWidth = 2;
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Warning glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ffcc66";
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.shadowBlur = 0;
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.008) * 0.25 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "light_crystal":
      ctx.fillStyle = "#88ffff";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#88ffff";
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Inner shine
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case "photon_boost":
      ctx.fillStyle = "#ffaa00";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ffaa00";
      // Arrow/boost shape
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-5, -12);
      ctx.lineTo(0, 0);
      ctx.lineTo(-5, 12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      break;

    case "warp_fuel":
      ctx.strokeStyle = "#ff88ff";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ff88ff";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 136, 255, 0.4)";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("W", 0, 0);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  lightyearDisplay.textContent = state.lightYear.toString();
  crystalsDisplay.textContent = state.crystals.toString();
  speedDisplay.textContent = state.speed.toFixed(1);

  const warpPercent = (state.player.warpCharge / state.player.maxWarpCharge) * 100;
  warpBar.style.width = warpPercent + "%";
  warpBar.style.background = state.player.isWarping ?
    "linear-gradient(90deg, #88ffff, #ffffff)" :
    "linear-gradient(90deg, #4466ff, #88aaff)";
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.lightYear")}</div><div class="stat-value">${state.lightYear}</div></div>
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
