/**
 * Totem Puzzle Main Entry
 * Game #104
 */
import { TotemGame, GameState, TotemBlock, TotemColor } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const targetCanvas = document.getElementById("target-canvas") as HTMLCanvasElement;
const targetCtx = targetCanvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const undoBtn = document.getElementById("undo-btn")!;

let game: TotemGame;

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

  game = new TotemGame();

  game.onStateChange = (state: GameState) => {
    render(state);
    renderTarget(state);
    updateUI(state);

    if (state.status === "won") {
      setTimeout(() => showWinOverlay(), 500);
    }
  };

  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchend", handleTouch, { passive: false });

  window.addEventListener("resize", () => {
    resizeCanvas();
    render(game.getState());
    renderTarget(game.getState());
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 400;

  const targetContainer = targetCanvas.parentElement!;
  const targetRect = targetContainer.getBoundingClientRect();
  targetCanvas.width = targetRect.width - 24; // padding
  targetCanvas.height = 120;
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getPoleAtPosition(x: number, state: GameState): number {
  const poleCount = state.poles.length;
  const poleSpacing = canvas.width / (poleCount + 1);

  for (let i = 0; i < poleCount; i++) {
    const poleX = poleSpacing * (i + 1);
    if (Math.abs(x - poleX) < poleSpacing * 0.4) {
      return i;
    }
  }
  return -1;
}

function handleClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x } = getCanvasCoords(e);
  const poleIndex = getPoleAtPosition(x, game.getState());

  if (poleIndex >= 0) {
    game.selectPole(poleIndex);
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.changedTouches[0];
  const { x } = getCanvasCoords(touch);
  const poleIndex = getPoleAtPosition(x, game.getState());

  if (poleIndex >= 0) {
    game.selectPole(poleIndex);
  }
}

function drawTotemBlock(
  context: CanvasRenderingContext2D,
  block: TotemBlock,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number = 1
): void {
  const color = game.getTotemColor(block.color);
  const cornerRadius = 6 * scale;

  // Main block
  context.beginPath();
  context.roundRect(x - width / 2, y - height, width, height, cornerRadius);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = "rgba(0, 0, 0, 0.3)";
  context.lineWidth = 2 * scale;
  context.stroke();

  // Highlight
  context.beginPath();
  context.roundRect(x - width / 2 + 4 * scale, y - height + 4 * scale, width - 8 * scale, height * 0.3, cornerRadius / 2);
  context.fillStyle = "rgba(255, 255, 255, 0.3)";
  context.fill();

  // Pattern
  drawPattern(context, block.pattern, x, y - height / 2, width * 0.6, height * 0.4, scale);
}

function drawPattern(
  context: CanvasRenderingContext2D,
  pattern: number,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
): void {
  context.fillStyle = "rgba(0, 0, 0, 0.4)";
  context.strokeStyle = "rgba(255, 255, 255, 0.5)";
  context.lineWidth = 2 * scale;

  const size = Math.min(width, height) * 0.4;

  switch (pattern) {
    case 0: // Circle
      context.beginPath();
      context.arc(x, y, size / 2, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      break;
    case 1: // Triangle
      context.beginPath();
      context.moveTo(x, y - size / 2);
      context.lineTo(x + size / 2, y + size / 2);
      context.lineTo(x - size / 2, y + size / 2);
      context.closePath();
      context.fill();
      context.stroke();
      break;
    case 2: // Square
      context.beginPath();
      context.rect(x - size / 2, y - size / 2, size, size);
      context.fill();
      context.stroke();
      break;
    case 3: // Diamond
      context.beginPath();
      context.moveTo(x, y - size / 2);
      context.lineTo(x + size / 2, y);
      context.lineTo(x, y + size / 2);
      context.lineTo(x - size / 2, y);
      context.closePath();
      context.fill();
      context.stroke();
      break;
  }
}

function render(state: GameState): void {
  const { width, height } = canvas;

  // Clear
  ctx.fillStyle = "#3d2415";
  ctx.fillRect(0, 0, width, height);

  // Draw ground
  const groundY = height - 40;
  ctx.fillStyle = "#654321";
  ctx.fillRect(0, groundY, width, 40);

  // Ground highlight
  ctx.fillStyle = "#7a5533";
  ctx.fillRect(0, groundY, width, 5);

  const poleCount = state.poles.length;
  const poleSpacing = width / (poleCount + 1);
  const poleWidth = 20;
  const poleHeight = 250;
  const blockWidth = 70;
  const blockHeight = 45;

  // Draw poles
  for (let i = 0; i < poleCount; i++) {
    const poleX = poleSpacing * (i + 1);
    const poleBaseY = groundY;

    // Pole shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(poleX, poleBaseY + 5, 50, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pole base
    ctx.fillStyle = "#5d2e0c";
    ctx.beginPath();
    ctx.ellipse(poleX, poleBaseY, 45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pole
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(poleX - poleWidth / 2, poleBaseY - poleHeight, poleWidth, poleHeight);

    // Pole highlight
    ctx.fillStyle = "#a0522d";
    ctx.fillRect(poleX - poleWidth / 2, poleBaseY - poleHeight, poleWidth * 0.3, poleHeight);

    // Pole top
    ctx.fillStyle = "#6b3811";
    ctx.beginPath();
    ctx.arc(poleX, poleBaseY - poleHeight, poleWidth / 2 + 3, 0, Math.PI * 2);
    ctx.fill();

    // Selected pole glow
    if (state.selectedPole === i) {
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(poleX - blockWidth / 2 - 10, poleBaseY - poleHeight - 20, blockWidth + 20, poleHeight + 30, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw blocks on this pole
    const pole = state.poles[i];
    for (let j = 0; j < pole.length; j++) {
      const block = pole[j];
      const blockY = poleBaseY - (j + 1) * blockHeight;
      drawTotemBlock(ctx, block, poleX, blockY + blockHeight, blockWidth, blockHeight);
    }
  }
}

function renderTarget(state: GameState): void {
  const { width, height } = targetCanvas;

  // Clear
  targetCtx.fillStyle = "#2c1810";
  targetCtx.fillRect(0, 0, width, height);

  const poleCount = state.target.length;
  const poleSpacing = width / (poleCount + 1);
  const scale = 0.5;
  const poleWidth = 12;
  const blockWidth = 50;
  const blockHeight = 30;
  const groundY = height - 15;

  for (let i = 0; i < poleCount; i++) {
    const poleX = poleSpacing * (i + 1);

    // Mini pole
    targetCtx.fillStyle = "#8b4513";
    targetCtx.fillRect(poleX - poleWidth / 2, 10, poleWidth, groundY - 10);

    // Ground
    targetCtx.fillStyle = "#654321";
    targetCtx.fillRect(poleX - 35, groundY, 70, 15);

    // Draw target blocks
    const pole = state.target[i];
    for (let j = 0; j < pole.length; j++) {
      const block = pole[j];
      const blockY = groundY - (j + 1) * blockHeight;
      drawTotemBlock(targetCtx, block, poleX, blockY + blockHeight, blockWidth, blockHeight, scale);
    }
  }
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.level")} ${state.level} - ${state.moves} ${i18n.t("game.moves")}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
  }
}

function startGame(level: number = 1): void {
  overlay.style.display = "none";
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => game.reset());
undoBtn.addEventListener("click", () => game.undo());

// Initialize
initI18n();
initGame();
