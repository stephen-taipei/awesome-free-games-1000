/**
 * Jump King Main Entry
 * Game #342
 */
import { JumpKingGame, GameState, Platform } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const heightDisplay = document.getElementById("height-display")!;
const maxDisplay = document.getElementById("max-display")!;
const fallsDisplay = document.getElementById("falls-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: JumpKingGame;
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

  game = new JumpKingGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "victory") {
      showVictoryOverlay(state);
    }
  };

  // Touch controls
  let touchStartX = 0;

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    touchStartX = e.touches[0].clientX - rect.left;
    const direction = touchStartX > rect.width / 2 ? 1 : -1;
    game.startCharge(direction);
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;
    game.releaseJump();
  });

  // Mouse controls
  canvas.addEventListener("mousedown", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const direction = clickX > rect.width / 2 ? 1 : -1;
    game.startCharge(direction);
  });

  canvas.addEventListener("mouseup", () => {
    if (game.getState().phase !== "playing") return;
    game.releaseJump();
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    if (e.key === "ArrowLeft") {
      game.startCharge(-1);
    } else if (e.key === "ArrowRight") {
      game.startCharge(1);
    } else if (e.key === " ") {
      game.startCharge(game.getState().player.facingRight ? 1 : -1);
    }
  });

  document.addEventListener("keyup", (e) => {
    if (game.getState().phase !== "playing") return;

    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ") {
      game.releaseJump();
    }
  });

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

  // Background gradient based on height
  const heightRatio = state.currentHeight / state.targetHeight;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);

  if (heightRatio < 0.33) {
    gradient.addColorStop(0, "#34495e");
    gradient.addColorStop(1, "#2c3e50");
  } else if (heightRatio < 0.66) {
    gradient.addColorStop(0, "#2980b9");
    gradient.addColorStop(1, "#34495e");
  } else {
    gradient.addColorStop(0, "#9b59b6");
    gradient.addColorStop(1, "#2980b9");
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw platforms
  for (const platform of state.platforms) {
    const screenY = platform.y + state.cameraY;
    if (screenY > -20 && screenY < height + 20) {
      drawPlatform(platform, screenY);
    }
  }

  // Draw player
  drawPlayer(state);

  // Draw charge indicator
  if (state.player.isCharging) {
    drawChargeIndicator(state);
  }

  // Draw height progress
  drawHeightProgress(state);
}

function drawPlatform(platform: Platform, screenY: number): void {
  if (platform.crumbling && platform.crumbleTimer! > 30) return;

  let color: string;
  switch (platform.type) {
    case "ice":
      color = "#74b9ff";
      break;
    case "bounce":
      color = "#fdcb6e";
      break;
    case "crumble":
      color = platform.crumbling ? "#d63031" : "#a29bfe";
      break;
    default:
      color = "#27ae60";
  }

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;

  if (platform.crumbling) {
    // Shake effect
    const shake = Math.random() * 4 - 2;
    ctx.fillRect(platform.x + shake, screenY, platform.width, 15);
  } else {
    ctx.fillRect(platform.x, screenY, platform.width, 15);
  }

  ctx.shadowBlur = 0;

  // Platform decoration
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(platform.x + 5, screenY + 3, platform.width - 10, 3);
}

function drawPlayer(state: GameState): void {
  const { player } = state;

  // Body
  ctx.fillStyle = "#e74c3c";
  ctx.shadowColor = "#e74c3c";
  ctx.shadowBlur = 10;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.shadowBlur = 0;

  // Crown
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.moveTo(player.x + 5, player.y);
  ctx.lineTo(player.x + 10, player.y - 10);
  ctx.lineTo(player.x + 15, player.y - 5);
  ctx.lineTo(player.x + 20, player.y - 12);
  ctx.lineTo(player.x + 25, player.y);
  ctx.closePath();
  ctx.fill();

  // Face direction indicator
  ctx.fillStyle = "#fff";
  const eyeX = player.facingRight ? player.x + 20 : player.x + 5;
  ctx.beginPath();
  ctx.arc(eyeX, player.y + 15, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawChargeIndicator(state: GameState): void {
  const { player } = state;
  const chargePercent = Math.min(player.chargeTime / 60, 1);

  const barWidth = 50;
  const barHeight = 8;
  const barX = player.x + player.width / 2 - barWidth / 2;
  const barY = player.y - 25;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Fill
  const fillColor = chargePercent < 0.5 ? "#27ae60" : chargePercent < 0.8 ? "#f1c40f" : "#e74c3c";
  ctx.fillStyle = fillColor;
  ctx.fillRect(barX, barY, barWidth * chargePercent, barHeight);

  // Border
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}

function drawHeightProgress(state: GameState): void {
  const barHeight = 150;
  const barWidth = 10;
  const barX = canvas.width - 25;
  const barY = 20;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Progress
  const progress = state.currentHeight / state.targetHeight;
  ctx.fillStyle = "#27ae60";
  ctx.fillRect(barX, barY + barHeight * (1 - progress), barWidth, barHeight * progress);

  // Border
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // Crown at top
  ctx.fillStyle = "#f1c40f";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("👑", barX + barWidth / 2, barY - 5);
}

function updateUI(state: GameState): void {
  heightDisplay.textContent = Math.floor(state.currentHeight).toString();
  maxDisplay.textContent = Math.floor(state.maxHeight).toString();
  fallsDisplay.textContent = state.falls.toString();
}

function showVictoryOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.victory");
  overlayMsg.textContent = `${i18n.t("game.falls")}: ${state.falls}`;
  finalScoreDisplay.textContent = Math.floor(state.maxHeight).toString();
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
