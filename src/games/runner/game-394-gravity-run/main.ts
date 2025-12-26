import { GravityRunGame, GameState, Obstacle, Collectible, Particle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const orbsDisplay = document.getElementById("orbs-display")!;
const gravityDisplay = document.getElementById("gravity-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: GravityRunGame;
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
  game = new GravityRunGame();
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

function setupMobileControls(): void {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const jumpBtn = document.getElementById("jump-btn");

  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.flipGravity(); });
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

  // Space background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#0a0a1a");
  bgGradient.addColorStop(0.5, "#1a1a3a");
  bgGradient.addColorStop(1, "#0a0a1a");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Stars
  ctx.fillStyle = "#FFF";
  for (let i = 0; i < 50; i++) {
    const x = (i * 97 + Date.now() * 0.02) % width;
    const y = (i * 73) % height;
    const size = (i % 3) + 1;
    ctx.globalAlpha = 0.3 + (i % 5) * 0.15;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Grid lines (sci-fi effect)
  ctx.strokeStyle = "rgba(0, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const y = ((i * 40 + Date.now() * 0.05) % height);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Floor and ceiling platforms
  const groundY = height - 65;
  const ceilingY = 65;

  // Ceiling
  const ceilingGradient = ctx.createLinearGradient(0, 0, 0, ceilingY + 20);
  ceilingGradient.addColorStop(0, "#2a2a4a");
  ceilingGradient.addColorStop(1, "#1a1a3a");
  ctx.fillStyle = ceilingGradient;
  ctx.fillRect(0, 0, width, ceilingY + 20);
  ctx.strokeStyle = "#00FFFF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, ceilingY + 20);
  ctx.lineTo(width, ceilingY + 20);
  ctx.stroke();

  // Floor
  const floorGradient = ctx.createLinearGradient(0, groundY - 20, 0, height);
  floorGradient.addColorStop(0, "#1a1a3a");
  floorGradient.addColorStop(1, "#2a2a4a");
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, groundY - 20, width, 85);
  ctx.strokeStyle = "#FF00FF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY - 20);
  ctx.lineTo(width, groundY - 20);
  ctx.stroke();

  // Particles
  state.particles.forEach(p => drawParticle(p));

  // Lane markers
  ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), ceilingY + 25);
    ctx.lineTo(i * (width / 3), groundY - 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(0, 255, 255, 0.9)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Collectibles
  state.collectibles.forEach(col => drawCollectible(col));

  // Obstacles
  state.obstacles.forEach(obs => drawObstacle(obs, state));

  // Player
  drawPlayer(state);
}

