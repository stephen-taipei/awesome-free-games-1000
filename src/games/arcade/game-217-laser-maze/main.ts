/**
 * Laser Maze Main Entry
 * Game #217
 */
import { LaserMazeGame, GameState, LaserLevel } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const targetsDisplay = document.getElementById("targets-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: LaserMazeGame;
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

  game = new LaserMazeGame();

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "levelComplete") {
      showLevelCompleteOverlay();
    }
  };

  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchend", handleTouch, { passive: false });

  window.addEventListener("resize", resizeCanvas);

  startRenderLoop();
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

function handleClick(e: MouseEvent): void {
  if (game.getState().phase !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const mirrorIndex = game.getMirrorAtPosition(x, y);
  if (mirrorIndex >= 0) {
    game.rotateMirror(mirrorIndex);
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase !== "playing") return;

  const touch = e.changedTouches[0];
  const { x, y } = getCanvasCoords(touch);
  const mirrorIndex = game.getMirrorAtPosition(x, y);
  if (mirrorIndex >= 0) {
    game.rotateMirror(mirrorIndex);
  }
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState(), game.getLevel());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState, level: LaserLevel | null): void {
  const { width, height } = canvas;

  // Background
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, width, height);

  // Grid
  const cellSize = game.getCellSize();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (!level) return;

  // Draw laser emitter
  ctx.fillStyle = "#ff0040";
  ctx.beginPath();
  ctx.moveTo(0, level.laserStart.y - 15);
  ctx.lineTo(25, level.laserStart.y);
  ctx.lineTo(0, level.laserStart.y + 15);
  ctx.closePath();
  ctx.fill();

  // Draw laser path with glow
  if (state.laserPath.length > 1) {
    // Glow effect
    ctx.strokeStyle = "rgba(255, 0, 64, 0.3)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(state.laserPath[0].x, state.laserPath[0].y);
    for (let i = 1; i < state.laserPath.length; i++) {
      ctx.lineTo(state.laserPath[i].x, state.laserPath[i].y);
    }
    ctx.stroke();

    // Main laser
    ctx.strokeStyle = "#ff0040";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(state.laserPath[0].x, state.laserPath[0].y);
    for (let i = 1; i < state.laserPath.length; i++) {
      ctx.lineTo(state.laserPath[i].x, state.laserPath[i].y);
    }
    ctx.stroke();

    // Core
    ctx.strokeStyle = "#ff6699";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(state.laserPath[0].x, state.laserPath[0].y);
    for (let i = 1; i < state.laserPath.length; i++) {
      ctx.lineTo(state.laserPath[i].x, state.laserPath[i].y);
    }
    ctx.stroke();
  }

  // Draw targets
  for (const target of level.targets) {
    const color = target.hit ? "#27ae60" : "#ffd700";

    // Outer glow
    const gradient = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, 25);
    gradient.addColorStop(0, target.hit ? "rgba(39, 174, 96, 0.5)" : "rgba(255, 215, 0, 0.5)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(target.x - 25, target.y - 25, 50, 50);

    // Target circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle
    ctx.fillStyle = target.hit ? "#2ecc71" : "#ffec8b";
    ctx.beginPath();
    ctx.arc(target.x, target.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Check mark if hit
    if (target.hit) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(target.x - 5, target.y);
      ctx.lineTo(target.x - 1, target.y + 4);
      ctx.lineTo(target.x + 6, target.y - 4);
      ctx.stroke();
    }
  }

  // Draw mirrors
  for (const mirror of level.mirrors) {
    ctx.save();
    ctx.translate(mirror.x, mirror.y);
    ctx.rotate((mirror.angle * Math.PI) / 180);

    // Mirror body
    ctx.fillStyle = "#4ecdc4";
    ctx.fillRect(-20, -3, 40, 6);

    // Mirror shine
    ctx.fillStyle = "#7fffd4";
    ctx.fillRect(-18, -2, 36, 2);

    // Mirror edges
    ctx.fillStyle = "#2a9d8f";
    ctx.fillRect(-22, -5, 4, 10);
    ctx.fillRect(18, -5, 4, 10);

    ctx.restore();
  }
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();
  targetsDisplay.textContent = `${state.targetsHit}/${state.totalTargets}`;
}

function showLevelCompleteOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.levelComplete");
  overlayMsg.textContent = `${i18n.t("game.moves")}: ${game.getState().moves}`;
  startBtn.textContent = i18n.t("game.nextLevel");
  startBtn.onclick = () => {
    overlay.style.display = "none";
    game.nextLevel();
    startBtn.onclick = startGame;
  };
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
