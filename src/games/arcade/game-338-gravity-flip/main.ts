/**
 * Gravity Flip Main Entry
 * Game #338
 */
import { GravityFlipGame, GameState, Obstacle, Coin } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: GravityFlipGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;
let bgOffset = 0;

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

  game = new GravityFlipGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  // Touch controls
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;
    game.flipGravity();
  });

  // Mouse controls
  canvas.addEventListener("mousedown", () => {
    if (game.getState().phase !== "playing") return;
    game.flipGravity();
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
      game.flipGravity();
    }
  });

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
    bgOffset = (bgOffset + game.getState().speed) % 100;
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

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2d3436");
  gradient.addColorStop(0.5, "#1a1a2e");
  gradient.addColorStop(1, "#2d3436");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = "rgba(108, 92, 231, 0.2)";
  ctx.lineWidth = 1;

  for (let x = -bgOffset; x < width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw obstacles
  for (const obs of state.obstacles) {
    drawObstacle(obs, height);
  }

  // Draw coins
  for (const coin of state.coins) {
    if (!coin.collected) {
      drawCoin(coin);
    }
  }

  // Draw player
  drawPlayer(state);

  // Draw gravity indicator
  drawGravityIndicator(state);
}

function drawObstacle(obs: Obstacle, height: number): void {
  // Top obstacle
  ctx.fillStyle = "#fd79a8";
  ctx.fillRect(obs.x, 0, 40, obs.topHeight);

  // Bottom obstacle
  ctx.fillRect(obs.x, height - obs.bottomHeight, 40, obs.bottomHeight);

  // Glow effect
  ctx.shadowColor = "#fd79a8";
  ctx.shadowBlur = 10;
  ctx.fillRect(obs.x, 0, 40, obs.topHeight);
  ctx.fillRect(obs.x, height - obs.bottomHeight, 40, obs.bottomHeight);
  ctx.shadowBlur = 0;
}

function drawCoin(coin: Coin): void {
  ctx.fillStyle = "#fdcb6e";
  ctx.shadowColor = "#fdcb6e";
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Inner circle
  ctx.fillStyle = "#e17055";
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(state: GameState): void {
  const { player } = state;

  // Trail
  ctx.fillStyle = "rgba(0, 206, 201, 0.3)";
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(
      player.x + player.width / 2 - i * 8,
      player.y + player.height / 2 + player.vy * i * 0.5,
      player.width / 2 - i * 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Player body
  ctx.fillStyle = "#00cec9";
  ctx.shadowColor = "#00cec9";
  ctx.shadowBlur = 15;

  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

  // Rotate based on velocity
  const angle = player.vy * 0.05;
  ctx.rotate(angle);

  // Draw diamond shape
  ctx.beginPath();
  ctx.moveTo(0, -player.height / 2);
  ctx.lineTo(player.width / 2, 0);
  ctx.lineTo(0, player.height / 2);
  ctx.lineTo(-player.width / 2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawGravityIndicator(state: GameState): void {
  const { player } = state;
  const arrowY = player.gravityDirection === 1 ? 30 : canvas.height - 30;
  const arrowDir = player.gravityDirection === 1 ? 1 : -1;

  ctx.fillStyle = "rgba(108, 92, 231, 0.8)";
  ctx.beginPath();
  ctx.moveTo(20, arrowY - 10 * arrowDir);
  ctx.lineTo(30, arrowY + 10 * arrowDir);
  ctx.lineTo(25, arrowY + 10 * arrowDir);
  ctx.lineTo(25, arrowY + 20 * arrowDir);
  ctx.lineTo(15, arrowY + 20 * arrowDir);
  ctx.lineTo(15, arrowY + 10 * arrowDir);
  ctx.lineTo(10, arrowY + 10 * arrowDir);
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  coinsDisplay.textContent = state.coinsCollected.toString();
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
  bgOffset = 0;
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
