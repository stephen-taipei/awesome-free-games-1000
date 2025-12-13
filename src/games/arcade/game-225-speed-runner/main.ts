/**
 * Speed Runner Main Entry
 * Game #225
 */
import { SpeedRunnerGame, GameState, Obstacle, Player } from "./game";
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

let game: SpeedRunnerGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;
let groundOffset = 0;

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

  game = new SpeedRunnerGame();
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
    const touchY = e.touches[0].clientY - rect.top;

    if (touchY < rect.height / 2) {
      game.jump();
    } else {
      game.startSlide();
    }
  });

  canvas.addEventListener("touchend", () => {
    game.endSlide();
  });

  // Mouse/click controls
  canvas.addEventListener("mousedown", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    if (clickY < rect.height / 2) {
      game.jump();
    } else {
      game.startSlide();
    }
  });

  canvas.addEventListener("mouseup", () => {
    game.endSlide();
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    if (e.key === "ArrowUp" || e.key === " " || e.key === "w") {
      game.jump();
    } else if (e.key === "ArrowDown" || e.key === "s") {
      game.startSlide();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowDown" || e.key === "s") {
      game.endSlide();
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
    groundOffset = (groundOffset + game.getState().speed) % 50;
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

  // Sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#1a1a2e");
  skyGradient.addColorStop(0.7, "#2c3e50");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Background buildings
  ctx.fillStyle = "#1a252f";
  for (let x = 0; x < width; x += 80) {
    const buildingHeight = 100 + Math.sin(x * 0.1) * 50;
    ctx.fillRect(x, state.groundY - buildingHeight, 60, buildingHeight);

    // Windows
    ctx.fillStyle = "#f1c40f";
    for (let wy = state.groundY - buildingHeight + 10; wy < state.groundY - 20; wy += 25) {
      for (let wx = x + 10; wx < x + 50; wx += 20) {
        if (Math.random() > 0.3) {
          ctx.fillRect(wx, wy, 8, 12);
        }
      }
    }
    ctx.fillStyle = "#1a252f";
  }

  // Ground
  ctx.fillStyle = "#27ae60";
  ctx.fillRect(0, state.groundY, width, height - state.groundY);

  // Ground pattern
  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 2;
  for (let x = -groundOffset; x < width + 50; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, state.groundY);
    ctx.lineTo(x + 20, state.groundY + 30);
    ctx.stroke();
  }

  // Draw obstacles
  for (const obs of state.obstacles) {
    drawObstacle(obs);
  }

  // Draw player
  drawPlayer(state.player);
}

function drawObstacle(obs: Obstacle): void {
  switch (obs.type) {
    case "block":
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(obs.x, obs.y, obs.width, 8);
      break;

    case "spike":
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.height);
      ctx.lineTo(obs.x + obs.width / 2, obs.y);
      ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
      ctx.closePath();
      ctx.fill();
      break;

    case "low":
      ctx.fillStyle = "#9b59b6";
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.fillStyle = "#8e44ad";
      ctx.fillRect(obs.x, obs.y + obs.height - 5, obs.width, 5);

      // Warning stripes
      ctx.fillStyle = "#f1c40f";
      for (let x = obs.x; x < obs.x + obs.width; x += 15) {
        ctx.fillRect(x, obs.y, 8, obs.height);
      }
      break;

    case "coin":
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f39c12";
      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawPlayer(player: Player): void {
  // Body
  ctx.fillStyle = "#3498db";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Head
  const headSize = player.isSliding ? 15 : 20;
  ctx.fillStyle = "#ffeaa7";
  ctx.fillRect(player.x + 5, player.y - (player.isSliding ? 0 : 5), headSize, headSize);

  // Running effect
  if (!player.isJumping && !player.isSliding) {
    const legOffset = Math.sin(Date.now() / 50) * 5;
    ctx.fillStyle = "#2980b9";
    ctx.fillRect(player.x + 5, player.y + player.height - 10, 8, 10);
    ctx.fillRect(player.x + player.width - 13, player.y + player.height - 10 + legOffset, 8, 10);
  }

  // Sliding effect
  if (player.isSliding) {
    ctx.fillStyle = "rgba(52, 152, 219, 0.3)";
    ctx.fillRect(player.x + player.width, player.y, 30, player.height);
  }
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
  groundOffset = 0;
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
