import { SkateboardRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const tricksDisplay = document.getElementById("tricks-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: SkateboardRunGame;
let animationFrame: number | null = null;
let buildings: { x: number; height: number; width: number; color: string }[] = [];
let roadOffset = 0;

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
  initBuildings();
  game = new SkateboardRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyS"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function initBuildings(): void {
  buildings = [];
  for (let i = 0; i < 8; i++) {
    buildings.push({
      x: i * 100,
      height: 80 + Math.random() * 60,
      width: 80 + Math.random() * 40,
      color: ['#34495e', '#2c3e50', '#7f8c8d'][Math.floor(Math.random() * 3)],
    });
  }
}

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");
  const trickBtn = document.getElementById("trick-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  trickBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.trick(); });
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

  // Sky background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#3498db");
  gradient.addColorStop(1, "#e74c3c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Buildings in background
  const speed = state.phase === "playing" ? state.speed : 0;
  buildings.forEach(building => {
    building.x -= speed * 0.3;
    if (building.x < -building.width) {
      building.x = width + Math.random() * 50;
      building.height = 80 + Math.random() * 60;
    }
    ctx.fillStyle = building.color;
    ctx.fillRect(building.x, height - 80 - building.height, building.width, building.height);

    // Windows
    ctx.fillStyle = "#f39c12";
    for (let y = height - 80 - building.height + 10; y < height - 80; y += 20) {
      for (let x = building.x + 10; x < building.x + building.width - 10; x += 15) {
        if (Math.random() > 0.3) {
          ctx.fillRect(x, y, 8, 12);
        }
      }
    }
  });

  // Street/Road
  const groundY = height - 80;
  ctx.fillStyle = "#34495e";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Road markings
  roadOffset -= speed * 0.5;
  if (roadOffset < -40) roadOffset = 0;
  ctx.fillStyle = "#f39c12";
  for (let x = roadOffset; x < width; x += 40) {
    ctx.fillRect(x, groundY + 55, 20, 4);
  }

  // Lane lines
  ctx.strokeStyle = "#95a5a6";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY + 25);
    ctx.lineTo(i * (width / 3), groundY + 85);
    ctx.stroke();
  }
  ctx.setLineDash([]);

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

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Apply trick rotation
  if (player.isTricking) {
    ctx.rotate(player.trickRotation);
  }

  // Skateboard
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(-20, 18, 40, 8);

  // Wheels
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.arc(-12, 22, 5, 0, Math.PI * 2);
  ctx.arc(12, 22, 5, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#3498db";
  ctx.beginPath();
  ctx.ellipse(0, -5, 12, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#f39c12";
  ctx.beginPath();
  ctx.arc(0, -25, 10, 0, Math.PI * 2);
  ctx.fill();

  // Helmet
  ctx.strokeStyle = "#e74c3c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -25, 11, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Arms
  ctx.strokeStyle = "#3498db";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-8, -10);
  ctx.lineTo(-15, 5);
  ctx.moveTo(8, -10);
  ctx.lineTo(15, 5);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(-5, 10);
  ctx.lineTo(-10, 18);
  ctx.moveTo(5, 10);
  ctx.lineTo(10, 18);
  ctx.stroke();

  ctx.restore();

  // Trick sparkles
  if (player.isTricking) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 10;
      ctx.fillStyle = "#9b59b6";
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(player.x + Math.cos(angle) * radius, player.y + Math.sin(angle) * radius, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "cone":
      // Traffic cone
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(-12, 17);
      ctx.lineTo(12, 17);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.fillRect(-10, -5, 20, 4);
      ctx.fillRect(-10, 5, 20, 4);

      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(-15, 17, 30, 3);
      break;

    case "bench":
      // Park bench
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(-30, -10, 60, 6);
      ctx.fillRect(-25, -4, 4, 14);
      ctx.fillRect(21, -4, 4, 14);

      ctx.fillStyle = "#654321";
      ctx.fillRect(-30, -15, 60, 5);
      break;

    case "rail":
      // Skate rail
      ctx.strokeStyle = "#95a5a6";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-25, 0);
      ctx.lineTo(25, 0);
      ctx.stroke();

      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-25, -5, 4, 15);
      ctx.fillRect(21, -5, 4, 15);
      break;

    case "car":
      // Car obstacle
      ctx.fillStyle = "#f39c12";
      ctx.fillRect(-35, -15, 70, 25);
      ctx.fillRect(-25, -25, 50, 10);

      ctx.fillStyle = "#3498db";
      ctx.fillRect(-20, -24, 15, 8);
      ctx.fillRect(5, -24, 15, 8);

      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.arc(-25, 10, 6, 0, Math.PI * 2);
      ctx.arc(25, 10, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.008) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "coin":
      // Gold coin
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#f39c12";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 0);
      break;

    case "gear":
      // Skateboard gear
      ctx.fillStyle = "#00d4ff";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        ctx.fillRect(Math.cos(angle) * 8 - 2, Math.sin(angle) * 8 - 2, 4, 4);
      }

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "spray":
      // Spray can
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(-5, -8, 10, 16);

      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-6, -10, 12, 3);

      ctx.fillStyle = "#fff";
      ctx.fillRect(-3, -3, 6, 6);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  tricksDisplay.textContent = state.tricks.toString();
  coinsDisplay.textContent = state.coins.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.tricks")}</div><div class="stat-value">${state.tricks}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.coins")}</div><div class="stat-value">${state.coins}</div></div>
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
