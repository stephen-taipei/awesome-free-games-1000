import { TimeRunGame, GameState, Obstacle, Collectible, TimeParticle, Era } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const timeDisplay = document.getElementById("time-display")!;
const eraDisplay = document.getElementById("era-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: TimeRunGame;
let animationFrame: number | null = null;

const ERA_NAMES: Record<Era, Record<string, string>> = {
  prehistoric: { 'zh-TW': '史前', en: 'Prehistoric', ja: '先史' },
  medieval: { 'zh-TW': '中世紀', en: 'Medieval', ja: '中世' },
  present: { 'zh-TW': '現代', en: 'Present', ja: '現代' },
  future: { 'zh-TW': '未來', en: 'Future', ja: '未来' },
};

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
  game = new TimeRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.code)) e.preventDefault();
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

  // Era-based background
  drawEraBackground(state.era, width, height);

  // Time particles
  state.particles.forEach(p => drawTimeParticle(p));

  // Ground based on era
  const groundY = height - 65;
  drawEraGround(state.era, groundY, width, height);

  // Lane markers
  ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 60);
    ctx.lineTo(i * (width / 3), groundY + 10);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Slow motion effect
  if (state.slowMotion) {
    ctx.fillStyle = "rgba(255, 215, 0, 0.1)";
    ctx.fillRect(0, 0, width, height);
    // Clock overlay
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 100, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 215, 0, 0.9)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs));

  // Player
  drawPlayer(state);

  // Time warning
  if (state.timeRemaining < 10000) {
    ctx.fillStyle = "rgba(255, 0, 0, " + (0.3 + Math.sin(Date.now() * 0.01) * 0.2) + ")";
    ctx.fillRect(0, 0, width, height);
  }
}

function drawEraBackground(era: Era, width: number, height: number): void {
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);

  switch (era) {
    case 'prehistoric':
      bgGradient.addColorStop(0, "#87CEEB");
      bgGradient.addColorStop(0.5, "#90EE90");
      bgGradient.addColorStop(1, "#228B22");
      break;
    case 'medieval':
      bgGradient.addColorStop(0, "#4A4A6A");
      bgGradient.addColorStop(0.5, "#6B6B8B");
      bgGradient.addColorStop(1, "#3A3A4A");
      break;
    case 'present':
      bgGradient.addColorStop(0, "#87CEEB");
      bgGradient.addColorStop(0.5, "#B0C4DE");
      bgGradient.addColorStop(1, "#708090");
      break;
    case 'future':
      bgGradient.addColorStop(0, "#1a0a2e");
      bgGradient.addColorStop(0.5, "#2d1b4e");
      bgGradient.addColorStop(1, "#4a2c7a");
      break;
  }

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Era-specific decorations
  if (era === 'prehistoric') {
    // Volcanoes in background
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(50, height - 100);
    ctx.lineTo(80, height - 180);
    ctx.lineTo(110, height - 100);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(350, height - 120);
    ctx.lineTo(390, height - 200);
    ctx.lineTo(430, height - 120);
    ctx.fill();
  } else if (era === 'medieval') {
    // Castle silhouette
    ctx.fillStyle = "#2A2A3A";
    ctx.fillRect(30, height - 180, 60, 100);
    ctx.fillRect(20, height - 200, 20, 120);
    ctx.fillRect(80, height - 200, 20, 120);
    ctx.fillRect(350, height - 160, 80, 80);
    ctx.beginPath();
    ctx.moveTo(350, height - 160);
    ctx.lineTo(390, height - 200);
    ctx.lineTo(430, height - 160);
    ctx.fill();
  } else if (era === 'present') {
    // City buildings
    ctx.fillStyle = "#4A4A5A";
    ctx.fillRect(20, height - 150, 40, 70);
    ctx.fillRect(70, height - 180, 35, 100);
    ctx.fillRect(350, height - 140, 45, 60);
    ctx.fillRect(400, height - 170, 40, 90);
  } else if (era === 'future') {
    // Neon grid and stars
    ctx.strokeStyle = "rgba(148, 0, 211, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 50);
      ctx.lineTo(width, i * 50);
      ctx.stroke();
    }
    // Flying vehicles
    ctx.fillStyle = "#00CED1";
    ctx.beginPath();
    ctx.ellipse(100 + Math.sin(Date.now() * 0.002) * 30, 80, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEraGround(era: Era, groundY: number, width: number, height: number): void {
  let groundColor1, groundColor2;

  switch (era) {
    case 'prehistoric':
      groundColor1 = "#228B22";
      groundColor2 = "#1a6b1a";
      break;
    case 'medieval':
      groundColor1 = "#5A5A5A";
      groundColor2 = "#3A3A3A";
      break;
    case 'present':
      groundColor1 = "#4A4A4A";
      groundColor2 = "#3A3A3A";
      break;
    case 'future':
      groundColor1 = "#2d1b4e";
      groundColor2 = "#1a0a2e";
      break;
  }

  const groundGradient = ctx.createLinearGradient(0, groundY, 0, height);
  groundGradient.addColorStop(0, groundColor1);
  groundGradient.addColorStop(1, groundColor2);
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, groundY + 10, width, 55);

  // Ground line
  ctx.strokeStyle = era === 'future' ? "#9400D3" : "#FFD700";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 10);
  ctx.lineTo(width, groundY + 10);
  ctx.stroke();
}

