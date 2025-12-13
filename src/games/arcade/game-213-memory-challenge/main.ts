/**
 * Memory Challenge Main Entry
 * Game #213
 */
import { MemoryChallengeGame, GameState, ButtonColor } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const levelDisplay = document.getElementById("level-display")!;
const sequenceDisplay = document.getElementById("sequence-display")!;
const statusDisplay = document.getElementById("status-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: MemoryChallengeGame;
let animationFrame: number | null = null;

const BUTTON_POSITIONS: Record<ButtonColor, { x: number; y: number }> = {
  red: { x: 0.25, y: 0.25 },
  green: { x: 0.75, y: 0.25 },
  blue: { x: 0.25, y: 0.75 },
  yellow: { x: 0.75, y: 0.75 },
};

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

  game = new MemoryChallengeGame();

  game.onStateChange = (state: GameState) => {
    updateUI(state);
    updateStatus(state.phase);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state.score);
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

function getButtonAt(x: number, y: number): ButtonColor | null {
  const { width, height } = canvas;
  const buttonRadius = Math.min(width, height) * 0.2;

  for (const [color, pos] of Object.entries(BUTTON_POSITIONS)) {
    const bx = pos.x * width;
    const by = pos.y * height;
    const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);

    if (dist <= buttonRadius) {
      return color as ButtonColor;
    }
  }
  return null;
}

function handleClick(e: MouseEvent): void {
  if (game.getState().phase !== "input") return;

  const { x, y } = getCanvasCoords(e);
  const button = getButtonAt(x, y);

  if (button) {
    game.pressButton(button);
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase !== "input") return;

  const touch = e.changedTouches[0];
  const { x, y } = getCanvasCoords(touch);
  const button = getButtonAt(x, y);

  if (button) {
    game.pressButton(button);
  }
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Background
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, width, height);

  // Center circle (game board)
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Draw buttons
  const buttonRadius = Math.min(width, height) * 0.2;

  for (const [color, pos] of Object.entries(BUTTON_POSITIONS)) {
    const bx = pos.x * width;
    const by = pos.y * height;
    const isActive = state.activeButton === color;

    drawButton(bx, by, buttonRadius, color as ButtonColor, isActive);
  }

  // Center decoration
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#9b59b6";
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawButton(x: number, y: number, radius: number, color: ButtonColor, active: boolean): void {
  const colorHex = game.getColorHex(color, active);

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
  ctx.fill();

  // Button
  ctx.fillStyle = colorHex;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Glow effect when active
  if (active) {
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Highlight
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = active ? "#fff" : "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = active ? 4 : 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function updateStatus(phase: string): void {
  statusDisplay.className = "status-display";

  switch (phase) {
    case "showing":
      statusDisplay.textContent = i18n.t("game.watch");
      statusDisplay.classList.add("watch");
      break;
    case "input":
      statusDisplay.textContent = i18n.t("game.yourTurn");
      statusDisplay.classList.add("input");
      break;
    case "correct":
      statusDisplay.textContent = i18n.t("game.correct");
      statusDisplay.classList.add("correct");
      break;
    case "wrong":
      statusDisplay.textContent = i18n.t("game.wrong");
      statusDisplay.classList.add("wrong");
      break;
    default:
      statusDisplay.textContent = "";
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  levelDisplay.textContent = state.level.toString();
  sequenceDisplay.textContent = state.sequence.length.toString();
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

// Cleanup
window.addEventListener("beforeunload", () => {
  game?.destroy();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Initialize
initI18n();
initGame();
