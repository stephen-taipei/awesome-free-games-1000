/**
 * Bubble Shooter Main Entry
 * Game #220
 */
import { BubbleShooterGame, GameState, Bubble } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: BubbleShooterGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;

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

  game = new BubbleShooterGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver" || state.phase === "win") {
      showGameOverOverlay(state);
    }
  };

  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouch, { passive: false });

  window.addEventListener("resize", resizeCanvas);

  startRenderLoop();
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 500;

  if (game) {
    game.setCanvasSize(canvas.width, canvas.height);
  }
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function handleMouseMove(e: MouseEvent): void {
  if (game.getState().phase !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const shooter = game.getShooterPosition();
  const angle = Math.atan2(y - shooter.y, x - shooter.x);
  game.setAimAngle(angle);
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase !== "playing") return;

  const touch = e.touches[0];
  const { x, y } = getCanvasCoords(touch);
  const shooter = game.getShooterPosition();
  const angle = Math.atan2(y - shooter.y, x - shooter.x);
  game.setAimAngle(angle);
}

function handleClick(): void {
  if (game.getState().phase === "playing") {
    game.shoot();
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase === "playing") {
    game.shoot();
  }
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function startGameLoop(): void {
  gameLoop = window.setInterval(() => {
    game.update();
  }, 1000 / 60);
}

function stopGameLoop(): void {
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;
  const radius = game.getBubbleRadius();

  // Background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#2c3e50");
  bgGradient.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw bubbles
  for (const bubble of state.bubbles) {
    drawBubble(bubble.x, bubble.y, bubble.color, radius);
  }

  // Draw shooting bubble
  if (state.shootingBubble) {
    drawBubble(state.shootingBubble.x, state.shootingBubble.y, state.shootingBubble.color, radius);
  }

  // Draw shooter area
  const shooter = game.getShooterPosition();

  // Shooter background
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, height - 80, width, 80);

  // Aim line
  if (state.phase === "playing") {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(shooter.x, shooter.y);
    ctx.lineTo(
      shooter.x + Math.cos(state.aimAngle) * 300,
      shooter.y + Math.sin(state.aimAngle) * 300
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Current bubble
  drawBubble(shooter.x, shooter.y, state.currentBubble, radius);

  // Next bubble
  ctx.globalAlpha = 0.7;
  drawBubble(shooter.x + 50, shooter.y + 10, state.nextBubble, radius * 0.7);
  ctx.globalAlpha = 1;

  // "NEXT" label
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NEXT", shooter.x + 50, shooter.y + 35);
}

function drawBubble(x: number, y: number, color: string, radius: number): void {
  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
  ctx.fill();

  // Main bubble
  const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
  gradient.addColorStop(0, lightenColor(color, 40));
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, darkenColor(color, 20));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Shine
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
}

function showGameOverOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";

  if (state.phase === "win") {
    overlayTitle.textContent = i18n.t("game.win");
  } else {
    overlayTitle.textContent = i18n.t("game.gameOver");
  }

  overlayMsg.textContent = "";
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  game.start();
  startGameLoop();
}

// Event listeners
startBtn.addEventListener("click", startGame);

// Cleanup
window.addEventListener("beforeunload", () => {
  game?.destroy();
  stopGameLoop();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Initialize
initI18n();
initGame();