function drawTimeParticle(p: TimeParticle): void {
  ctx.fillStyle = p.color;
  ctx.globalAlpha = p.life / 500;
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText(p.char, p.x, p.y);
  ctx.globalAlpha = 1;
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Time traveler character
  // Body
  ctx.fillStyle = "#2E86AB";
  ctx.fillRect(-10, -18, 20, 32);

  // Lab coat
  ctx.fillStyle = "#E0E0E0";
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(-12, 15);
  ctx.lineTo(-8, 15);
  ctx.lineTo(-8, -5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -10);
  ctx.lineTo(12, 15);
  ctx.lineTo(8, 15);
  ctx.lineTo(8, -5);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = "#FFDAB9";
  ctx.beginPath();
  ctx.arc(0, -25, 10, 0, Math.PI * 2);
  ctx.fill();

  // Goggles
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(-10, -28, 8, 6);
  ctx.fillRect(2, -28, 8, 6);
  ctx.fillStyle = "#00CED1";
  ctx.fillRect(-9, -27, 6, 4);
  ctx.fillRect(3, -27, 6, 4);
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -25);
  ctx.lineTo(-14, -25);
  ctx.moveTo(10, -25);
  ctx.lineTo(14, -25);
  ctx.stroke();

  // Wild hair
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.arc(0, -32, 8, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, -35);
  ctx.lineTo(-8, -42);
  ctx.lineTo(-2, -38);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -35);
  ctx.lineTo(8, -42);
  ctx.lineTo(2, -38);
  ctx.fill();

  // Time device on wrist
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(-15, -5, 6, 8);
  ctx.fillStyle = "#00FF00";
  ctx.fillRect(-14, -4, 4, 3);

  // Legs
  ctx.fillStyle = "#1a1a2e";
  const legSwing = Math.sin(Date.now() * 0.015) * 8;
  ctx.save();
  ctx.translate(-5, 14);
  ctx.rotate((legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 14);
  ctx.restore();
  ctx.save();
  ctx.translate(5, 14);
  ctx.rotate((-legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 14);
  ctx.restore();

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "dinosaur":
      // T-Rex silhouette
      ctx.fillStyle = "#228B22";
      // Body
      ctx.beginPath();
      ctx.ellipse(0, 5, 20, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.ellipse(18, -10, 12, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Jaw
      ctx.beginPath();
      ctx.moveTo(25, -5);
      ctx.lineTo(32, 0);
      ctx.lineTo(25, 5);
      ctx.fill();
      // Eye
      ctx.fillStyle = "#FF0000";
      ctx.beginPath();
      ctx.arc(22, -12, 3, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillStyle = "#228B22";
      ctx.fillRect(-10, 15, 8, 15);
      ctx.fillRect(5, 15, 8, 15);
      // Tail
      ctx.beginPath();
      ctx.moveTo(-20, 5);
      ctx.quadraticCurveTo(-35, 0, -30, -10);
      ctx.lineTo(-25, -5);
      ctx.quadraticCurveTo(-30, 5, -18, 10);
      ctx.fill();
      break;

    case "knight":
      // Armored knight
      ctx.fillStyle = "#808080";
      // Body armor
      ctx.fillRect(-12, -15, 24, 30);
      // Helmet
      ctx.beginPath();
      ctx.arc(0, -22, 12, 0, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(-8, -24, 16, 6);
      // Plume
      ctx.fillStyle = "#FF0000";
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.quadraticCurveTo(10, -40, 5, -45);
      ctx.quadraticCurveTo(0, -38, -5, -45);
      ctx.quadraticCurveTo(-10, -40, 0, -34);
      ctx.fill();
      // Sword
      ctx.fillStyle = "#C0C0C0";
      ctx.fillRect(15, -20, 4, 35);
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(12, 12, 10, 8);
      // Shield
      ctx.fillStyle = "#4169E1";
      ctx.beginPath();
      ctx.moveTo(-18, -10);
      ctx.lineTo(-18, 10);
      ctx.lineTo(-10, 18);
      ctx.lineTo(-10, -10);
      ctx.closePath();
      ctx.fill();
      break;

    case "robot":
      // Futuristic robot
      ctx.fillStyle = "#4A4A6A";
      // Body
      ctx.fillRect(-15, -15, 30, 35);
      // Head
      ctx.fillRect(-12, -30, 24, 18);
      // Eyes
      ctx.fillStyle = "#FF0000";
      ctx.beginPath();
      ctx.arc(-5, -22, 4, 0, Math.PI * 2);
      ctx.arc(5, -22, 4, 0, Math.PI * 2);
      ctx.fill();
      // Antenna
      ctx.fillStyle = "#C0C0C0";
      ctx.fillRect(-2, -38, 4, 10);
      ctx.fillStyle = "#00FF00";
      ctx.beginPath();
      ctx.arc(0, -40, 4, 0, Math.PI * 2);
      ctx.fill();
      // Arms
      ctx.fillStyle = "#4A4A6A";
      ctx.fillRect(-22, -10, 8, 25);
      ctx.fillRect(14, -10, 8, 25);
      // Laser glow
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.arc(-5, -22, 8, 0, Math.PI * 2);
      ctx.arc(5, -22, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "portal":
      // Time portal
      const portalPulse = Math.sin(Date.now() * 0.008) * 5;
      ctx.strokeStyle = "#9400D3";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18 + portalPulse, obs.height / 2 - 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#00CED1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12 + portalPulse, obs.height / 2 - 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Swirl effect
      ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = Date.now() * 0.003 + i * (Math.PI * 2 / 3);
        const r = 8 + i * 5;
        ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * (r * 2));
        ctx.arc(0, 0, r, angle, angle + 1);
      }
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  if (col.collected) return;
  ctx.save();
  ctx.translate(col.x, col.y);

  const float = Math.sin(Date.now() * 0.006) * 5;
  ctx.translate(0, float);
  const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "clock":
      // Clock face
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFF";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      // Clock hands
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 2;
      const time = Date.now() * 0.001;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(time) * 6, Math.sin(time) * 6);
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(time * 12) * 4, Math.sin(time * 12) * 4);
      ctx.stroke();
      // Center
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "hourglass":
      // Hourglass
      ctx.fillStyle = "#C0C0C0";
      ctx.beginPath();
      ctx.moveTo(-8, -14);
      ctx.lineTo(8, -14);
      ctx.lineTo(3, 0);
      ctx.lineTo(8, 14);
      ctx.lineTo(-8, 14);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fill();
      // Sand
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.moveTo(-5, -12);
      ctx.lineTo(5, -12);
      ctx.lineTo(2, -4);
      ctx.lineTo(-2, -4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5, 12);
      ctx.lineTo(5, 12);
      ctx.lineTo(2, 4);
      ctx.lineTo(-2, 4);
      ctx.closePath();
      ctx.fill();
      break;

    case "slowmo":
      // Slow motion icon
      ctx.fillStyle = "#00CED1";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("S", 0, 5);
      // Speed lines
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, -3);
      ctx.lineTo(-14, -3);
      ctx.moveTo(-18, 3);
      ctx.lineTo(-14, 3);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  const seconds = Math.ceil(state.timeRemaining / 1000);
  timeDisplay.textContent = seconds + "s";
  timeDisplay.style.color = seconds <= 10 ? "#FF0000" : "";
  eraDisplay.textContent = ERA_NAMES[state.era][i18n.getLocale()] || ERA_NAMES[state.era]['en'];
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  const distLabel = i18n.t("game.distance");
  const clocksLabel = i18n.t("game.clocks");
  statsGrid.innerHTML = '<div class="stat-item"><div class="stat-label">' + distLabel + '</div><div class="stat-value">' + Math.floor(state.distance) + 'm</div></div><div class="stat-item"><div class="stat-label">' + clocksLabel + '</div><div class="stat-value">' + state.clocksCollected + '</div></div>';
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
