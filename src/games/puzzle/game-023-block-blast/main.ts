/**
 * Block Blast Main Entry
 * Game #023
 */
import { BlockBlastGame, type Shape } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const piecesContainer = document.getElementById("pieces-container")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const scoreDisplay = document.getElementById("score-display")!;
const highScoreDisplay = document.getElementById("high-score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;

let game: BlockBlastGame;

// Drag state
let dragItem: {
  id: number;
  shape: Shape;
  color: string;
  element: HTMLElement;
  offsetX: number;
  offsetY: number;
} | null = null;

let ghostElement: HTMLCanvasElement | null = null;

function initI18n() {
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

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new BlockBlastGame(canvas);

  // Initial resize
  game.resize();
  window.addEventListener("resize", () => game.resize());

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    highScoreDisplay.textContent = state.highScore.toString();

    renderPieces(state.shapes);

    if (state.status === "gameover") {
      showGameOver();
    }
  });

  // Global Drag Listeners
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onDragEnd);
}

function renderPieces(shapes: any[]) {
  piecesContainer.innerHTML = "";
  shapes.forEach((s: any) => {
    const container = document.createElement("div");
    container.className = "piece-container";

    const cvs = document.createElement("canvas");
    cvs.width = 80;
    cvs.height = 80;

    // Draw shape centered
    const ctx = cvs.getContext("2d")!;
    drawShape(ctx, s.shape, s.color, 80, 80);

    container.appendChild(cvs);
    piecesContainer.appendChild(container);

    // Drag Start
    const startDrag = (e: MouseEvent | TouchEvent) => {
      if (dragItem) return;
      e.preventDefault(); // Prevent scroll

      // Get client pos
      let clientX, clientY;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      // Create Ghost
      ghostElement = document.createElement("canvas");
      // Ghost size should match grid scale roughly?
      // Actually, visually matching the grid size on the board feels best.
      // game.tileSize
      const ts = game.tileSize;
      const wStr = s.shape[0].length * ts;
      const hStr = s.shape.length * ts;

      ghostElement.width = wStr;
      ghostElement.height = hStr;
      ghostElement.className = "dragging-ghost";
      const gCtx = ghostElement.getContext("2d")!;

      // Draw scaled shape
      drawShapeRaw(gCtx, s.shape, s.color, ts);

      document.body.appendChild(ghostElement);

      // Center Ghost on finger
      // Offset logic: we grabbed centering the piece container?
      // Usually dragging from center of piece.
      // Center of ghost should be at pointer.

      dragItem = {
        id: s.id,
        shape: s.shape,
        color: s.color,
        element: container,
        offsetX: wStr / 2,
        offsetY: hStr / 2,
      };

      // Hide original
      container.style.opacity = "0";

      updateGhost(clientX, clientY);
    };

    container.addEventListener("mousedown", startDrag);
    container.addEventListener("touchstart", startDrag, { passive: false });
  });
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  color: string,
  w: number,
  h: number
) {
  const rows = shape.length;
  const cols = shape[0].length;
  // Fit into W/H
  const size = Math.min(w / cols, h / rows) * 0.8;

  // Center it
  const startX = (w - cols * size) / 2;
  const startY = (h - rows * size) / 2;

  ctx.fillStyle = color;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape[r][c]) {
        ctx.fillRect(startX + c * size, startY + r * size, size - 1, size - 1);
      }
    }
  }
}

function drawShapeRaw(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  color: string,
  size: number
) {
  ctx.fillStyle = color;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (shape[r][c]) {
        ctx.fillRect(c * size, r * size, size - 1, size - 1);
        // Bevel
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(c * size, r * size, size - 1, size / 3);
        ctx.fillStyle = color;
      }
    }
  }
}

function updateGhost(x: number, y: number) {
  if (!ghostElement || !dragItem) return;
  const top = y - dragItem.offsetY; // Slightly up to see under finger? usually center is fine
  const left = x - dragItem.offsetX; // However, we are placing top-left of shape relative to finger?
  // Let's assume Finger is at Center of Shape.
  // If we want accurate placement, we need to map Finger -> Center Ghost -> TopLeft Ghost -> Grid Check.

  // Ghost Top-Left:
  const gx = x - dragItem.offsetX;
  const gy = y - dragItem.offsetY - 50; // Visual offset: Lift it up so finger doesn't cover

  ghostElement.style.top = `${gy}px`;
  ghostElement.style.left = `${gx}px`;
}

function onDragMove(e: MouseEvent) {
  if (!dragItem) return;
  updateGhost(e.clientX, e.clientY);
}

function onTouchMove(e: TouchEvent) {
  if (!dragItem) return;
  e.preventDefault();
  updateGhost(e.touches[0].clientX, e.touches[0].clientY);
}

function onDragEnd(e: MouseEvent | TouchEvent) {
  if (!dragItem) return;

  // Drop Check
  let clientX, clientY;
  if (e instanceof MouseEvent) {
    // MouseEvent doesn't carry final position in dragend reliably if outside?
    // use client coords
    clientX = e.clientX;
    clientY = e.clientY;
  } else {
    // TouchEnd change touches
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  }

  // Calculate Grid Pos
  const rect = canvas.getBoundingClientRect();

  // Ghost Top-Left (with same offset as in UpdateGhost)
  const gx = clientX - dragItem.offsetX;
  const gy = clientY - dragItem.offsetY - 50;

  // We want to map the Ghost Position to the Grid.
  // But visual offset (-50) makes it tricky. If user looks at where the ghost is, that's where they want to drop.
  // So we use ghost coordinates relative to canvas.
  const canvasX = gx - rect.left;
  const canvasY = gy - rect.top;

  const col = Math.round(canvasX / game.tileSize);
  const row = Math.round(canvasY / game.tileSize);

  // Check if valid
  const success = game.tryPlace(dragItem.id, col, row);

  // Cleanup
  if (ghostElement) {
    document.body.removeChild(ghostElement);
    ghostElement = null;
  }

  if (!success) {
    // Return animation? Or just reappear.
    dragItem.element.style.opacity = "1";
  }

  dragItem = null;
}

function showGameOver() {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${
    scoreDisplay.textContent
  }`;
  startBtn.textContent = i18n.t("game.reset");

  startBtn.onclick = () => {
    startGame();
  };
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.textContent = i18n.t("game.start");
  startBtn.onclick = startGame;
});

// Init
initI18n();
initGame();
