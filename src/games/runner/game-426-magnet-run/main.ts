import { MagnetRunGame, GameState, Obstacle, Collectible, Particle, MagneticField } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const polarityDisplay = document.getElementById("polarity-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: MagnetRunGame;
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
  game = new MagnetRunGame();
  game.onStateChange = (state: GameState) => {
    updateUI(state);
    if (state.phase === "gameover") showGameOverOverlay(state);
  };
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(e.code)) e.preventDefault();
    game.handleKeyDown(e.code);
  });
  setupMobileControls();
  window.addEventListener("resize", resizeCanvas);
  startRenderLoop();
}

function setupMobileControls(): void {
  const switchBtn = document.getElementById("switch-btn");
  switchBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); game.switchPolarity(); });
  switchBtn?.addEventListener("click", () => game.switchPolarity());
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

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1a0a2e");
  gradient.addColorStop(0.5, "#16213e");
  gradient.addColorStop(1, "#0f3460");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Ceiling (positive/blue)
  ctx.fillStyle = "#4444ff33";
  ctx.fillRect(0, 0, width, 80);
  ctx.fillStyle = "#4444ff";
  ctx.fillRect(0, 78, width, 4);

  // Floor (negative/red)
  ctx.fillStyle = "#ff444433";
  ctx.fillRect(0, height - 80, width, 80);
  ctx.fillStyle = "#ff4444";
  ctx.fillRect(0, height - 82, width, 4);

  // Draw magnetic field lines
  drawMagneticFieldLines(state);

  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "18px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.controls"), width / 2, height / 2);
    return;
  }

  // Magnetic fields
  state.fields.forEach(field => drawMagneticField(field));

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

function drawMagneticFieldLines(state: GameState): void {
  const { width, height } = canvas;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 8; i++) {
    const y = 80 + (height - 160) * (i / 7);
    ctx.beginPath();
    ctx.setLineDash([5, 10]);
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawMagneticField(field: MagneticField): void {
  ctx.save();
  ctx.translate(field.x, field.y);

  const color = field.polarity === 'positive' ? '#4444ff' : '#ff4444';

  // Outer ring
  ctx.strokeStyle = color + '44';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, field.radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner gradient
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, field.radius);
  gradient.addColorStop(0, color + '33');
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, field.radius, 0, Math.PI * 2);
  ctx.fill();

  // Polarity symbol
  ctx.fillStyle = color;
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(field.polarity === 'positive' ? 'N' : 'S', 0, 0);

  ctx.restore();
}

function drawPlayer(state: GameState): void {
  const { player } = state;
  ctx.save();
  ctx.translate(player.x, player.y);

  // Shield effect
  if (state.hasShield) {
    ctx.strokeStyle = "#00ffaa";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0, 255, 170, 0.1)";
    ctx.fill();
  }

  // Magnet boost effect
  if (state.magnetBoost) {
    ctx.strokeStyle = player.polarity === 'positive' ? '#66aaff' : '#ffaa66';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 25 + i * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Player body (magnet shape)
  const mainColor = player.polarity === 'positive' ? '#4444ff' : '#ff4444';
  const secondColor = player.polarity === 'positive' ? '#ff4444' : '#4444ff';

  // U-shaped magnet
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.roundRect(-15, -20, 10, 40, 3);
  ctx.fill();

  ctx.fillStyle = secondColor;
  ctx.beginPath();
  ctx.roundRect(5, -20, 10, 40, 3);
  ctx.fill();

  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.roundRect(-15, 15, 30, 8, 3);
  ctx.fill();

  // Polarity indicator
  ctx.fillStyle = '#fff';
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(player.polarity === 'positive' ? 'N' : 'S', -10, -5);
  ctx.fillText(player.polarity === 'positive' ? 'S' : 'N', 10, -5);

  ctx.restore();
}

function drawObstacle(obs: Obstacle): void {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  switch (obs.type) {
    case "spike":
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      if (obs.y < 200) {
        // Ceiling spike (pointing down)
        ctx.moveTo(-15, -20);
        ctx.lineTo(0, 20);
        ctx.lineTo(15, -20);
      } else {
        // Floor spike (pointing up)
        ctx.moveTo(-15, 20);
        ctx.lineTo(0, -20);
        ctx.lineTo(15, 20);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case "barrier":
      const barrierColor = obs.polarity === 'positive' ? '#4444ff' : '#ff4444';
      ctx.fillStyle = barrierColor + '88';
      ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
      ctx.strokeStyle = barrierColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);

      // Polarity symbol
      ctx.fillStyle = '#fff';
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(obs.polarity === 'positive' ? 'N' : 'S', 0, 0);
      break;

    case "moving":
      ctx.fillStyle = "#aa44aa";
      ctx.beginPath();
      ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ff66ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function drawCollectible(col: Collectible): void {
  ctx.save();
  ctx.translate(col.x, col.y);

  const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1;
  ctx.scale(pulse, pulse);

  switch (col.type) {
    case "coin":
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b8860b";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 0);
      break;

    case "magnet_boost":
      ctx.fillStyle = "#ff00ff";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("M", 0, 0);
      break;

    case "shield":
      ctx.strokeStyle = "#00ffaa";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(0, 255, 170, 0.3)";
      ctx.fill();
      break;
  }

  ctx.restore();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  coinsDisplay.textContent = state.coins.toString();
  speedDisplay.textContent = state.speed.toFixed(1);

  polarityDisplay.textContent = state.player.polarity === 'positive' ? 'N' : 'S';
  polarityDisplay.style.color = state.player.polarity === 'positive' ? '#4444ff' : '#ff4444';
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