function drawParticle(p: Particle): void {
  ctx.fillStyle = p.color;
  ctx.globalAlpha = p.life / 400;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Flip if gravity is reversed
  if (player.gravityDirection === -1) {
    ctx.scale(1, -1);
  }

  // Shield effect
  if (state.hasShield) {
    ctx.strokeStyle = "#00FFFF";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Astronaut body
  ctx.fillStyle = "#E0E0E0";
  ctx.beginPath();
  ctx.roundRect(-12, -15, 24, 30, 5);
  ctx.fill();

  // Backpack
  ctx.fillStyle = "#808080";
  ctx.fillRect(-15, -10, 5, 20);

  // Helmet
  ctx.fillStyle = "#E0E0E0";
  ctx.beginPath();
  ctx.arc(0, -22, 12, 0, Math.PI * 2);
  ctx.fill();

  // Visor
  ctx.fillStyle = "#00CED1";
  ctx.beginPath();
  ctx.arc(2, -22, 8, -0.5, Math.PI + 0.5);
  ctx.fill();

  // Visor reflection
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.arc(-2, -25, 3, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = "#E0E0E0";
  const legSwing = player.isFlipping ? Math.sin(Date.now() * 0.03) * 20 : Math.sin(Date.now() * 0.015) * 8;
  ctx.save();
  ctx.translate(-5, 15);
  ctx.rotate((legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 12);
  ctx.restore();
  ctx.save();
  ctx.translate(5, 15);
  ctx.rotate((-legSwing * Math.PI) / 180);
  ctx.fillRect(-4, 0, 8, 12);
  ctx.restore();

  // Jetpack flame when flipping
  if (player.isFlipping) {
    const flameColors = ['#FF4500', '#FFD700', '#FF6347'];
    ctx.fillStyle = flameColors[Math.floor(Date.now() / 50) % 3];
    ctx.beginPath();
    ctx.moveTo(-12, 10);
    ctx.lineTo(-18, 10 + Math.random() * 15 + 10);
    ctx.lineTo(-8, 10);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle, state: GameState): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "spike":
      ctx.fillStyle = obs.color;
      if (obs.position === 'floor') {
        ctx.beginPath();
        ctx.moveTo(0, -obs.height / 2);
        ctx.lineTo(-obs.width / 2, obs.height / 2);
        ctx.lineTo(obs.width / 2, obs.height / 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, obs.height / 2);
        ctx.lineTo(-obs.width / 2, -obs.height / 2);
        ctx.lineTo(obs.width / 2, -obs.height / 2);
        ctx.closePath();
        ctx.fill();
      }
      // Glow
      ctx.shadowColor = obs.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      break;

    case "laser":
      if (obs.active) {
        ctx.fillStyle = "#FF0000";
        ctx.globalAlpha = 0.8;
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
        // Glow effect
        ctx.shadowColor = "#FF0000";
        ctx.shadowBlur = 15;
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      } else {
        ctx.fillStyle = "#330000";
        ctx.globalAlpha = 0.5;
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      }
      // Emitters
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#444";
      ctx.fillRect(-15, -obs.height / 2 - 5, 30, 10);
      ctx.fillRect(-15, obs.height / 2 - 5, 30, 10);
      break;

    case "block":
      ctx.fillStyle = obs.color;
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2;
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      // Circuit pattern
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(-obs.width / 4, -obs.height / 2);
      ctx.lineTo(-obs.width / 4, 0);
      ctx.lineTo(obs.width / 4, 0);
      ctx.lineTo(obs.width / 4, obs.height / 2);
      ctx.stroke();
      break;

    case "portal":
      // Portal ring effect
      const portalPulse = Math.sin(Date.now() * 0.005) * 10;
      ctx.strokeStyle = obs.color;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20 + portalPulse, obs.height / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 30 + portalPulse, obs.height / 2 - 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  if (col.collected) return;
  ctx.save();
  ctx.translate(col.x, col.y + col.yOffset);

  const pulse = Math.sin(Date.now() * 0.006) * 0.15 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "orb":
      // Energy orb
      const orbGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
      orbGradient.addColorStop(0, "#FFFFFF");
      orbGradient.addColorStop(0.5, "#00FFFF");
      orbGradient.addColorStop(1, "#0080FF");
      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "antigrav":
      // Anti-gravity symbol
      ctx.fillStyle = "#FF00FF";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(10, -8);
      ctx.lineTo(-10, -8);
      ctx.closePath();
      ctx.fill();
      // Arrows
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, -15);
      ctx.moveTo(-3, -12);
      ctx.lineTo(0, -15);
      ctx.lineTo(3, -12);
      ctx.moveTo(0, 5);
      ctx.lineTo(0, 15);
      ctx.moveTo(-3, 12);
      ctx.lineTo(0, 15);
      ctx.lineTo(3, 12);
      ctx.stroke();
      break;

    case "shield":
      // Shield icon
      ctx.fillStyle = "#00CED1";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(14, -8, 12, 4);
      ctx.quadraticCurveTo(6, 14, 0, 16);
      ctx.quadraticCurveTo(-6, 14, -12, 4);
      ctx.quadraticCurveTo(-14, -8, 0, -12);
      ctx.fill();
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance).toString() + "m";
  orbsDisplay.textContent = state.orbs.toString();
  gravityDisplay.textContent = state.player.gravityDirection === 1 ? "\u2193" : "\u2191";
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  const distLabel = i18n.t("game.distance");
  const orbsLabel = i18n.t("game.orbs");
  const flipsLabel = i18n.t("game.flips");
  statsGrid.innerHTML = '<div class="stat-item"><div class="stat-label">' + distLabel + '</div><div class="stat-value">' + Math.floor(state.distance) + 'm</div></div><div class="stat-item"><div class="stat-label">' + orbsLabel + '</div><div class="stat-value">' + state.orbs + '</div></div><div class="stat-item"><div class="stat-label">' + flipsLabel + '</div><div class="stat-value">' + state.flips + '</div></div>';
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
