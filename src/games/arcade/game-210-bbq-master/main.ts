/**
 * BBQ Master Main Entry
 * Game #210
 */
import { BBQMasterGame, GameState, Meat, CookState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;
const perfectDisplay = document.getElementById("perfect-display")!;
const burntDisplay = document.getElementById("burnt-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: BBQMasterGame;
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

  game = new BBQMasterGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.status === "gameOver") {
      showGameOverOverlay(state.score);
    }
  };

  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchend", handleTouch, { passive: false });

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
  canvas.height = 450;
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function handleClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const meat = game.getMeatAt(x, y);

  if (meat) {
    game.flipMeat(meat.id);
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.changedTouches[0];
  const { x, y } = getCanvasCoords(touch);
  const meat = game.getMeatAt(x, y);

  if (meat) {
    game.flipMeat(meat.id);
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
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, width, height);

  // Grill
  drawGrill(width, height);

  // Meats
  state.meats.forEach((meat) => drawMeat(meat));
}

function drawGrill(width: number, height: number): void {
  const grillY = 80;
  const grillHeight = 320;

  // Grill body
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.roundRect(20, grillY, width - 40, grillHeight, 10);
  ctx.fill();

  // Grill surface (red hot)
  const gradient = ctx.createLinearGradient(0, grillY, 0, grillY + grillHeight);
  gradient.addColorStop(0, "#4a0000");
  gradient.addColorStop(0.5, "#6a0000");
  gradient.addColorStop(1, "#4a0000");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(30, grillY + 10, width - 60, grillHeight - 20, 5);
  ctx.fill();

  // Grill lines
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 4;
  for (let y = grillY + 40; y < grillY + grillHeight - 20; y += 25) {
    ctx.beginPath();
    ctx.moveTo(35, y);
    ctx.lineTo(width - 35, y);
    ctx.stroke();
  }

  // Glowing embers effect
  for (let i = 0; i < 20; i++) {
    const ex = 40 + Math.random() * (width - 80);
    const ey = grillY + 20 + Math.random() * (grillHeight - 40);
    const size = 2 + Math.random() * 3;

    ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.3 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(ex, ey, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMeat(meat: Meat): void {
  ctx.save();
  ctx.translate(meat.x, meat.y);

  const color = getMeatColor(meat.state, meat.cookProgress);

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(5, 5, meat.width / 2, meat.height / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Meat shape based on type
  ctx.fillStyle = color;

  if (meat.type === "steak") {
    ctx.beginPath();
    ctx.ellipse(0, 0, meat.width / 2, meat.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Grill marks
    if (meat.flipped || meat.cookProgress > 30) {
      ctx.strokeStyle = darkenColor(color, 40);
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-meat.width / 3, i * 12);
        ctx.lineTo(meat.width / 3, i * 12);
        ctx.stroke();
      }
    }
  } else if (meat.type === "sausage") {
    ctx.beginPath();
    ctx.roundRect(-meat.width / 2, -meat.height / 2, meat.width, meat.height, meat.height / 2);
    ctx.fill();

    // Grill marks
    if (meat.flipped || meat.cookProgress > 30) {
      ctx.strokeStyle = darkenColor(color, 40);
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 12, -meat.height / 3);
        ctx.lineTo(i * 12, meat.height / 3);
        ctx.stroke();
      }
    }
  } else if (meat.type === "chicken") {
    ctx.beginPath();
    ctx.moveTo(0, -meat.height / 2);
    ctx.bezierCurveTo(meat.width / 2, -meat.height / 3, meat.width / 2, meat.height / 3, 0, meat.height / 2);
    ctx.bezierCurveTo(-meat.width / 2, meat.height / 3, -meat.width / 2, -meat.height / 3, 0, -meat.height / 2);
    ctx.fill();
  } else if (meat.type === "shrimp") {
    ctx.beginPath();
    ctx.arc(0, 0, meat.width / 2, 0, Math.PI);
    ctx.lineTo(-meat.width / 2 + 5, meat.height / 3);
    ctx.bezierCurveTo(0, meat.height / 2, 0, meat.height / 2, meat.width / 2 - 5, meat.height / 3);
    ctx.closePath();
    ctx.fill();
  }

  // Cook indicator
  drawCookIndicator(meat);

  ctx.restore();
}

function drawCookIndicator(meat: Meat): void {
  const barWidth = meat.width;
  const barHeight = 6;
  const barY = meat.height / 2 + 10;

  // Background
  ctx.fillStyle = "#333";
  ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

  // Progress
  const progress = Math.min(100, meat.cookProgress) / 100;
  let progressColor = "#27ae60"; // Raw - green

  if (meat.cookProgress >= 85) {
    progressColor = "#2c2c2c"; // Burnt
  } else if (meat.cookProgress >= 60) {
    progressColor = "#f1c40f"; // Perfect - gold
  } else if (meat.cookProgress >= 30) {
    progressColor = "#e67e22"; // Cooking - orange
  }

  ctx.fillStyle = progressColor;
  ctx.fillRect(-barWidth / 2, barY, barWidth * progress, barHeight);

  // Perfect zone indicator
  ctx.strokeStyle = "#f1c40f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-barWidth / 2 + barWidth * 0.6, barY - 2);
  ctx.lineTo(-barWidth / 2 + barWidth * 0.6, barY + barHeight + 2);
  ctx.moveTo(-barWidth / 2 + barWidth * 0.85, barY - 2);
  ctx.lineTo(-barWidth / 2 + barWidth * 0.85, barY + barHeight + 2);
  ctx.stroke();
}

function getMeatColor(state: CookState, progress: number): string {
  if (state === "burnt") return "#2c2c2c";
  if (state === "overcooked") return "#8b4513";
  if (state === "perfect") return "#cd853f";
  if (state === "cooking") return "#daa06d";
  return "#ffb6c1"; // Raw - pink
}

function darkenColor(color: string, amount: number): string {
  const hex = color.replace("#", "");
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  timeDisplay.textContent = state.timeLeft.toString();
  perfectDisplay.textContent = state.perfectCount.toString();
  burntDisplay.textContent = state.burntCount.toString();
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
