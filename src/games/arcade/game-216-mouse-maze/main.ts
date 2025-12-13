/**
 * Mouse Maze Main Entry
 * Game #216
 */
import { MouseMazeGame, GameState, MazeLevel } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const timeDisplay = document.getElementById("time-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const gameArea = document.querySelector(".game-area") as HTMLElement;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: MouseMazeGame;
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

  game = new MouseMazeGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "hitWall") {
      gameArea.classList.add("hit-wall");
      setTimeout(() => gameArea.classList.remove("hit-wall"), 300);
    }

    if (state.phase === "levelComplete") {
      gameArea.classList.add("level-complete");
      setTimeout(() => gameArea.classList.remove("level-complete"), 500);
      showLevelCompleteOverlay();
    }

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

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

function handleMouseMove(e: MouseEvent): void {
  if (game.getState().phase !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  game.updateMousePosition(x, y);
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase !== "playing") return;

  const touch = e.touches[0];
  const { x, y } = getCanvasCoords(touch);
  game.updateMousePosition(x, y);
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState(), game.getMaze());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState, maze: MazeLevel | null): void {
  const { width, height } = canvas;

  // Background
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, width, height);

  if (!maze) return;

  // Draw walls
  ctx.fillStyle = "#e74c3c";
  for (const wall of maze.walls) {
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
  }

  // Draw start zone
  ctx.fillStyle = "#27ae60";
  ctx.beginPath();
  ctx.arc(maze.start.x, maze.start.y, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("START", maze.start.x, maze.start.y);

  // Draw goal zone
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(maze.goal.x, maze.goal.y, game.getGoalRadius(), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#16213e";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("GOAL", maze.goal.x, maze.goal.y);

  // Draw cursor trail effect
  if (state.phase === "playing" && state.started) {
    const gradient = ctx.createRadialGradient(
      state.mouseX, state.mouseY, 0,
      state.mouseX, state.mouseY, 20
    );
    gradient.addColorStop(0, "rgba(52, 152, 219, 0.3)");
    gradient.addColorStop(1, "rgba(52, 152, 219, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(state.mouseX - 20, state.mouseY - 20, 40, 40);
  }

  // Draw cursor
  const cursorColor = state.phase === "hitWall" ? "#e74c3c" : "#3498db";
  ctx.fillStyle = cursorColor;
  ctx.beginPath();
  ctx.arc(state.mouseX, state.mouseY, game.getCursorRadius(), 0, Math.PI * 2);
  ctx.fill();

  // Cursor glow
  ctx.strokeStyle = cursorColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(state.mouseX, state.mouseY, game.getCursorRadius() + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Instructions when not started
  if (state.phase === "playing" && !state.started) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(i18n.t("game.reachGoal"), width / 2, 30);
  }
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  livesDisplay.textContent = state.lives.toString();
  timeDisplay.textContent = `${state.time}s`;
}

function showLevelCompleteOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.levelComplete");
  overlayMsg.textContent = "";
  startBtn.textContent = i18n.t("game.nextLevel");
  startBtn.onclick = () => {
    overlay.style.display = "none";
    game.nextLevel();
    startBtn.onclick = startGame;
  };
}

function showGameOverOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `${i18n.t("game.level")}: ${state.level} | ${i18n.t("game.time")}: ${state.time}s`;
  startBtn.textContent = i18n.t("game.restart");
  startBtn.onclick = startGame;
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
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Initialize
initI18n();
initGame();
