/**
 * Neon Dash Main Entry
 * Game #337
 */
import { NeonDashGame, GameState, Obstacle, PowerUp } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: NeonDashGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;
let trailOffset = 0;

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

  game = new NeonDashGame();
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

    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;

    if (touchX < rect.width / 2) {
      game.moveLeft();
    } else {
      game.moveRight();
    }
  });

  // Mouse controls
  canvas.addEventListener("mousedown", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    if (clickX < rect.width / 2) {
      game.moveLeft();
    } else {
      game.moveRight();
    }
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    if (e.key === "ArrowLeft" || e.key === "a") {
      game.moveLeft();
    } else if (e.key === "ArrowRight" || e.key === "d") {
      game.moveRight();
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
    trailOffset = (trailOffset + game.getState().speed) % 100;
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
  const laneWidth = game.getLaneWidth();
  const laneCount = game.getLaneCount();
  const laneStart = (width - laneCount * laneWidth) / 2;

  // Background
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, width, height);

  // Draw road
  ctx.fillStyle = "#1a1a3a";
  ctx.fillRect(laneStart, 0, laneCount * laneWidth, height);

  // Draw lane lines
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);

  for (let i = 0; i <= laneCount; i++) {
    const x = laneStart + i * laneWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Draw speed lines
  ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
  ctx.lineWidth = 1;
  for (let y = -trailOffset; y < height; y += 100) {
    for (let i = 0; i < laneCount; i++) {
      const x = laneStart + i * laneWidth + laneWidth / 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x - 10, y + 50);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 10, y);
      ctx.lineTo(x + 10, y + 50);
      ctx.stroke();
    }
  }

  // Draw obstacles
  for (const obs of state.obstacles) {
    drawObstacle(obs, laneStart, laneWidth, height);
  }

  // Draw power-ups
  for (const pu of state.powerUps) {
    if (!pu.collected) {
      drawPowerUp(pu, laneStart, laneWidth, height);
    }
  }

  // Draw player
  drawPlayer(state, laneStart, laneWidth);
}

function drawObstacle(obs: Obstacle, laneStart: number, laneWidth: number, height: number): void {
  const y = height - obs.x - 40;

  for (let i = 0; i < obs.lanes.length; i++) {
    if (obs.lanes[i]) {
      const x = laneStart + i * laneWidth + 10;

      ctx.fillStyle = "#ff00ff";
      ctx.shadowColor = "#ff00ff";
      ctx.shadowBlur = 20;
      ctx.fillRect(x, y, laneWidth - 20, 40);
      ctx.shadowBlur = 0;

      // Inner glow
      ctx.fillStyle = "#ff66ff";
      ctx.fillRect(x + 5, y + 5, laneWidth - 30, 30);
    }
  }
}

function drawPowerUp(pu: PowerUp, laneStart: number, laneWidth: number, height: number): void {
  const x = laneStart + pu.lane * laneWidth + laneWidth / 2;
  const y = height - pu.x - 20;

  let color: string;
  switch (pu.type) {
    case "shield":
      color = "#00ffff";
      break;
    case "slow":
      color = "#ffff00";
      break;
    case "coin":
      color = "#00ff00";
      break;
  }

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Icon
  ctx.fillStyle = "#000";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const icon = pu.type === "shield" ? "S" : pu.type === "slow" ? "-" : "$";
  ctx.fillText(icon, x, y);
}

function drawPlayer(state: GameState, laneStart: number, laneWidth: number): void {
  const { player, hasShield } = state;

  // Shield effect
  if (hasShield) {
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(
      player.x + player.width / 2,
      player.y + player.height / 2,
      40,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Player body
  ctx.fillStyle = "#00ffff";
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 15;

  // Triangle ship
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;

  // Engine glow
  ctx.fillStyle = "#ff00ff";
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2 - 10, player.y + player.height);
  ctx.lineTo(player.x + player.width / 2, player.y + player.height + 15 + Math.random() * 5);
  ctx.lineTo(player.x + player.width / 2 + 10, player.y + player.height);
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  coinsDisplay.textContent = state.coins.toString();
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
  trailOffset = 0;
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
