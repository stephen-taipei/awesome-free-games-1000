/**
 * Popcorn Machine Main Entry
 * Game #209
 */
import { PopcornMachineGame, GameState, Popcorn } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;
const caughtDisplay = document.getElementById("caught-display")!;
const missedDisplay = document.getElementById("missed-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: PopcornMachineGame;
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

  game = new PopcornMachineGame();
  game.setCanvasWidth(canvas.width);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.status === "gameOver") {
      showGameOverOverlay(state.score);
    }
  };

  // Mouse/touch movement
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

  window.addEventListener("resize", () => {
    resizeCanvas();
    game.setCanvasWidth(canvas.width);
  });

  startRenderLoop();
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 480;
}

function getCanvasX(e: MouseEvent | Touch): number {
  const rect = canvas.getBoundingClientRect();
  return (e.clientX - rect.left) * (canvas.width / rect.width);
}

function handleMouseMove(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;
  game.moveBucket(getCanvasX(e));
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;
  game.moveBucket(getCanvasX(e.touches[0]));
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
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#3d2415");
  gradient.addColorStop(1, "#1a0d08");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw popcorn machine
  drawMachine(width / 2, 60);

  // Draw popcorns
  state.popcorns.forEach((p) => drawPopcorn(p));

  // Draw bucket
  drawBucket(state.bucketX, game.getBucketY());

  // Draw floor
  ctx.fillStyle = "#654321";
  ctx.fillRect(0, height - 30, width, 30);
}

function drawMachine(x: number, y: number): void {
  // Machine body
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.roundRect(x - 50, y - 40, 100, 80, 10);
  ctx.fill();

  // Glass dome
  ctx.fillStyle = "rgba(255, 248, 220, 0.3)";
  ctx.beginPath();
  ctx.arc(x, y - 10, 35, Math.PI, 0);
  ctx.fill();

  // Opening
  ctx.fillStyle = "#2c1810";
  ctx.fillRect(x - 15, y + 20, 30, 20);

  // Decorations
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillText("POP", x, y - 5);
}

function drawPopcorn(p: Popcorn): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);

  let color = "#fff8dc";
  if (p.type === "golden") color = "#ffd700";
  else if (p.type === "burnt") color = "#4a3728";

  // Popcorn shape (cloud-like)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
  ctx.arc(p.size * 0.3, -p.size * 0.2, p.size * 0.35, 0, Math.PI * 2);
  ctx.arc(-p.size * 0.3, -p.size * 0.1, p.size * 0.3, 0, Math.PI * 2);
  ctx.arc(p.size * 0.1, p.size * 0.3, p.size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  if (p.type !== "burnt") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(-p.size * 0.1, -p.size * 0.2, p.size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden sparkle
  if (p.type === "golden") {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-p.size * 0.2, -p.size * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBucket(x: number, y: number): void {
  const bucketWidth = game.getBucketWidth();
  const bucketHeight = 50;

  // Bucket body (trapezoid shape)
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(x - bucketWidth / 2, y);
  ctx.lineTo(x - bucketWidth / 2 + 10, y + bucketHeight);
  ctx.lineTo(x + bucketWidth / 2 - 10, y + bucketHeight);
  ctx.lineTo(x + bucketWidth / 2, y);
  ctx.closePath();
  ctx.fill();

  // Bucket rim
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.ellipse(x, y, bucketWidth / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bucket inside
  ctx.fillStyle = "#1a0d08";
  ctx.beginPath();
  ctx.ellipse(x, y, bucketWidth / 2 - 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stripes
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 12, y + 5);
    ctx.lineTo(x + i * 10, y + bucketHeight - 5);
    ctx.stroke();
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  timeDisplay.textContent = state.timeLeft.toString();
  caughtDisplay.textContent = state.caught.toString();
  missedDisplay.textContent = state.missed.toString();
}

function showGameOverOverlay(score: number): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = score.toString();
  finalScoreDisplay.style.display = "block";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
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
