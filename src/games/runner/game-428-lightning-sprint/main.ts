import { LightningSprintGame, GameState, Obstacle, Collectible, Particle, LightningStrike } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const orbsDisplay = document.getElementById("orbs-display")!;
const stormDisplay = document.getElementById("storm-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: LightningSprintGame;
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
  game = new LightningSprintGame();
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
  const dashBtn = document.getElementById("dash-btn");
  leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  jumpBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  dashBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.dash(); });
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

  // Stormy background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(0.3, "#2d2d44");
  gradient.addColorStop(1, "#16213e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Storm clouds
  ctx.fillStyle = "rgba(50, 50, 70, 0.8)";
  for (let i = 0; i < 5; i++) {
    const x = ((Date.now() * 0.02 + i * 100) % (width + 100)) - 50;
    drawCloud(x, 30 + i * 10, 60 + Math.sin(i) * 20);
  }

  // Rain effect
  if (state.phase === 'playing') {
    ctx.strokeStyle = "rgba(150, 180, 255, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 30 * state.stormIntensity; i++) {
      const x = (Date.now() * 0.5 + i * 37) % width;
      const y = (Date.now() * 0.8 + i * 23) % height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y + 15);
      ctx.stroke();
    }
  }

  // Ground
  const groundY = height - 80;
  ctx.fillStyle = "#2a3a4a";
  ctx.fillRect(0, groundY + 25, width, 60);

  // Ground line with electric effect
  ctx.strokeStyle = state.stormIntensity > 5 ? "#ffff00" : "#6688ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 25);
  ctx.lineTo(width, groundY + 25);
  ctx.stroke();

  // Lane lines
  ctx.strokeStyle = "rgba(100, 130, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 10]);
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (width / 3), groundY - 100);
    ctx.lineTo(i * (width / 3), groundY + 25);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Lightning strikes
  state.lightningStrikes.forEach(strike => drawLightningStrike(strike));

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
  state.obstacles.forEach(obs => drawObstacle(obs, state));

  // Player
  drawPlayer(state);
}

function drawCloud(x: number, y: number, width: number): void {
  ctx.beginPath();
  ctx.arc(x, y, width * 0.3, 0, Math.PI * 2);
  ctx.arc(x + width * 0.3, y - 10, width * 0.25, 0, Math.PI * 2);
  ctx.arc(x + width * 0.5, y, width * 0.3, 0, Math.PI * 2);
  ctx.arc(x + width * 0.25, y + 5, width * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawLightningStrike(strike: LightningStrike): void {
  const alpha = strike.life / 300;
  ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
  ctx.lineWidth = 4;
  ctx.beginPath();

  const segmentHeight = (strike.endY - strike.startY) / strike.segments.length;
  ctx.moveTo(strike.x, strike.startY);

  strike.segments.forEach((offset, i) => {
    const y = strike.startY + segmentHeight * (i + 1);
    ctx.lineTo(strike.x + offset, y);
  });

  ctx.stroke();

  // Glow effect
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Invincibility effect
  if (player.invincible) {
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00ffff';
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Dash effect
  if (player.isDashing) {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-20, 0, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player body - lightning bolt shape
  ctx.fillStyle = player.isDashing ? '#ffff00' : '#88aaff';

  // Body
  ctx.beginPath();
  ctx.moveTo(15, -20);
  ctx.lineTo(5, 0);
  ctx.lineTo(15, 0);
  ctx.lineTo(-5, 25);
  ctx.lineTo(5, 5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();

  // Core glow
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(5, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  // Flash effect when dashing
  if (player.isDashing) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (Date.now() * 0.02 + i * Math.PI / 3) % (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
      ctx.lineTo(Math.cos(angle) * 25, Math.sin(angle) * 25);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawObstacle(obs: Obstacle, state: GameState): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "thunder_cloud":
      ctx.fillStyle = obs.striking ? "#ffaa00" : "#4a4a6a";
      drawCloud(0, 0, obs.width);
      if (obs.striking) {
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, obs.height / 2);
        ctx.lineTo(-5, obs.height / 2 + 20);
        ctx.lineTo(5, obs.height / 2 + 30);
        ctx.lineTo(0, obs.height / 2 + 50);
        ctx.stroke();
      }
      break;

    case "static_charge":
      ctx.fillStyle = "#6666aa";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      // Electric sparks
      ctx.strokeStyle = "#aaaaff";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Date.now() * 0.01 + i * Math.PI / 3) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
        ctx.lineTo(Math.cos(angle) * 22, Math.sin(angle) * 22);
        ctx.stroke();
      }
      break;

    case "lightning_strike":
      ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = "#ffff00";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.setLineDash([]);
      // Warning symbol
      ctx.fillStyle = "#ffff00";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚡", 0, 0);
      break;

    case "storm_debris":
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(12, 0);
      ctx.lineTo(8, 12);
      ctx.lineTo(-10, 10);
      ctx.lineTo(-12, -5);
      ctx.closePath();
      ctx.fill();
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
    case "lightning_orb":
      ctx.fillStyle = "#ffff00";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ffff00";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚡", 0, 1);
      break;

    case "speed_boost":
      ctx.fillStyle = "#ff6600";
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case "thunder_shield":
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(0, 255, 255, 0.3)";
      ctx.fill();
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", 0, 0);
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  orbsDisplay.textContent = state.orbs.toString();
  stormDisplay.textContent = state.stormIntensity.toString();
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
    <div class="stat-item"><div class="stat-label">${i18n.t("game.orbs")}</div><div class="stat-value">${state.orbs}</div></div>
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
