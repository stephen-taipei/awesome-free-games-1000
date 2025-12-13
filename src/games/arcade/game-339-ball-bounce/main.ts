/**
 * Ball Bounce Main Entry
 * Game #339
 */
import { BallBounceGame, GameState, Platform } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const bouncesDisplay = document.getElementById("bounces-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: BallBounceGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;

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

  game = new BallBounceGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  // Touch controls
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    game.moveBall(touchX);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    game.moveBall(touchX);
  });

  // Mouse controls
  canvas.addEventListener("mousemove", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    game.moveBall(mouseX);
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    const state = game.getState();
    if (e.key === "ArrowLeft") {
      game.moveBall(state.ball.x - 30);
    } else if (e.key === "ArrowRight") {
      game.moveBall(state.ball.x + 30);
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

  // Background gradient based on height
  const hue = (state.score / 10) % 360;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `hsl(${220 + hue * 0.1}, 70%, 20%)`);
  gradient.addColorStop(1, `hsl(${220 + hue * 0.1}, 80%, 10%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw stars
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  for (let i = 0; i < 30; i++) {
    const x = ((i * 137) % width);
    const y = ((i * 89 + state.cameraY * 0.1) % height);
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw platforms
  for (const platform of state.platforms) {
    const screenY = platform.y - state.cameraY;
    if (screenY > -20 && screenY < height + 20) {
      drawPlatform(platform, screenY);
    }
  }

  // Draw ball
  drawBall(state);
}

function drawPlatform(platform: Platform, screenY: number): void {
  if (platform.broken) return;

  let color: string;
  switch (platform.type) {
    case "boost":
      color = "#f7b731";
      break;
    case "fragile":
      color = "#a55eea";
      break;
    case "moving":
      color = "#45aaf2";
      break;
    default:
      color = "#26de81";
  }

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.roundRect(platform.x, screenY, platform.width, 12, 6);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Platform decoration
  if (platform.type === "boost") {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("^", platform.x + platform.width / 2, screenY + 10);
  } else if (platform.type === "fragile") {
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(platform.x + 2, screenY + 2, platform.width - 4, 8);
    ctx.setLineDash([]);
  }
}

function drawBall(state: GameState): void {
  const { ball } = state;

  // Trail
  ctx.fillStyle = "rgba(255, 107, 107, 0.3)";
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y + ball.vy * i * 0.5, ball.radius - i * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ball
  ctx.fillStyle = "#ff6b6b";
  ctx.shadowColor = "#ff6b6b";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Shine
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.arc(ball.x - 4, ball.y - 4, 5, 0, Math.PI * 2);
  ctx.fill();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  bouncesDisplay.textContent = state.ball.bounceCount.toString();
  highscoreDisplay.textContent = state.highScore.toString();
}

function showGameOverOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `${i18n.t("game.bounces")}: ${state.ball.bounceCount}`;
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
