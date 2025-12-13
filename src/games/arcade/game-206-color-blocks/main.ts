/**
 * Color Blocks Main Entry
 * Game #206
 */
import { ColorBlocksGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const levelDisplay = document.getElementById("level-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: ColorBlocksGame;
let blockSize = 40;
let gridOffsetX = 0;
let gridOffsetY = 0;

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

  game = new ColorBlocksGame();

  game.onStateChange = (state: GameState) => {
    render(state);
    updateUI(state);

    if (state.status === "gameOver") {
      showGameOverOverlay(state.score);
    }
  };

  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchend", handleTouch, { passive: false });

  window.addEventListener("resize", () => {
    resizeCanvas();
    render(game.getState());
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 480;

  const gridSize = game?.getGridSize() || { width: 10, height: 12 };
  blockSize = Math.min(
    Math.floor((canvas.width - 20) / gridSize.width),
    Math.floor((canvas.height - 20) / gridSize.height)
  );
  gridOffsetX = (canvas.width - blockSize * gridSize.width) / 2;
  gridOffsetY = (canvas.height - blockSize * gridSize.height) / 2;
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getGridPosition(canvasX: number, canvasY: number): { x: number; y: number } | null {
  const gridSize = game.getGridSize();
  const x = Math.floor((canvasX - gridOffsetX) / blockSize);
  const y = Math.floor((canvasY - gridOffsetY) / blockSize);

  if (x >= 0 && x < gridSize.width && y >= 0 && y < gridSize.height) {
    return { x, y };
  }
  return null;
}

function handleClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const gridPos = getGridPosition(x, y);

  if (gridPos) {
    game.clickBlock(gridPos.x, gridPos.y);
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.changedTouches[0];
  const { x, y } = getCanvasCoords(touch);
  const gridPos = getGridPosition(x, y);

  if (gridPos) {
    game.clickBlock(gridPos.x, gridPos.y);
  }
}

function render(state: GameState): void {
  const { width, height } = canvas;

  // Clear
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, width, height);

  const gridSize = game.getGridSize();
  const selectedSet = new Set(state.selectedBlocks.map((b) => `${b.x},${b.y}`));

  // Draw blocks
  for (let y = 0; y < gridSize.height; y++) {
    for (let x = 0; x < gridSize.width; x++) {
      const block = state.grid[y][x];
      if (!block.color) continue;

      const bx = gridOffsetX + x * blockSize;
      const by = gridOffsetY + y * blockSize;
      const isSelected = selectedSet.has(`${x},${y}`);
      const padding = 2;

      // Block background
      ctx.fillStyle = game.getColorHex(block.color);

      if (isSelected) {
        // Pulsing effect for selected blocks
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
      }

      // Draw rounded rectangle
      const radius = 6;
      ctx.beginPath();
      ctx.roundRect(bx + padding, by + padding, blockSize - padding * 2, blockSize - padding * 2, radius);
      ctx.fill();

      // Highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.roundRect(bx + padding, by + padding, blockSize - padding * 2, (blockSize - padding * 2) * 0.3, [radius, radius, 0, 0]);
      ctx.fill();

      ctx.globalAlpha = 1;
    }
  }

  // Draw grid lines (subtle)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= gridSize.width; x++) {
    ctx.beginPath();
    ctx.moveTo(gridOffsetX + x * blockSize, gridOffsetY);
    ctx.lineTo(gridOffsetX + x * blockSize, gridOffsetY + gridSize.height * blockSize);
    ctx.stroke();
  }
  for (let y = 0; y <= gridSize.height; y++) {
    ctx.beginPath();
    ctx.moveTo(gridOffsetX, gridOffsetY + y * blockSize);
    ctx.lineTo(gridOffsetX + gridSize.width * blockSize, gridOffsetY + y * blockSize);
    ctx.stroke();
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  timeDisplay.textContent = state.timeLeft.toString();
  comboDisplay.textContent = state.combo > 0 ? `x${state.combo}` : "-";
  levelDisplay.textContent = state.level.toString();
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

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  game?.destroy();
});

// Initialize
initI18n();
initGame();
