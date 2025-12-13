/**
 * Pyramid Puzzle Main Entry
 * Game #105
 */
import { PyramidGame, GameState, Triangle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const targetColorBox = document.getElementById("target-color")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: PyramidGame;
let trianglePositions: { row: number; col: number; points: [number, number][] }[] = [];

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

  game = new PyramidGame();

  game.onStateChange = (state: GameState) => {
    render(state);
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
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 400;
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function pointInTriangle(
  px: number,
  py: number,
  points: [number, number][]
): boolean {
  const [p0, p1, p2] = points;

  const area = 0.5 * (-p1[1] * p2[0] + p0[1] * (-p1[0] + p2[0]) + p0[0] * (p1[1] - p2[1]) + p1[0] * p2[1]);
  const sign = area < 0 ? -1 : 1;

  const s = (p0[1] * p2[0] - p0[0] * p2[1] + (p2[1] - p0[1]) * px + (p0[0] - p2[0]) * py) * sign;
  const t = (p0[0] * p1[1] - p0[1] * p1[0] + (p0[1] - p1[1]) * px + (p1[0] - p0[0]) * py) * sign;

  return s > 0 && t > 0 && s + t < 2 * area * sign;
}

function findTriangleAt(x: number, y: number): { row: number; col: number } | null {
  for (const tri of trianglePositions) {
    if (pointInTriangle(x, y, tri.points)) {
      return { row: tri.row, col: tri.col };
    }
  }
  return null;
}

function handleClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const triangle = findTriangleAt(x, y);

  if (triangle) {
    game.clickTriangle(triangle.row, triangle.col);
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.changedTouches[0];
  const { x, y } = getCanvasCoords(touch);
  const triangle = findTriangleAt(x, y);

  if (triangle) {
    game.clickTriangle(triangle.row, triangle.col);
  }
}

function render(state: GameState): void {
  const { width, height } = canvas;
  trianglePositions = [];

  // Clear
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, width, height);

  // Draw desert/sand background at bottom
  const sandGradient = ctx.createLinearGradient(0, height - 80, 0, height);
  sandGradient.addColorStop(0, "#c9a86c");
  sandGradient.addColorStop(1, "#a67c52");
  ctx.fillStyle = sandGradient;
  ctx.fillRect(0, height - 80, width, 80);

  // Calculate pyramid dimensions
  const rows = state.rows;
  const pyramidHeight = Math.min(height - 120, 300);
  const triangleHeight = pyramidHeight / rows;
  const baseWidth = triangleHeight * 1.15; // Equilateral-ish triangle
  const pyramidWidth = baseWidth * rows;

  const startX = (width - pyramidWidth) / 2;
  const startY = height - 100;

  // Draw pyramid triangles
  for (let row = 0; row < rows; row++) {
    const trianglesInRow = row * 2 + 1;
    const rowWidth = baseWidth * (row + 1);
    const rowStartX = startX + (pyramidWidth - rowWidth) / 2;
    const rowY = startY - triangleHeight * row;

    for (let col = 0; col < trianglesInRow; col++) {
      const triangle = state.triangles[row][col];
      const pointUp = col % 2 === 0;

      let points: [number, number][];
      const triX = rowStartX + (col * baseWidth) / 2;

      if (pointUp) {
        // Pointing up triangle
        points = [
          [triX + baseWidth / 2, rowY - triangleHeight],
          [triX, rowY],
          [triX + baseWidth, rowY],
        ];
      } else {
        // Pointing down triangle
        points = [
          [triX, rowY - triangleHeight],
          [triX + baseWidth, rowY - triangleHeight],
          [triX + baseWidth / 2, rowY],
        ];
      }

      // Store for hit detection
      trianglePositions.push({ row, col, points });

      // Draw triangle
      const color = game.getColor(triangle.color);

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      ctx.lineTo(points[1][0], points[1][1]);
      ctx.lineTo(points[2][0], points[2][1]);
      ctx.closePath();

      // Fill with gradient
      const centerY = (points[0][1] + points[1][1] + points[2][1]) / 3;
      const gradient = ctx.createLinearGradient(0, centerY - triangleHeight / 2, 0, centerY + triangleHeight / 2);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColor(color, -30));
      ctx.fillStyle = gradient;
      ctx.fill();

      // Border
      ctx.strokeStyle = "#2c2c4e";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Highlight
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      ctx.lineTo(points[1][0], points[1][1]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw decorative elements (stars)
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  for (let i = 0; i < 20; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * (height - 150);
    const size = Math.random() * 2 + 1;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw moon
  ctx.beginPath();
  ctx.arc(width - 60, 50, 25, 0, Math.PI * 2);
  ctx.fillStyle = "#f4f1de";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width - 50, 45, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#16213e";
  ctx.fill();
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();
  targetColorBox.style.backgroundColor = game.getColor(state.targetColor);
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

// Initialize
initI18n();
initGame();
