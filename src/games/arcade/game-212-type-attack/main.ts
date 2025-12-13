/**
 * Type Attack Main Entry
 * Game #212
 */
import { TypeAttackGame, GameState, Word } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const wpmDisplay = document.getElementById("wpm-display")!;
const accuracyDisplay = document.getElementById("accuracy-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const inputDisplay = document.getElementById("input-display")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: TypeAttackGame;
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

  game = new TypeAttackGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);
    updateInputDisplay(state.currentInput);

    if (state.status === "gameOver") {
      showGameOverOverlay(state.score);
    }
  };

  // Keyboard input
  document.addEventListener("keydown", handleKeydown);

  window.addEventListener("resize", () => {
    resizeCanvas();
    game.setCanvasSize(canvas.width, canvas.height);
  });

  startRenderLoop();
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 400;
}

function handleKeydown(e: KeyboardEvent): void {
  if (game.getState().status !== "playing") return;

  if (e.key === "Backspace") {
    e.preventDefault();
    game.backspace();
  } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
    e.preventDefault();
    game.typeChar(e.key);
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
  ctx.fillStyle = "#0f0f23";
  ctx.fillRect(0, 0, width, height);

  // Grid effect
  ctx.strokeStyle = "rgba(0, 255, 136, 0.05)";
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

  // Danger zone
  ctx.fillStyle = "rgba(231, 76, 60, 0.1)";
  ctx.fillRect(0, height - 60, width, 60);
  ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
  ctx.beginPath();
  ctx.moveTo(0, height - 60);
  ctx.lineTo(width, height - 60);
  ctx.stroke();

  // Draw words
  state.words.forEach((word) => drawWord(word));

  // Scanlines effect
  ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 2);
  }
}

function drawWord(word: Word): void {
  const padding = 8;
  ctx.font = "bold 18px 'Courier New', monospace";

  const textWidth = ctx.measureText(word.text).width;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = 30;

  // Background
  if (word.active) {
    ctx.fillStyle = "rgba(0, 255, 136, 0.2)";
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 15;
  } else {
    ctx.fillStyle = "rgba(50, 50, 80, 0.8)";
    ctx.shadowBlur = 0;
  }

  ctx.beginPath();
  ctx.roundRect(word.x - boxWidth / 2, word.y - boxHeight / 2, boxWidth, boxHeight, 4);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Border
  ctx.strokeStyle = word.active ? "#00ff88" : "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = word.active ? 2 : 1;
  ctx.stroke();

  // Text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw typed part in green
  if (word.typed.length > 0) {
    ctx.fillStyle = "#00ff88";
    const typedWidth = ctx.measureText(word.typed).width;
    const startX = word.x - textWidth / 2;
    ctx.textAlign = "left";
    ctx.fillText(word.typed, startX, word.y);

    // Draw remaining part in white
    ctx.fillStyle = "#ffffff";
    const remaining = word.text.slice(word.typed.length);
    ctx.fillText(remaining, startX + typedWidth, word.y);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(word.text, word.x, word.y);
  }
}

function updateInputDisplay(input: string): void {
  inputDisplay.innerHTML = input
    ? `<span style="color: #00ff88">${input}</span><span class="cursor">|</span>`
    : '<span class="cursor">|</span>';
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  wpmDisplay.textContent = game.getWPM().toString();
  accuracyDisplay.textContent = game.getAccuracy() + "%";
  livesDisplay.textContent = "❤".repeat(state.lives);
}

function showGameOverOverlay(score: number): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `WPM: ${game.getWPM()} | ${i18n.t("game.accuracy")}: ${game.getAccuracy()}%`;
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
