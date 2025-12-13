import { FlyingRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const altitudeDisplay = document.getElementById("altitude-display")!;
const feathersDisplay = document.getElementById("feathers-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: FlyingRunGame;
let animationFrame: number | null = null;
let clouds: { x: number; y: number; size: number; speed: number }[] = [];
let sunRotation = 0;

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
  initClouds();
  game = new FlyingRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });

  window.addEventListener("keyup", (e) => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) e.preventDefault();
    game.handleKeyUp(e.code);
  });

  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function initClouds(): void {
  clouds = [];
  for (let i = 0; i < 8; i++) {
    clouds.push({
      x: Math.random() * 450,
      y: Math.random() * 400,
      size: 40 + Math.random() * 60,
      speed: 0.3 + Math.random() * 0.5,
    });
  }
}

function setupMobileControls(): void {
  const flyBtn = document.getElementById("fly-btn");
  const boostBtn = document.getElementById("boost-btn");

  let flyInterval: number | null = null;

  flyBtn?.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.flyUp();
    flyInterval = window.setInterval(() => game.flyUp(), 50);
  });

  flyBtn?.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.flyDown();
    if (flyInterval) clearInterval(flyInterval);
  });

  flyBtn?.addEventListener("mousedown", (e) => {
    e.preventDefault();
    game.flyUp();
    flyInterval = window.setInterval(() => game.flyUp(), 50);
  });

  flyBtn?.addEventListener("mouseup", (e) => {
    e.preventDefault();
    game.flyDown();
    if (flyInterval) clearInterval(flyInterval);
  });

  boostBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.boost(); });
  boostBtn?.addEventListener("click", (e) => { e.preventDefault(); game.boost(); });
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

  // Sky gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#87ceeb");
  gradient.addColorStop(0.7, "#b0d4f1");
  gradient.addColorStop(1, "#e0f6ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  sunRotation += 0.002;
  ctx.save();
  ctx.translate(380, 80);
  ctx.rotate(sunRotation);

  // Sun rays
  ctx.strokeStyle = "rgba(255, 220, 100, 0.4)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 35, Math.sin(angle) * 35);
    ctx.lineTo(Math.cos(angle) * 50, Math.sin(angle) * 50);
    ctx.stroke();
  }

  // Sun core
  const sunGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
  sunGradient.addColorStop(0, "#fff9e6");
  sunGradient.addColorStop(0.5, "#ffeb99");
  sunGradient.addColorStop(1, "#ffd700");
  ctx.fillStyle = sunGradient;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Background clouds
  const speed = state.phase === "playing" ? state.speed : 0.5;
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed * speed * 0.2;
    if (cloud.x < -cloud.size) { cloud.x = width + cloud.size; cloud.y = Math.random() * height; }
    drawBackgroundCloud(cloud.x, cloud.y, cloud.size);
  });

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "16px 'Segoe UI'";
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

  // Boost indicator
  if (state.hasBoosted) {
    ctx.fillStyle = "rgba(255, 215, 0, 0.2)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 20px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.boost"), width / 2, 30);
  }
}

function drawBackgroundCloud(x: number, y: number, size: number): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.arc(x + size * 0.3, y - size * 0.2, size * 0.35, 0, Math.PI * 2);
  ctx.arc(x - size * 0.3, y - size * 0.1, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.rotation);

  // Boost glow
  if (state.hasBoosted) {
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ffd700";
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Wings - upper
  ctx.fillStyle = player.isFlying ? "#fff8dc" : "#f0e68c";
  ctx.beginPath();
  ctx.ellipse(-5, -15, 18, 12, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Wings - lower
  ctx.fillStyle = player.isFlying ? "#fff8dc" : "#f0e68c";
  ctx.beginPath();
  ctx.ellipse(-5, 15, 18, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#3498db";
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#2980b9";
  ctx.beginPath();
  ctx.arc(10, -5, 10, 0, Math.PI * 2);
  ctx.fill();

  // Goggles
  ctx.strokeStyle = "#34495e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(13, -5, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Jetpack
  if (player.isFlying) {
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(-15, -8, 8, 16);

    // Flame
    ctx.fillStyle = "#ffa500";
    ctx.beginPath();
    ctx.moveTo(-15, -5);
    ctx.lineTo(-25 - Math.random() * 8, 0);
    ctx.lineTo(-15, 5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "cloud":
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      const cloudSize = obs.width / 2;
      ctx.beginPath();
      ctx.arc(-cloudSize * 0.3, 0, cloudSize * 0.4, 0, Math.PI * 2);
      ctx.arc(0, -cloudSize * 0.2, cloudSize * 0.45, 0, Math.PI * 2);
      ctx.arc(cloudSize * 0.3, 0, cloudSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "bird":
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      // Wings - animated
      const wingAngle = Math.sin(Date.now() * 0.01) * 0.3;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-8, -10 + wingAngle * 10, 0, -5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.quadraticCurveTo(8, -10 + wingAngle * 10, 0, -5);
      ctx.stroke();
      break;

    case "plane":
      ctx.fillStyle = "#e74c3c";
      // Fuselage
      ctx.fillRect(-20, -5, 40, 10);
      // Wings
      ctx.fillRect(-10, -15, 20, 5);
      // Tail
      ctx.fillRect(-20, -10, 5, 15);
      // Cockpit
      ctx.fillStyle = "#3498db";
      ctx.fillRect(10, -3, 8, 6);
      break;

    case "island":
      // Grass
      ctx.fillStyle = "#52c41a";
      ctx.beginPath();
      ctx.ellipse(0, -10, obs.width / 2, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dirt
      ctx.fillStyle = "#8b4513";
      ctx.beginPath();
      ctx.ellipse(0, 5, obs.width / 2.5, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);
  ctx.rotate(col.rotation);

  const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "feather":
      ctx.fillStyle = "#fff8dc";
      ctx.strokeStyle = "#daa520";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 15, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Feather detail
      ctx.strokeStyle = "#daa520";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
      break;

    case "wind":
      ctx.strokeStyle = "#87ceeb";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-12, -8 + i * 8);
        ctx.lineTo(12, -8 + i * 8);
        ctx.stroke();
      }
      break;

    case "ring":
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "#ffed4e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  altitudeDisplay.textContent = Math.floor(state.altitude).toString() + "m";
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.altitude")}</div><div class="stat-value">${Math.floor(state.altitude)}m</div></div>
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
