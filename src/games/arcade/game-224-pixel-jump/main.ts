/**
 * Pixel Jump Main Entry
 * Game #224
 */
import { PixelJumpGame, GameState, Platform, Player } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: PixelJumpGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;
let touchStartX = 0;

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

  game = new PixelJumpGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    if (e.key === "ArrowLeft" || e.key === "a") {
      game.moveLeft();
    } else if (e.key === "ArrowRight" || e.key === "d") {
      game.moveRight();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "a" || e.key === "d") {
      game.stopMoving();
    }
  });

  // Touch controls
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartX;

    if (diff > 10) {
      game.moveRight();
    } else if (diff < -10) {
      game.moveLeft();
    } else {
      game.stopMoving();
    }
  });

  canvas.addEventListener("touchend", () => {
    game.stopMoving();
  });

  window.addEventListener("resize", resizeCanvas);

  highscoreDisplay.textContent = game.getState().highScore.toString();

  startRenderLoop();
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 550;

  if (game) {
    game.setCanvasSize(canvas.width, canvas.height);
  }
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

  // Sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#87ceeb");
  skyGradient.addColorStop(1, "#e0f7fa");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw clouds (pixel style)
  ctx.fillStyle = "white";
  const cloudY = (100 - state.cameraY * 0.1) % height;
  drawPixelCloud(50, cloudY);
  drawPixelCloud(200, cloudY + 100);
  drawPixelCloud(300, cloudY + 200);

  // Draw platforms
  for (const platform of state.platforms) {
    drawPlatform(platform, state.cameraY);
  }

  // Draw player
  drawPlayer(state.player, state.cameraY);
}

function drawPixelCloud(x: number, y: number): void {
  const size = 8;
  ctx.fillRect(x, y, size * 4, size);
  ctx.fillRect(x + size, y - size, size * 2, size);
}

function drawPlatform(platform: Platform, cameraY: number): void {
  const y = platform.y - cameraY;

  if (y < -50 || y > canvas.height + 50) return;

  switch (platform.type) {
    case "normal":
      ctx.fillStyle = "#27ae60";
      break;
    case "moving":
      ctx.fillStyle = "#3498db";
      break;
    case "crumbling":
      ctx.fillStyle = platform.crumbleTimer !== undefined ? "#e74c3c" : "#f39c12";
      break;
    case "spring":
      ctx.fillStyle = "#e91e63";
      break;
  }

  // Pixel-style platform
  ctx.fillRect(platform.x, y, platform.width, 12);

  // Platform top highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(platform.x, y, platform.width, 4);

  // Spring visual
  if (platform.type === "spring") {
    ctx.fillStyle = "#ff4081";
    ctx.fillRect(platform.x + platform.width / 2 - 8, y - 8, 16, 8);
  }
}

function drawPlayer(player: Player, cameraY: number): void {
  const y = player.y - cameraY;

  // Body (pixel character)
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(player.x + 5, y + 10, 20, 15);

  // Head
  ctx.fillStyle = "#ffeaa7";
  ctx.fillRect(player.x + 8, y, 14, 12);

  // Eyes
  ctx.fillStyle = "#2c3e50";
  if (player.direction === 1) {
    ctx.fillRect(player.x + 16, y + 4, 4, 4);
  } else {
    ctx.fillRect(player.x + 10, y + 4, 4, 4);
  }

  // Legs
  ctx.fillStyle = "#3498db";
  ctx.fillRect(player.x + 8, y + 25, 6, 5);
  ctx.fillRect(player.x + 16, y + 25, 6, 5);
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
