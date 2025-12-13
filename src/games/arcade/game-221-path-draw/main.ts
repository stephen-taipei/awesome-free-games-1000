/**
 * Path Draw Main Entry
 * Game #221
 */
import { PathDrawGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const scoreDisplay = document.getElementById("score-display")!;
const inkDisplay = document.getElementById("ink-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: PathDrawGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;
let isDrawing = false;

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

  game = new PathDrawGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "success") {
      showResultOverlay(true);
    } else if (state.phase === "failed") {
      showResultOverlay(false);
    }

    playBtn.style.display = state.phase === "drawing" ? "block" : "none";
  };

  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd);

  playBtn.addEventListener("click", () => {
    game.startSimulation();
    startGameLoop();
  });

  window.addEventListener("resize", resizeCanvas);

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

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function handleMouseDown(e: MouseEvent): void {
  if (game.getState().phase !== "drawing") return;
  isDrawing = true;
  const { x, y } = getCanvasCoords(e);
  game.addPathPoint(x, y);
}

function handleMouseMove(e: MouseEvent): void {
  if (!isDrawing || game.getState().phase !== "drawing") return;
  const { x, y } = getCanvasCoords(e);
  game.addPathPoint(x, y);
}

function handleMouseUp(): void {
  isDrawing = false;
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase !== "drawing") return;
  isDrawing = true;
  const { x, y } = getCanvasCoords(e.touches[0]);
  game.addPathPoint(x, y);
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (!isDrawing || game.getState().phase !== "drawing") return;
  const { x, y } = getCanvasCoords(e.touches[0]);
  game.addPathPoint(x, y);
}

function handleTouchEnd(): void {
  isDrawing = false;
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

  // Paper-like background
  ctx.fillStyle = "#fffef0";
  ctx.fillRect(0, 0, width, height);

  // Grid pattern
  ctx.strokeStyle = "rgba(200, 200, 180, 0.3)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (!state.currentLevel) return;

  // Draw obstacles
  ctx.fillStyle = "#7f8c8d";
  for (const obs of state.currentLevel.obstacles) {
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  }

  // Draw goal
  ctx.fillStyle = "#27ae60";
  ctx.beginPath();
  ctx.arc(state.currentLevel.goal.x, state.currentLevel.goal.y, game.getGoalRadius(), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GOAL", state.currentLevel.goal.x, state.currentLevel.goal.y);

  // Draw stars
  ctx.fillStyle = "#f1c40f";
  for (const star of state.currentLevel.stars) {
    drawStar(star.x, star.y, 15);
  }

  // Draw path
  if (state.path.length > 1) {
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(state.path[0].x, state.path[0].y);
    for (let i = 1; i < state.path.length; i++) {
      ctx.lineTo(state.path[i].x, state.path[i].y);
    }
    ctx.stroke();
  }

  // Draw start point
  ctx.fillStyle = "#3498db";
  ctx.beginPath();
  ctx.arc(state.currentLevel.start.x, state.currentLevel.start.y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText("START", state.currentLevel.start.x, state.currentLevel.start.y);

  // Draw ball
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // Ball shine
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.arc(state.ball.x - 4, state.ball.y - 4, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(x: number, y: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);

    const innerAngle = angle + (2 * Math.PI) / 10;
    const innerPx = x + Math.cos(innerAngle) * (size * 0.5);
    const innerPy = y + Math.sin(innerAngle) * (size * 0.5);
    ctx.lineTo(innerPx, innerPy);
  }
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  scoreDisplay.textContent = state.score.toString();
  const inkPercent = Math.round((state.inkRemaining / game.getMaxInk()) * 100);
  inkDisplay.textContent = `${inkPercent}%`;
}

function showResultOverlay(success: boolean): void {
  stopGameLoop();
  overlay.style.display = "flex";
  overlayTitle.textContent = success ? i18n.t("game.success") : i18n.t("game.failed");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${game.getState().score}`;

  // Create buttons
  const content = overlay.querySelector(".overlay-content")!;
  const existingBtns = content.querySelectorAll(".btn");
  existingBtns.forEach((btn) => {
    if (btn.id !== "start-btn") btn.remove();
  });

  if (success) {
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
  } else {
    startBtn.textContent = i18n.t("game.retry");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.retry();
    };
  }
}

function startGame(): void {
  overlay.style.display = "none";
  game.start();
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
