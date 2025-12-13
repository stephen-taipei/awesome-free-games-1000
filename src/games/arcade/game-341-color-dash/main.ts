/**
 * Color Dash Main Entry
 * Game #341
 */
import { ColorDashGame, GameState, Gate } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const gatesDisplay = document.getElementById("gates-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: ColorDashGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;
let lastTapTime = 0;

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

  game = new ColorDashGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  // Touch controls
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const now = Date.now();
    if (now - lastTapTime < 300) {
      // Double tap - change color
      game.changeColor();
    }
    lastTapTime = now;

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    game.movePlayer(touchX);
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    game.movePlayer(touchX);
  });

  // Mouse controls
  canvas.addEventListener("click", () => {
    if (game.getState().phase !== "playing") return;
    game.changeColor();
  });

  canvas.addEventListener("mousemove", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    game.movePlayer(mouseX);
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    if (e.key === " ") {
      game.changeColor();
    } else if (e.key === "ArrowLeft") {
      game.movePlayer(game.getState().player.x - 30);
    } else if (e.key === "ArrowRight") {
      game.movePlayer(game.getState().player.x + game.getState().player.width + 30);
    }
  });

  window.addEventListener("resize", resizeCanvas);

  highscoreDisplay.textContent = game.getState().highScore.toString();

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

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#16213e");
  gradient.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw gates
  for (const gate of state.gates) {
    drawGate(gate, state.colors, width);
  }

  // Draw player
  drawPlayer(state);

  // Draw color indicator
  drawColorIndicator(state);
}

function drawGate(gate: Gate, colors: string[], width: number): void {
  const segmentWidth = width / gate.segments.length;
  const gateHeight = 20;

  for (let i = 0; i < gate.segments.length; i++) {
    const color = colors[gate.segments[i]];
    const x = i * segmentWidth;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillRect(x, gate.y, segmentWidth, gateHeight);
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, gate.y, segmentWidth, gateHeight);
  }
}

function drawPlayer(state: GameState): void {
  const { player, colors } = state;
  const color = colors[player.color];

  // Trail
  ctx.fillStyle = `${color}40`;
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(
      player.x + player.width / 2,
      player.y + player.height / 2 + i * 15,
      player.width / 2 - i * 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Player body
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;

  ctx.beginPath();
  ctx.arc(
    player.x + player.width / 2,
    player.y + player.height / 2,
    player.width / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.shadowBlur = 0;

  // Inner circle
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.beginPath();
  ctx.arc(
    player.x + player.width / 2,
    player.y + player.height / 2,
    player.width / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawColorIndicator(state: GameState): void {
  const { colors, player } = state;
  const indicatorY = 20;
  const size = 20;
  const spacing = 10;
  const startX = (canvas.width - (colors.length * (size + spacing) - spacing)) / 2;

  for (let i = 0; i < colors.length; i++) {
    const x = startX + i * (size + spacing);
    const isActive = i === player.color;

    ctx.fillStyle = colors[i];
    ctx.globalAlpha = isActive ? 1 : 0.3;

    ctx.beginPath();
    ctx.arc(x + size / 2, indicatorY, isActive ? size / 2 : size / 3, 0, Math.PI * 2);
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  gatesDisplay.textContent = state.score.toString();
  highscoreDisplay.textContent = state.highScore.toString();
}

function showGameOverOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
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
