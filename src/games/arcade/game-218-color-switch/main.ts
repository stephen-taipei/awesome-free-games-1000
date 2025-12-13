/**
 * Color Switch Main Entry
 * Game #218
 */
import { ColorSwitchGame, GameState } from "./game";
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

let game: ColorSwitchGame;
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

  game = new ColorSwitchGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchstart", handleTouch, { passive: false });

  window.addEventListener("resize", resizeCanvas);

  // Update high score display
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
    game.jump();
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase === "playing") {
    game.jump();
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
  const centerX = width / 2;

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  if (state.phase === "idle") {
    // Draw idle state
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.tapToJump"), centerX, height / 2);
    return;
  }

  const offsetY = state.cameraY;

  // Draw color switchers
  for (const switcher of state.colorSwitchers) {
    const y = switcher.y - offsetY;
    if (y < -50 || y > height + 50) continue;

    drawColorSwitcher(centerX, y);
  }

  // Draw stars
  for (const star of state.stars) {
    if (star.collected) continue;
    const y = star.y - offsetY;
    if (y < -50 || y > height + 50) continue;

    drawStar(centerX, y);
  }

  // Draw obstacles
  for (const obstacle of state.obstacles) {
    const y = obstacle.y - offsetY;
    if (y < -100 || y > height + 100) continue;

    drawObstacle(centerX, y, obstacle);
  }

  // Draw ball
  const ballY = state.ball.y - offsetY;
  ctx.fillStyle = state.ball.color;
  ctx.beginPath();
  ctx.arc(state.ball.x, ballY, 12, 0, Math.PI * 2);
  ctx.fill();

  // Ball glow
  const gradient = ctx.createRadialGradient(state.ball.x, ballY, 0, state.ball.x, ballY, 20);
  gradient.addColorStop(0, state.ball.color + "80");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(state.ball.x - 20, ballY - 20, 40, 40);
}

function drawColorSwitcher(x: number, y: number): void {
  const colors = game.getColors();
  const size = 12;

  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(x, y, size, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawStar(x: number, y: number): void {
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();

  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const radius = i === 0 ? 15 : 15;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);

    const innerAngle = angle + (2 * Math.PI) / 10;
    const innerPx = x + Math.cos(innerAngle) * 7;
    const innerPy = y + Math.sin(innerAngle) * 7;
    ctx.lineTo(innerPx, innerPy);
  }

  ctx.closePath();
  ctx.fill();
}

function drawObstacle(
  centerX: number,
  y: number,
  obstacle: { type: string; rotation: number; colors: string[] }
): void {
  const colors = obstacle.colors;

  ctx.save();
  ctx.translate(centerX, y);
  ctx.rotate(obstacle.rotation);

  if (obstacle.type === "ring") {
    const radius = 60;
    const thickness = 15;

    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.arc(0, 0, radius, (i * Math.PI) / 2, ((i + 1) * Math.PI) / 2);
      ctx.stroke();
    }
  } else if (obstacle.type === "bar") {
    const barWidth = 120;
    const barHeight = 20;

    // Left half
    ctx.fillStyle = colors[0];
    ctx.fillRect(-barWidth / 2, -barHeight / 2, barWidth / 2, barHeight);

    // Right half
    ctx.fillStyle = colors[2];
    ctx.fillRect(0, -barHeight / 2, barWidth / 2, barHeight);
  } else if (obstacle.type === "triangle") {
    const size = 80;

    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 15;
      ctx.beginPath();

      const startAngle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
      const endAngle = ((i + 1) * 2 * Math.PI) / 3 - Math.PI / 2;

      const x1 = Math.cos(startAngle) * size;
      const y1 = Math.sin(startAngle) * size;
      const x2 = Math.cos(endAngle) * size;
      const y2 = Math.sin(endAngle) * size;

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  ctx.restore();
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
