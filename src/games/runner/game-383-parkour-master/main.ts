import { ParkourMasterGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const skillsDisplay = document.getElementById("skills-display")!;
const medalsDisplay = document.getElementById("medals-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: ParkourMasterGame;
let animationFrame: number | null = null;
let buildings: { x: number; height: number; width: number }[] = [];
let clouds: { x: number; y: number; width: number; speed: number }[] = [];

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
  game = new ParkourMasterGame();
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
  // Initialize background buildings
  buildings = [];
  for (let i = 0; i < 8; i++) {
    buildings.push({
      x: i * 120,
      height: 100 + Math.random() * 100,
      width: 80 + Math.random() * 40,
    });
  }

  // Initialize clouds
  clouds = [];
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * 450,
      y: 20 + Math.random() * 80,
      width: 40 + Math.random() * 40,
      speed: 0.2 + Math.random() * 0.3,
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

  // Sky gradient - sunset theme
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#ff6b6b");
  skyGradient.addColorStop(0.4, "#ff9f43");
  skyGradient.addColorStop(0.7, "#feca57");
  skyGradient.addColorStop(1, "#48dbfb");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = "rgba(255, 200, 87, 0.7)";
  ctx.beginPath();
  ctx.arc(width - 80, 60, 40, 0, Math.PI * 2);
  ctx.fill();

  // Clouds
  const speed = state.phase === "playing" ? state.speed * 0.05 : 0.2;
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed * speed;
    if (cloud.x < -cloud.width) {
      cloud.x = width + cloud.width;
      cloud.y = 20 + Math.random() * 80;
    }
    drawCloud(cloud.x, cloud.y, cloud.width);
  });

  // Background buildings (parallax)
  const buildingSpeed = state.phase === "playing" ? state.speed * 0.15 : 0;
  buildings.forEach(building => {
    building.x -= buildingSpeed;
    if (building.x < -building.width) {
      building.x = width + Math.random() * 50;
      building.height = 100 + Math.random() * 100;
      building.width = 80 + Math.random() * 40;
    }
    drawBackgroundBuilding(building.x, building.height, building.width);
  });

  // Current rooftop platform
  const groundY = height - 80;
  const roofGradient = ctx.createLinearGradient(0, groundY, 0, groundY + 30);
  roofGradient.addColorStop(0, "#34495e");
  roofGradient.addColorStop(1, "#2c3e50");
  ctx.fillStyle = roofGradient;
  ctx.fillRect(0, groundY, width, 30);

  // Rooftop details (concrete texture)
  ctx.fillStyle = "#2c3e50";
  for (let i = 0; i < width; i += 60) {
    ctx.fillRect(i, groundY, 1, 30);
  }

  // Building edge
  ctx.fillStyle = "#1a252f";
  ctx.fillRect(0, groundY + 30, width, 50);

  // Lane lines (subtle markers)
  ctx.strokeStyle = "rgba(52, 73, 94, 0.3)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 60);
    ctx.lineTo(i * (width / 3), groundY);
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
  state.obstacles.forEach(obs => drawObstacle(obs, groundY));

  // Player
  drawPlayer(state);
}

