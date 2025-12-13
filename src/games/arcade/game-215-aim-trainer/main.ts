/**
 * Aim Trainer Main Entry
 * Game #215
 */
import { AimTrainerGame, GameState, Target } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const hitsDisplay = document.getElementById("hits-display")!;
const missesDisplay = document.getElementById("misses-display")!;
const accuracyDisplay = document.getElementById("accuracy-display")!;
const timeDisplay = document.getElementById("time-display")!;
const timerFill = document.getElementById("timer-fill")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const statsGrid = document.getElementById("stats-grid")!;
const startBtn = document.getElementById("start-btn")!;

let game: AimTrainerGame;
let animationFrame: number | null = null;

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh")) i18n.setLocale("zh-TW");
  else if (browserLang.includes("ja")) i18n.setLocale("ja");
  else i18n.setLocale("en");

  languageSelect.value = i18n.getLocale();
  updateTexts();

  languageSelect.addEventListener("change", () => {
    i18n.setLocale(languageSelect.value as Locale);
    updateTexts();
  });
}

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  resizeCanvas();

  game = new AimTrainerGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchend", handleTouch, { passive: false });

  window.addEventListener("resize", resizeCanvas);

  startRenderLoop();
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 400;

  if (game) {
    game.setCanvasSize(canvas.width, canvas.height);
  }
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function handleClick(e: MouseEvent): void {
  if (game.getState().phase !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  game.click(x, y);
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase !== "playing") return;

  const touch = e.changedTouches[0];
  const { x, y } = getCanvasCoords(touch);
  game.click(x, y);
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

  // Background
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, width, height);

  // Grid pattern
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw target
  if (state.target) {
    drawTarget(state.target);
  }

  // Idle state message
  if (state.phase === "idle") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "24px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(i18n.t("game.instructions"), width / 2, height / 2);
  }
}

function drawTarget(target: Target): void {
  const { x, y, radius, color, spawnTime } = target;

  // Calculate lifetime progress for visual feedback
  const elapsed = performance.now() - spawnTime;
  const lifetime = 1500;
  const progress = Math.min(elapsed / lifetime, 1);

  // Outer ring (shrinks as time passes)
  const outerRadius = radius + (1 - progress) * 15;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5 * (1 - progress);
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
  ctx.fill();

  // Main target circle
  const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
  gradient.addColorStop(0, lightenColor(color, 30));
  gradient.addColorStop(1, color);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner ring
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  hitsDisplay.textContent = state.hits.toString();
  missesDisplay.textContent = state.misses.toString();
  accuracyDisplay.textContent = `${game.getAccuracy()}%`;
  timeDisplay.textContent = `${state.timeLeft}s`;

  // Timer bar
  const progress = (state.timeLeft / state.totalTime) * 100;
  timerFill.style.width = `${progress}%`;
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = i18n.t("game.finalScore");

  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";

  // Show stats
  statsGrid.innerHTML = `
    <div class="stat-item">
      <div class="stat-label">${i18n.t("game.hits")}</div>
      <div class="stat-value">${state.hits}</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">${i18n.t("game.misses")}</div>
      <div class="stat-value">${state.misses}</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">${i18n.t("game.accuracy")}</div>
      <div class="stat-value">${game.getAccuracy()}%</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">${i18n.t("game.avgTime")}</div>
      <div class="stat-value">${game.getAverageTime()}${i18n.t("game.ms")}</div>
    </div>
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

// Event listeners
startBtn.addEventListener("click", startGame);

// Cleanup
window.addEventListener("beforeunload", () => {
  game?.destroy();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Initialize
initI18n();
initGame();
