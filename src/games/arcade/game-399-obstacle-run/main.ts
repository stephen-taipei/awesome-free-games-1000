/**
 * Obstacle Run Main Entry
 * Game #399
 */
import { ObstacleRunGame, GameState, Obstacle, Player } from "./game";
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

let game: ObstacleRunGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;
let groundOffset = 0;

const LANE_WIDTH = 100;

function initI18n(): void {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-HK")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.includes("zh")) {
    i18n.setLocale("zh-CN");
  } else if (browserLang.includes("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.includes("ko")) {
    i18n.setLocale("ko");
  } else {
    i18n.setLocale("en");
  }

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

  game = new ObstacleRunGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        game.moveLeft();
        break;
      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        game.moveRight();
        break;
      case "ArrowUp":
      case "w":
      case "W":
      case " ":
        e.preventDefault();
        game.jump();
        break;
      case "ArrowDown":
      case "s":
      case "S":
        e.preventDefault();
        game.startSlide();
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      game.endSlide();
    }
  });

  // Touch controls
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 30) {
        game.moveRight();
      } else if (deltaX < -30) {
        game.moveLeft();
      }
    } else {
      // Vertical swipe
      if (deltaY < -30) {
        game.jump();
      } else if (deltaY > 30) {
        game.startSlide();
        setTimeout(() => game.endSlide(), 300);
      }
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
    groundOffset = (groundOffset + game.getState().speed) % 60;
  }, 1000 / 60);
}

function stopGameLoop(): void {
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = null;
  }
}

function getPlayerLaneX(lane: number): number {
  const centerX = canvas.width / 2;
  return centerX - LANE_WIDTH + lane * LANE_WIDTH;
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#ff6b35");
  skyGradient.addColorStop(0.5, "#f7931e");
  skyGradient.addColorStop(1, "#feca57");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Sun
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.beginPath();
  ctx.arc(width - 80, 80, 50, 0, Math.PI * 2);
  ctx.fill();

  // Draw 3D perspective lanes
  const centerX = width / 2;
  const vanishY = height * 0.3;

  // Lane lines with perspective
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 3;

  // Left lane line
  ctx.beginPath();
  ctx.moveTo(centerX - 120, vanishY);
  ctx.lineTo(centerX - LANE_WIDTH * 1.5, state.groundY);
  ctx.stroke();

  // Right lane line
  ctx.beginPath();
  ctx.moveTo(centerX + 120, vanishY);
  ctx.lineTo(centerX + LANE_WIDTH * 1.5, state.groundY);
  ctx.stroke();

  // Middle lanes
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(centerX - 40, vanishY);
  ctx.lineTo(centerX - LANE_WIDTH / 2, state.groundY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX + 40, vanishY);
  ctx.lineTo(centerX + LANE_WIDTH / 2, state.groundY);
  ctx.stroke();

  // Ground
  ctx.fillStyle = "#27ae60";
  ctx.fillRect(0, state.groundY, width, height - state.groundY);

  // Ground pattern
  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 2;
  for (let x = -groundOffset; x < width + 60; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, state.groundY);
    ctx.lineTo(x + 30, state.groundY + 30);
    ctx.stroke();
  }

  // Draw obstacles
  for (const obs of state.obstacles) {
    drawObstacle(obs, state.groundY);
  }

  // Draw player
  drawPlayer(state.player, state.groundY);

  // Speed indicator
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(10, 10, 150, 8);
  ctx.fillStyle = "#f39c12";
  const speedPercent = (state.speed / 14) * 150;
  ctx.fillRect(10, 10, speedPercent, 8);
}

function drawObstacle(obs: Obstacle, groundY: number): void {
  const laneX = getPlayerLaneX(obs.lane) + (obs.movingOffset || 0);
  const obsWidth = 50;

  switch (obs.type) {
    case "low":
      // Low barrier - must jump
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(laneX - obsWidth / 2, groundY - 40, obsWidth, 40);

      ctx.fillStyle = "#c0392b";
      ctx.fillRect(laneX - obsWidth / 2, groundY - 40, obsWidth, 10);

      // Warning stripes
      ctx.fillStyle = "#f1c40f";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(laneX - obsWidth / 2 + i * 20, groundY - 40, 10, 40);
      }
      break;

    case "high":
      // High barrier - must slide
      ctx.fillStyle = "#9b59b6";
      ctx.fillRect(laneX - obsWidth / 2, groundY - 100, obsWidth, 60);

      ctx.fillStyle = "#8e44ad";
      ctx.fillRect(laneX - obsWidth / 2, groundY - 100, obsWidth, 15);

      // Horizontal stripes
      ctx.fillStyle = "#f39c12";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(laneX - obsWidth / 2, groundY - 90 + i * 20, obsWidth, 5);
      }
      break;

    case "moving":
      // Moving obstacle
      ctx.fillStyle = "#3498db";
      ctx.fillRect(laneX - 25, groundY - 50, 50, 50);

      ctx.fillStyle = "#2980b9";
      ctx.fillRect(laneX - 25, groundY - 50, 50, 12);

      // Animated arrow
      const arrowOffset = obs.movingDirection! > 0 ? 5 : -5;
      ctx.fillStyle = "#ecf0f1";
      ctx.beginPath();
      ctx.moveTo(laneX + arrowOffset, groundY - 25);
      ctx.lineTo(laneX + 10 + arrowOffset, groundY - 30);
      ctx.lineTo(laneX + 10 + arrowOffset, groundY - 20);
      ctx.fill();
      break;

    case "coin":
      if (obs.y !== undefined) {
        ctx.save();
        ctx.translate(laneX, obs.y + 15);

        // Rotating coin effect
        const rotation = (Date.now() / 10) % 360;
        const scale = Math.abs(Math.sin((rotation * Math.PI) / 180));

        ctx.scale(scale, 1);

        ctx.fillStyle = "#f1c40f";
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f39c12";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
      break;
  }
}

function drawPlayer(player: Player, groundY: number): void {
  const laneX = getPlayerLaneX(player.lane);
  const playerWidth = 40;

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(laneX, groundY - 5, playerWidth / 2, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#3498db";
  ctx.fillRect(laneX - playerWidth / 2, player.y, playerWidth, player.height);

  // Accent
  ctx.fillStyle = "#2980b9";
  ctx.fillRect(laneX - playerWidth / 2, player.y, playerWidth, 12);

  // Head
  const headSize = player.isSliding ? 18 : 24;
  ctx.fillStyle = "#ffeaa7";
  ctx.beginPath();
  ctx.arc(laneX, player.y + (player.isSliding ? 10 : -8), headSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // Running animation
  if (!player.isJumping && !player.isSliding) {
    const legPhase = Math.sin(Date.now() / 60) * 8;
    ctx.fillStyle = "#2980b9";
    ctx.fillRect(laneX - 15, player.y + player.height - 12, 10, 12);
    ctx.fillRect(laneX + 5, player.y + player.height - 12 + legPhase, 10, 12);
  }

  // Sliding trail
  if (player.isSliding) {
    ctx.fillStyle = "rgba(52, 152, 219, 0.3)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(
        laneX - playerWidth / 2 + i * 15,
        player.y + 5,
        10,
        player.height - 10
      );
    }
  }

  // Jump arc indicator
  if (player.isJumping && player.vy < 0) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(laneX, player.y + 60, 30, 0, Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
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