function drawCloud(x: number, y: number, width: number): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.arc(x, y, width * 0.3, 0, Math.PI * 2);
  ctx.arc(x + width * 0.3, y - width * 0.1, width * 0.35, 0, Math.PI * 2);
  ctx.arc(x + width * 0.6, y, width * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackgroundBuilding(x: number, height: number, width: number): void {
  const y = canvas.height - 80 - height;

  // Building body
  ctx.fillStyle = "rgba(44, 62, 80, 0.3)";
  ctx.fillRect(x, y, width, height);

  // Windows
  ctx.fillStyle = "rgba(241, 196, 15, 0.4)";
  for (let row = 0; row < height / 20; row++) {
    for (let col = 0; col < 3; col++) {
      if (Math.random() > 0.3) {
        ctx.fillRect(x + 10 + col * 20, y + 10 + row * 20, 12, 12);
      }
    }
  }
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Athletic parkour character
  if (player.isSliding) {
    // Sliding pose - horizontal
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(-20, -10, 40, 20);
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.arc(-10, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Running/jumping pose
    const legAngle = player.isJumping ? 0.3 : Math.sin(Date.now() * 0.02) * 0.3;

    // Body
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(-12, -15, 24, 30);

    // Head
    ctx.fillStyle = "#ffcc99";
    ctx.beginPath();
    ctx.arc(0, -25, 10, 0, Math.PI * 2);
    ctx.fill();

    // Headband
    ctx.fillStyle = "#f39c12";
    ctx.fillRect(-10, -28, 20, 4);

    // Arms - dynamic
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    // Left arm
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-18, player.isJumping ? -5 : 5);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(10, -10);
    ctx.lineTo(18, player.isJumping ? -5 : 5);
    ctx.stroke();

    // Legs
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 6;

    // Left leg
    ctx.beginPath();
    ctx.moveTo(-6, 15);
    ctx.lineTo(-10 - Math.cos(legAngle) * 10, 28 + Math.sin(legAngle) * 5);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(6, 15);
    ctx.lineTo(10 + Math.cos(legAngle) * 10, 28 - Math.sin(legAngle) * 5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle, groundY: number): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "gap":
      // Gap between buildings
      ctx.fillStyle = "#1a252f";
      ctx.fillRect(-obs.width / 2, 0, obs.width, 70);
      ctx.strokeStyle = "#95a5a6";
      ctx.lineWidth = 2;
      ctx.strokeRect(-obs.width / 2, 0, obs.width, 70);
      break;

    case "ac-unit":
      // Air conditioning unit
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-25, -20, 50, 40);
      ctx.fillStyle = "#95a5a6";
      ctx.fillRect(-20, -15, 40, 30);
      // Fan grille
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-15 + i * 10, -10);
        ctx.lineTo(-15 + i * 10, 15);
        ctx.stroke();
      }
      break;

    case "antenna":
      // Radio antenna
      ctx.strokeStyle = "#95a5a6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.lineTo(0, -40);
      ctx.stroke();
      // Crossbars
      ctx.strokeStyle = "#7f8c8d";
      ctx.lineWidth = 2;
      for (let i = -30; i <= 30; i += 20) {
        ctx.beginPath();
        ctx.moveTo(-10, i);
        ctx.lineTo(10, i);
        ctx.stroke();
      }
      break;

    case "fence":
      // Chain link fence
      ctx.fillStyle = "#34495e";
      ctx.fillRect(-20, -30, 5, 60);
      ctx.fillRect(15, -30, 5, 60);
      ctx.strokeStyle = "#7f8c8d";
      ctx.lineWidth = 2;
      for (let i = -25; i <= 25; i += 10) {
        ctx.beginPath();
        ctx.moveTo(-15, i);
        ctx.lineTo(15, i);
        ctx.stroke();
      }
      break;

    case "billboard":
      // Billboard sign
      ctx.fillStyle = "#34495e";
      ctx.fillRect(-30, -25, 60, 50);
      ctx.fillStyle = "#f39c12";
      ctx.fillRect(-25, -20, 50, 40);
      ctx.fillStyle = "#e67e22";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("AD", 0, 5);
      // Support poles
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-25, 20, 5, 30);
      ctx.fillRect(20, 20, 5, 30);
      break;

    case "water-tank":
      // Water tank
      ctx.fillStyle = "#3498db";
      ctx.beginPath();
      ctx.arc(0, -5, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2980b9";
      ctx.fillRect(-25, -5, 50, 25);
      // Support legs
      ctx.fillStyle = "#7f8c8d";
      ctx.fillRect(-20, 20, 6, 15);
      ctx.fillRect(14, 20, 6, 15);
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.006) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "energy-drink":
      // Energy drink can
      ctx.fillStyle = "#3498db";
      ctx.fillRect(-8, -12, 16, 24);
      ctx.fillStyle = "#2980b9";
      ctx.fillRect(-8, -12, 16, 4);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("E", 0, 2);
      break;

    case "medal":
      // Gold medal
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#e67e22";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      // Ribbon
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(-3, -15, 6, 10);
      break;

    case "skill-point":
      // Skill star
      ctx.fillStyle = "#e74c3c";
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 2;
      drawStar(0, 0, 5, 14, 7);
      ctx.fill();
      ctx.stroke();
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
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  skillsDisplay.textContent = state.skillPoints.toString();
  medalsDisplay.textContent = state.medals.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.skills")}</div><div class="stat-value">${state.skillPoints}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.medals")}</div><div class="stat-value">${state.medals}</div></div>
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
