import { SpyRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const intelDisplay = document.getElementById("intel-display")!;
const gadgetsDisplay = document.getElementById("gadgets-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: SpyRunGame;
let animationFrame: number | null = null;
let techPanels: { x: number; height: number; lights: number[] }[] = [];

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
  game = new SpyRunGame();
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
  techPanels = [];
  for (let i = 0; i < 6; i++) {
    const lights = [];
    for (let j = 0; j < 5; j++) {
      lights.push(Math.random());
    }
    techPanels.push({
      x: i * 100,
      height: 200 + Math.random() * 100,
      lights,
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

  // High-tech facility background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#0a0a1a");
  bgGradient.addColorStop(0.5, "#0d1b2a");
  bgGradient.addColorStop(1, "#1b263b");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Tech panels
  const panelSpeed = state.phase === "playing" ? state.speed * 0.12 : 0.1;
  techPanels.forEach(panel => {
    panel.x -= panelSpeed;
    if (panel.x < -60) {
      panel.x = width + 40;
      panel.height = 200 + Math.random() * 100;
    }
    drawTechPanel(panel.x, groundY, panel.height, panel.lights);
  });

  // Floor - metal grating
  ctx.fillStyle = "#1b263b";
  ctx.fillRect(0, groundY, width, 80);

  // Grid pattern
  ctx.strokeStyle = "rgba(0, 212, 170, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, groundY);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let j = groundY; j < height; j += 20) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(width, j);
    ctx.stroke();
  }

  // Lane dividers
  ctx.strokeStyle = "rgba(0, 212, 170, 0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY);
    ctx.lineTo(i * (width / 3), height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Detection meter
  drawDetectionMeter(state.detected);

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

function drawTechPanel(x: number, groundY: number, height: number, lights: number[]): void {
  const y = groundY - height;

  // Panel
  ctx.fillStyle = "#0d1b2a";
  ctx.fillRect(x, y, 50, height);

  // Border
  ctx.strokeStyle = "#00d4aa";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 50, height);

  // Blinking lights
  lights.forEach((phase, i) => {
    const on = Math.sin(Date.now() * 0.003 + phase * 10) > 0;
    ctx.fillStyle = on ? "#00d4aa" : "#1b263b";
    ctx.beginPath();
    ctx.arc(x + 25, y + 20 + i * 35, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDetectionMeter(detected: number): void {
  const barWidth = 100;
  const barHeight = 12;
  const x = 20;
  const y = 20;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(x, y, barWidth, barHeight);

  const pct = detected / 100;
  const color = pct < 0.3 ? "#00d4aa" : pct < 0.6 ? "#f39c12" : "#e74c3c";
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  // Scan line effect when high
  if (pct > 0.5) {
    ctx.globalAlpha = 0.3;
    const scanY = y + (Date.now() % 500) / 500 * barHeight;
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, scanY, barWidth * pct, 2);
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = "#00d4aa";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  // Eye icon
  ctx.fillStyle = pct > 0.5 ? "#e74c3c" : "#00d4aa";
  ctx.font = "14px sans-serif";
  ctx.fillText("👁", x + barWidth + 8, y + 11);
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  if (player.isSliding) {
    // Sliding spy
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(-18, 5, 36, 12);
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.arc(-8, 5, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Running spy in stealth suit
    const legAngle = player.isJumping ? 0.2 : Math.sin(Date.now() * 0.02) * 0.4;

    // Body (stealth suit)
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(-10, -18, 20, 28);

    // Tactical vest
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-8, -15, 16, 20);

    // Head with night vision
    ctx.fillStyle = "#1a1a2e";
    ctx.beginPath();
    ctx.arc(0, -22, 9, 0, Math.PI * 2);
    ctx.fill();

    // Night vision goggles
    ctx.fillStyle = "#00d4aa";
    ctx.beginPath();
    ctx.arc(-4, -24, 4, 0, Math.PI * 2);
    ctx.arc(4, -24, 4, 0, Math.PI * 2);
    ctx.fill();

    // Glow effect
    ctx.shadowColor = "#00d4aa";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-4, -24, 2, 0, Math.PI * 2);
    ctx.arc(4, -24, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Legs
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(-6 - Math.cos(legAngle) * 7, 25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, 10);
    ctx.lineTo(6 + Math.cos(legAngle) * 7, 25);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "laser-grid":
      // Laser emitters
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, 8, obs.height);
      ctx.fillRect(obs.width / 2 - 8, -obs.height / 2, 8, obs.height);
      // Lasers
      ctx.strokeStyle = "#e74c3c";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const y = -obs.height / 2 + 10 + i * 15;
        ctx.beginPath();
        ctx.moveTo(-obs.width / 2 + 8, y);
        ctx.lineTo(obs.width / 2 - 8, y);
        ctx.stroke();
      }
      // Glow
      ctx.shadowColor = "#e74c3c";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;

    case "turret":
      ctx.fillStyle = "#34495e";
      ctx.fillRect(-15, -5, 30, 25);
      ctx.fillStyle = "#7f8c8d";
      ctx.beginPath();
      ctx.arc(0, -5, 12, 0, Math.PI * 2);
      ctx.fill();
      // Barrel
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(8, -8, 15, 6);
      // Light
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, -5, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "patrol":
      // Guard body
      ctx.fillStyle = "#2c3e50";
      ctx.fillRect(-12, -obs.height / 2 + 15, 24, 35);
      // Head with helmet
      ctx.fillStyle = "#1a252f";
      ctx.beginPath();
      ctx.arc(0, -obs.height / 2 + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(-8, -obs.height / 2 + 6, 16, 4);
      break;

    case "sensor":
      ctx.fillStyle = "#34495e";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      // Scanning effect
      const scanAngle = (Date.now() % 2000) / 2000 * Math.PI * 2;
      ctx.strokeStyle = "rgba(0, 212, 170, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(scanAngle) * 30, Math.sin(scanAngle) * 30);
      ctx.stroke();
      // Center
      ctx.fillStyle = "#00d4aa";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "door":
      ctx.fillStyle = "#34495e";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Door frame
      ctx.strokeStyle = "#00d4aa";
      ctx.lineWidth = 3;
      ctx.strokeRect(-obs.width / 2 + 3, -obs.height / 2 + 3, obs.width - 6, obs.height - 6);
      // Lock
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(obs.width / 2 - 12, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "drone":
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Propellers
      ctx.strokeStyle = "#7f8c8d";
      ctx.lineWidth = 2;
      const propAngle = Date.now() * 0.05;
      ctx.beginPath();
      ctx.moveTo(-15 + Math.cos(propAngle) * 8, -5);
      ctx.lineTo(-15 - Math.cos(propAngle) * 8, -5);
      ctx.moveTo(15 + Math.cos(propAngle) * 8, -5);
      ctx.lineTo(15 - Math.cos(propAngle) * 8, -5);
      ctx.stroke();
      // Eye
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
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
    case "intel":
      ctx.fillStyle = "#3498db";
      ctx.fillRect(-10, -8, 20, 16);
      ctx.fillStyle = "#2980b9";
      ctx.fillRect(-8, -6, 16, 12);
      // Screen glow
      ctx.fillStyle = "#00d4aa";
      ctx.fillRect(-6, -4, 12, 8);
      break;

    case "gadget":
      ctx.fillStyle = "#9b59b6";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8e44ad";
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(4, -6);
      ctx.lineTo(6, 0);
      ctx.lineTo(4, 6);
      ctx.lineTo(-4, 6);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case "key":
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.arc(0, -5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3, 0, 6, 15);
      ctx.fillRect(0, 10, 8, 3);
      ctx.fillRect(0, 5, 6, 3);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  intelDisplay.textContent = state.intel.toString();
  gadgetsDisplay.textContent = state.gadgets.toString();
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  statsGrid.innerHTML = `
    <div class="stat-item"><div class="stat-label">${i18n.t("game.distance")}</div><div class="stat-value">${Math.floor(state.distance)}m</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.intel")}</div><div class="stat-value">${state.intel}</div></div>
    <div class="stat-item"><div class="stat-label">${i18n.t("game.gadgets")}</div><div class="stat-value">${state.gadgets}</div></div>
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
