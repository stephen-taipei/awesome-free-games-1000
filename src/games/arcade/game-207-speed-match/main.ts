/**
 * Speed Match Main Entry
 * Game #207
 */
import { SpeedMatchGame, GameState, Card } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;
const matchesDisplay = document.getElementById("matches-display")!;
const levelDisplay = document.getElementById("level-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;
const resultIndicator = document.getElementById("result-indicator")!;

let game: SpeedMatchGame;
let cardWidth = 60;
let cardHeight = 80;
let gridOffsetX = 0;
let gridOffsetY = 0;
let cardGap = 10;

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

  game = new SpeedMatchGame();

  game.onStateChange = (state: GameState) => {
    render(state);
    updateUI(state);
    showResult(state.lastResult);

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
  canvas.height = 450;

  calculateCardLayout();
}

function calculateCardLayout(): void {
  const gridSize = game?.getGridSize() || { cols: 4, rows: 3 };
  const availableWidth = canvas.width - 40;
  const availableHeight = canvas.height - 40;

  cardWidth = Math.floor((availableWidth - (gridSize.cols - 1) * cardGap) / gridSize.cols);
  cardHeight = Math.floor(cardWidth * 1.3);

  if (cardHeight * gridSize.rows + (gridSize.rows - 1) * cardGap > availableHeight) {
    cardHeight = Math.floor((availableHeight - (gridSize.rows - 1) * cardGap) / gridSize.rows);
    cardWidth = Math.floor(cardHeight / 1.3);
  }

  gridOffsetX = (canvas.width - (cardWidth * gridSize.cols + (gridSize.cols - 1) * cardGap)) / 2;
  gridOffsetY = (canvas.height - (cardHeight * gridSize.rows + (gridSize.rows - 1) * cardGap)) / 2;
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getCardAt(canvasX: number, canvasY: number): Card | null {
  const state = game.getState();
  const gridSize = game.getGridSize();

  for (let i = 0; i < state.cards.length; i++) {
    const col = i % gridSize.cols;
    const row = Math.floor(i / gridSize.cols);
    const x = gridOffsetX + col * (cardWidth + cardGap);
    const y = gridOffsetY + row * (cardHeight + cardGap);

    if (canvasX >= x && canvasX <= x + cardWidth && canvasY >= y && canvasY <= y + cardHeight) {
      return state.cards[i];
    }
  }
  return null;
}

function handleClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const card = getCardAt(x, y);

  if (card) {
    game.selectCard(card.id);
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.changedTouches[0];
  const { x, y } = getCanvasCoords(touch);
  const card = getCardAt(x, y);

  if (card) {
    game.selectCard(card.id);
  }
}

function render(state: GameState): void {
  const { width, height } = canvas;
  calculateCardLayout();

  // Clear
  ctx.fillStyle = "#16213e";
  ctx.fillRect(0, 0, width, height);

  const gridSize = game.getGridSize();

  // Draw cards
  state.cards.forEach((card, index) => {
    const col = index % gridSize.cols;
    const row = Math.floor(index / gridSize.cols);
    const x = gridOffsetX + col * (cardWidth + cardGap);
    const y = gridOffsetY + row * (cardHeight + cardGap);

    drawCard(card, x, y);
  });
}

function drawCard(card: Card, x: number, y: number): void {
  const radius = 8;

  if (card.isMatched) {
    // Matched card - faded
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = card.color;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, radius);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  if (card.isFlipped) {
    // Front of card
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, radius);
    ctx.fill();

    // Border
    ctx.strokeStyle = card.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Symbol
    ctx.fillStyle = card.color;
    ctx.font = `bold ${cardWidth * 0.5}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(card.symbol, x + cardWidth / 2, y + cardHeight / 2);
  } else {
    // Back of card
    const gradient = ctx.createLinearGradient(x, y, x + cardWidth, y + cardHeight);
    gradient.addColorStop(0, "#6c5ce7");
    gradient.addColorStop(1, "#a29bfe");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, cardWidth, cardHeight, radius);
    ctx.fill();

    // Pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + cardWidth / 2, y + cardHeight / 2, 10 + i * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function showResult(result: "correct" | "wrong" | null): void {
  if (!result) {
    resultIndicator.classList.remove("show");
    return;
  }

  resultIndicator.textContent = result === "correct" ? i18n.t("game.correct") : i18n.t("game.wrong");
  resultIndicator.className = `result-indicator ${result} show`;

  setTimeout(() => {
    resultIndicator.classList.remove("show");
  }, 300);
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  timeDisplay.textContent = state.timeLeft.toString();
  matchesDisplay.textContent = state.matches.toString();
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

// Cleanup
window.addEventListener("beforeunload", () => {
  game?.destroy();
});

// Initialize
initI18n();
initGame();
