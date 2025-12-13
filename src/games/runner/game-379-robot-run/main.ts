import { RobotRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const energyDisplay = document.getElementById("energy-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const energyBar = document.getElementById("energy-bar")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: RobotRunGame;
let animationFrame: number | null = null;
let backgroundOffset = 0;

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
  game = new RobotRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ShiftLeft", "ShiftRight"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });

  window.addEventListener("keyup", (e) => {
    game.handleKeyUp(e.code);
  });

  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");
  const boostBtn = document.getElementById("boost-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });

  boostBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.boost(); });
  boostBtn?.addEventListener("touchend", (e) => { e.preventDefault(); game.stopBoost(); });
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

  // Industrial factory background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, width, height);

  // Moving background grid pattern
  const speed = state.phase === "playing" ? state.speed : 1;
  backgroundOffset -= speed * 0.5;
  if (backgroundOffset < -50) backgroundOffset = 0;

  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;
  for (let x = backgroundOffset; x < width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Factory pipes and machinery on sides
  ctx.fillStyle = "#333333";
  ctx.fillRect(0, 0, 30, height);
  ctx.fillRect(width - 30, 0, 30, height);

  // Pipes detail
  ctx.fillStyle = "#444444";
  for (let y = 0; y < height; y += 80) {
    ctx.fillRect(5, y, 10, 60);
    ctx.fillRect(width - 15, y + 20, 10, 60);
  }

  // Ground (conveyor belt)
  const groundY = height - 80;
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Conveyor belt details
  ctx.fillStyle = "#1a1a1a";
  for (let x = backgroundOffset; x < width; x += 30) {
    ctx.fillRect(x, groundY + 25, 5, 60);
  }

  // Warning stripes on ground
  ctx.fillStyle = "#e67e22";
  ctx.fillRect(0, groundY + 20, width, 5);

  // Lane dividers
  ctx.strokeStyle = "#e67e2244";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 60);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Particles (sparks, steam, etc.)
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

  // Player (robot)
  drawPlayer(state);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Robot body (main chassis)
  ctx.fillStyle = "#3498db";
  ctx.fillRect(-18, -25, 36, 45);

  // Head
  ctx.fillStyle = "#2980b9";
  ctx.fillRect(-15, -30, 30, 20);

  // Visor (glowing)
  ctx.fillStyle = player.isBoosting ? "#ff6600" : "#00d4ff";
  ctx.fillRect(-12, -27, 24, 8);

  // Arms
  ctx.fillStyle = "#34495e";
  ctx.fillRect(-22, -18, 4, 25);
  ctx.fillRect(18, -18, 4, 25);

  // Legs
  if (player.isJumping) {
    // Bent legs when jumping
    ctx.fillRect(-15, 20, 8, 12);
    ctx.fillRect(7, 20, 8, 12);
  } else {
    // Standing legs
    ctx.fillRect(-14, 20, 8, 15);
    ctx.fillRect(6, 20, 8, 15);
  }

  // Booster flames when boosting
  if (player.isBoosting) {
    const flameLength = 15 + Math.random() * 10;
    ctx.fillStyle = "#ff6600";
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(-18 - flameLength, -5);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(-18 - flameLength * 0.7, -5);
    ctx.lineTo(-18, -2);
    ctx.closePath();
    ctx.fill();
  }

  // Chest panel details
  ctx.fillStyle = "#e67e22";
  ctx.fillRect(-6, -10, 12, 3);
  ctx.fillRect(-6, -5, 12, 3);

  // Antenna
  ctx.strokeStyle = "#e67e22";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -30);
  ctx.lineTo(-8, -38);
  ctx.stroke();
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.arc(-8, -40, 3, 0, Math.PI * 2);
  ctx.fill();

  // Metal shine
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(-10, -28, 6, 15);

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "pipe":
      // Broken pipe
      ctx.fillStyle = "#666666";
      ctx.fillRect(-20, -30, 40, 60);
      ctx.fillStyle = "#555555";
      ctx.fillRect(-18, -30, 36, 60);
      // Damage/rust
      ctx.fillStyle = "#e67e22";
      ctx.fillRect(-15, -10, 8, 5);
      ctx.fillRect(5, 5, 10, 6);
      // Bolts
      ctx.fillStyle = "#888888";
      ctx.beginPath();
      ctx.arc(-15, -20, 3, 0, Math.PI * 2);
      ctx.arc(15, -20, 3, 0, Math.PI * 2);
      ctx.arc(-15, 20, 3, 0, Math.PI * 2);
      ctx.arc(15, 20, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "fence":
      // Electric fence
      ctx.strokeStyle = "#3498db";
      ctx.lineWidth = 4;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-25, -30 + i * 15);
        ctx.lineTo(25, -30 + i * 15);
        ctx.stroke();
      }
      // Electric sparks
      if (Math.random() < 0.3) {
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 2;
        const x1 = -20 + Math.random() * 40;
        const y1 = -30 + Math.random() * 60;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + (Math.random() - 0.5) * 10, y1 + (Math.random() - 0.5) * 10);
        ctx.stroke();
      }
      break;

    case "gear":
      // Falling gear
      const rotation = (Date.now() * 0.005) % (Math.PI * 2);
      ctx.rotate(rotation);
      ctx.fillStyle = "#7f8c8d";
      // Outer teeth
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillRect(-4, -25, 8, 10);
        ctx.restore();
      }
      // Center
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#95a5a6";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      // Center hole
      ctx.fillStyle = "#34495e";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "crate":
      // Metal crate
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-25, -25, 50, 50);
      ctx.fillStyle = "#95a5a6";
      ctx.fillRect(-23, -23, 46, 46);
      // Warning label
      ctx.fillStyle = "#e67e22";
      ctx.fillRect(-15, -15, 30, 30);
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", 0, 0);
      // Metal bands
      ctx.fillStyle = "#34495e";
      ctx.fillRect(-25, -5, 50, 3);
      ctx.fillRect(-5, -25, 3, 50);
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.006) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "battery":
      // Energy battery
      ctx.fillStyle = "#27ae60";
      ctx.fillRect(-10, -12, 20, 24);
      ctx.fillStyle = "#2ecc71";
      ctx.fillRect(-8, -10, 16, 20);
      // Terminals
      ctx.fillStyle = "#95a5a6";
      ctx.fillRect(-3, -15, 6, 3);
      // Lightning symbol
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.moveTo(2, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2, 8);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case "oil":
      // Oil can
      ctx.fillStyle = "#e67e22";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d35400";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      // Drop
      ctx.fillStyle = "#f39c12";
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.quadraticCurveTo(-5, 13, 0, 18);
      ctx.quadraticCurveTo(5, 13, 0, 8);
      ctx.fill();
      break;

    case "chip":
      // Upgrade chip
      ctx.fillStyle = "#8e44ad";
      ctx.fillRect(-12, -10, 24, 20);
      ctx.fillStyle = "#9b59b6";
      ctx.fillRect(-10, -8, 20, 16);
      // Circuit lines
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.lineTo(8, -5);
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(-8, 5);
      ctx.lineTo(8, 5);
      ctx.stroke();
      // Pins
      ctx.fillStyle = "#bdc3c7";
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(-14, i * 6 - 1, 4, 2);
        ctx.fillRect(10, i * 6 - 1, 4, 2);
      }
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  energyDisplay.textContent = Math.floor(state.energy).toString();
  speedDisplay.textContent = state.speed.toFixed(1);

  // Update energy bar
  const energyPercent = (state.energy / state.maxEnergy) * 100;
  energyBar.style.width = energyPercent + "%";
  energyBar.style.backgroundColor = state.energy > 30 ? "#27ae60" : "#e74c3c";
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.speed")}</div><div class="stat-value">${state.speed.toFixed(1)}</div></div>
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
