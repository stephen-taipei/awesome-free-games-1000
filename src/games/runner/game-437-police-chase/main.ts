import { PoliceChaseGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const donutsDisplay = document.getElementById("donuts-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: PoliceChaseGame;
let animationFrame: number | null = null;
let buildings: { x: number; height: number; width: number; color: string }[] = [];

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
  game = new PoliceChaseGame();
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
  buildings = [];
  const colors = ['#2c3e50', '#34495e', '#1a252f', '#2d3436'];
  for (let i = 0; i < 8; i++) {
    buildings.push({
      x: i * 90 + Math.random() * 30,
      height: 100 + Math.random() * 120,
      width: 60 + Math.random() * 30,
      color: colors[Math.floor(Math.random() * colors.length)],
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

  // Sky gradient - night city theme
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#0c1929");
  skyGradient.addColorStop(0.6, "#1a3a5c");
  skyGradient.addColorStop(1, "#2d3436");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Background buildings
  const buildingSpeed = state.phase === "playing" ? state.speed * 0.1 : 0.1;
  buildings.forEach(building => {
    building.x -= buildingSpeed;
    if (building.x < -building.width) {
      building.x = width + Math.random() * 50;
      building.height = 100 + Math.random() * 120;
    }
    drawBuilding(building.x, groundY, building.height, building.width, building.color);
  });

  // Road
  ctx.fillStyle = "#2d3436";
  ctx.fillRect(0, groundY, width, 80);

  // Road markings
  ctx.fillStyle = "#f1c40f";
  ctx.setLineDash([40, 30]);
  ctx.strokeStyle = "#f1c40f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 40);
  ctx.lineTo(width, groundY + 40);
  ctx.stroke();
  ctx.setLineDash([]);

  // Lane dividers
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY);
    ctx.lineTo(i * (width / 3), groundY + 80);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Police car indicator with siren
  drawPoliceIndicator(state.police);

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

function drawBuilding(x: number, groundY: number, height: number, width: number, color: string): void {
  const y = groundY - height;

  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);

  // Windows
  ctx.fillStyle = "rgba(241, 196, 15, 0.6)";
  for (let row = 0; row < height / 25; row++) {
    for (let col = 0; col < 3; col++) {
      if (Math.random() > 0.3) {
        ctx.fillRect(x + 8 + col * 18, y + 10 + row * 25, 10, 15);
      }
    }
  }
}

function drawPoliceIndicator(police: { distance: number; sirenPhase: number }): void {
  const barWidth = 100;
  const barHeight = 12;
  const x = 20;
  const y = 20;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(x, y, barWidth, barHeight);

  const pct = (police.distance - 30) / 120;
  const color = pct > 0.5 ? "#27ae60" : pct > 0.25 ? "#f39c12" : "#e74c3c";
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  // Police siren (blinking)
  const sirenColor = Math.sin(police.sirenPhase) > 0 ? "#e74c3c" : "#3498db";
  ctx.fillStyle = sirenColor;
  ctx.beginPath();
  ctx.arc(x + barWidth + 20, y + 6, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding pose
    ctx.fillStyle = "#3498db";
    ctx.fillRect(-20, 5, 40, 15);
    ctx.fillStyle = "#2980b9";
    ctx.beginPath();
    ctx.arc(-10, 5, 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Running pose - street runner
    const legAngle = player.isJumping ? 0.2 : Math.sin(Date.now() * 0.02) * 0.4;

    // Body (hoodie)
    ctx.fillStyle = "#3498db";
    ctx.fillRect(-12, -18, 24, 28);

    // Hood
    ctx.fillStyle = "#2980b9";
    ctx.beginPath();
    ctx.arc(0, -20, 12, Math.PI, 0);
    ctx.fill();

    // Face
    ctx.fillStyle = "#f5d6ba";
    ctx.beginPath();
    ctx.arc(0, -18, 8, 0, Math.PI * 2);
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = "#000";
    ctx.fillRect(-8, -20, 6, 4);
    ctx.fillRect(2, -20, 6, 4);

    // Pants
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-10, 10, 20, 12);

    // Legs
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-5, 22);
    ctx.lineTo(-8 - Math.cos(legAngle) * 8, 28);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5, 22);
    ctx.lineTo(8 + Math.cos(legAngle) * 8, 28);
    ctx.stroke();

    // Sneakers
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(-8 - Math.cos(legAngle) * 8, 28, 5, 0, Math.PI * 2);
    ctx.arc(8 + Math.cos(legAngle) * 8, 28, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "barrier":
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.fillStyle = "#fff";
      ctx.fillRect(-obs.width / 2 + 5, -5, obs.width - 10, 10);
      break;

    case "cone":
      ctx.fillStyle = "#e67e22";
      ctx.beginPath();
      ctx.moveTo(0, -obs.height / 2);
      ctx.lineTo(obs.width / 2, obs.height / 2);
      ctx.lineTo(-obs.width / 2, obs.height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-8, -5, 16, 6);
      ctx.fillRect(-6, 8, 12, 6);
      break;

    case "car":
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(-obs.width / 2, -obs.height / 2 + 10, obs.width, obs.height - 10);
      ctx.fillStyle = "#1a252f";
      ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2, obs.width - 10, 15);
      // Wheels
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.arc(-20, obs.height / 2 - 5, 8, 0, Math.PI * 2);
      ctx.arc(20, obs.height / 2 - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "hydrant":
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(-8, -obs.height / 2, 16, obs.height);
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-12, -obs.height / 2 + 10, 24, 8);
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "bench":
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(-obs.width / 2, -5, obs.width, 10);
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(-obs.width / 2 + 5, 5, 8, 15);
      ctx.fillRect(obs.width / 2 - 13, 5, 8, 15);
      break;

    case "sign":
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-3, -obs.height / 2 + 20, 6, obs.height - 20);
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 10, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-8, -obs.height / 2 + 8, 16, 4);
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
    case "coin":
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#e67e22";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("$", 0, 4);
      break;

    case "donut":
      ctx.fillStyle = "#e91e63";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5d6ba";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      // Sprinkles
      ctx.fillStyle = "#f1c40f";
      ctx.fillRect(-6, -3, 3, 2);
      ctx.fillStyle = "#3498db";
      ctx.fillRect(3, 2, 3, 2);
      ctx.fillStyle = "#2ecc71";
      ctx.fillRect(-2, 5, 3, 2);
      break;

    case "coffee":
      ctx.fillStyle = "#795548";
      ctx.fillRect(-8, -10, 16, 22);
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(-10, -12, 20, 6);
      // Steam
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, -15);
      ctx.quadraticCurveTo(0, -20, 3, -15);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  coinsDisplay.textContent = state.coins.toString();
  donutsDisplay.textContent = state.donuts.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.coins")}</div><div class="stat-value">${state.coins}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.donuts")}</div><div class="stat-value">${state.donuts}</div></div>
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
