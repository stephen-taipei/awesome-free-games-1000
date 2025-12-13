/**
 * Rhythm Catch Main Entry
 * Game #208
 */
import { RhythmCatchGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;
const resultIndicator = document.getElementById("result-indicator")!;

let game: RhythmCatchGame;
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

  game = new RhythmCatchGame();

  game.onStateChange = (state: GameState) => {
    updateUI(state);
    showResult(state.lastResult);

    if (state.status === "gameOver") {
      showGameOverOverlay(state.score);
    }
  };

  // Input handlers
  canvas.addEventListener("click", handleCatch);
  canvas.addEventListener("touchstart", handleTouchCatch, { passive: false });
  document.addEventListener("keydown", handleKeydown);

  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  // Start render loop
  startRenderLoop();
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 450;
}

function handleCatch(): void {
  if (game.getState().status === "playing") {
    game.catch();
  }
}

function handleTouchCatch(e: TouchEvent): void {
  e.preventDefault();
  handleCatch();
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.code === "Space" && game.getState().status === "playing") {
    e.preventDefault();
    game.catch();
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

  // Clear with gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0f0f23");
  gradient.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw rhythm lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  for (let y = 50; y < height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw catcher zone
  const catcherY = game.getCatcherY();

  // Perfect zone
  ctx.fillStyle = "rgba(0, 184, 148, 0.2)";
  ctx.fillRect(0, catcherY - 20, width, 40);

  // Good zone
  ctx.fillStyle = "rgba(253, 203, 110, 0.1)";
  ctx.fillRect(0, catcherY - 50, width, 30);
  ctx.fillRect(0, catcherY + 20, width, 30);

  // Catcher line
  ctx.strokeStyle = "#00b894";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, catcherY);
  ctx.lineTo(width, catcherY);
  ctx.stroke();

  // Catcher glow
  ctx.shadowColor = "#00b894";
  ctx.shadowBlur = 20;
  ctx.strokeStyle = "#00b894";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, catcherY);
  ctx.lineTo(width, catcherY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw balls
  state.balls.forEach((ball) => {
    // Ball glow
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 15;

    // Ball
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Ball highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(ball.x - 5, ball.y - 5, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw beat indicator
  if (state.status === "playing") {
    const beatInterval = 60000 / state.bpm;
    const beatProgress = (performance.now() % beatInterval) / beatInterval;
    const pulseSize = 10 + Math.sin(beatProgress * Math.PI) * 5;

    ctx.fillStyle = `rgba(255, 107, 107, ${0.3 + Math.sin(beatProgress * Math.PI) * 0.3})`;
    ctx.beginPath();
    ctx.arc(width - 30, 30, pulseSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

function showResult(result: "perfect" | "good" | "miss" | null): void {
  if (!result) return;

  let text = "";
  switch (result) {
    case "perfect":
      text = i18n.t("game.perfect");
      break;
    case "good":
      text = i18n.t("game.good");
      break;
    case "miss":
      text = i18n.t("game.miss");
      break;
  }

  resultIndicator.textContent = text;
  resultIndicator.className = `result-indicator ${result} show`;

  setTimeout(() => {
    resultIndicator.classList.remove("show");
  }, 200);
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  comboDisplay.textContent = state.combo > 0 ? `x${state.combo}` : "-";
  livesDisplay.textContent = "❤".repeat(state.lives);
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
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});

// Initialize
initI18n();
initGame();
