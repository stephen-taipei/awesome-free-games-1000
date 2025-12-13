/**
 * Brick Stacker Main Entry
 * Game #219
 */
import { BrickStackerGame, GameState, Brick } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const perfectText = document.getElementById("perfect-text")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: BrickStackerGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;
let lastPerfectStreak = 0;

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

  game = new BrickStackerGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    // Show perfect text
    if (state.perfectStreak > lastPerfectStreak) {
      showPerfectText();
    }
    lastPerfectStreak = state.perfectStreak;

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchstart", handleTouch, { passive: false });

  window.addEventListener("resize", resizeCanvas);

  highscoreDisplay.textContent = game.getState().highScore.toString();

  startRenderLoop();
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 500;

  if (game) {
    game.setCanvasSize(canvas.width, canvas.height);
  }
}

function handleClick(): void {
  if (game.getState().phase === "playing") {
    game.placeBrick();
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase === "playing") {
    game.placeBrick();
  }
}

function showPerfectText(): void {
  perfectText.style.display = "block";
  perfectText.textContent = i18n.t("game.perfect");
  setTimeout(() => {
    perfectText.style.display = "none";
  }, 500);
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function startGameLoop(): void {
  gameLoop = window.setInterval(() => {
    game.update();
  }, 1000 / 60);
}

function stopGameLoop(): void {
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Sky gradient background
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#87ceeb");
  skyGradient.addColorStop(1, "#e0f7fa");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  drawCloud(50, 50);
  drawCloud(200, 80);
  drawCloud(300, 30);

  const cameraOffset = game.getCameraOffset();

  // Draw placed bricks
  for (const brick of state.placedBricks) {
    drawBrick(brick, cameraOffset);
  }

  // Draw current moving brick
  if (state.currentBrick) {
    drawBrick(state.currentBrick, cameraOffset);
  }

  // Draw ground
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(0, height - 50 + cameraOffset, width, 50);

  // Ground grass
  ctx.fillStyle = "#27ae60";
  ctx.fillRect(0, height - 50 + cameraOffset, width, 10);
}

function drawCloud(x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.arc(x + 25, y - 10, 25, 0, Math.PI * 2);
  ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
  ctx.arc(x + 25, y + 10, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawBrick(brick: Brick, cameraOffset: number): void {
  const y = brick.y + cameraOffset;

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fillRect(brick.x + 3, y + 3, brick.width, brick.height);

  // Main brick
  ctx.fillStyle = brick.color;
  ctx.fillRect(brick.x, y, brick.width, brick.height);

  // Highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(brick.x, y, brick.width, 5);

  // Border
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(brick.x, y, brick.width, brick.height);
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  highscoreDisplay.textContent = state.highScore.toString();
}

function showGameOverOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = "";
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  lastPerfectStreak = 0;
  game.start();
  startGameLoop();
}

// Event listeners
startBtn.addEventListener("click", startGame);

// Cleanup
window.addEventListener("beforeunload", () => {
  game?.destroy();
  stopGameLoop();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Initialize
initI18n();
initGame();
