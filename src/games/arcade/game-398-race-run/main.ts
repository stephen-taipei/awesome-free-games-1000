/**
 * Race Run Main Entry
 * Game #398
 */
import { RaceRunGame, GameState, Racer, PowerUp, Obstacle } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const levelDisplay = document.getElementById("level-display")!;
const coinsDisplay = document.getElementById("coins-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const rankDisplay = document.getElementById("rank-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: RaceRunGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;

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

  game = new RaceRunGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "finished") {
      showFinishedOverlay(state);
    }
  };

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    const state = game.getState();
    if (state.phase !== "playing") return;

    if (e.key === "ArrowLeft" || e.key === "a") {
      e.preventDefault();
      game.moveLeft();
    } else if (e.key === "ArrowRight" || e.key === "d") {
      e.preventDefault();
      game.moveRight();
    } else if (e.key === " " || e.key === "ArrowUp" || e.key === "w") {
      e.preventDefault();
      game.boost();
    }
  });

  // Touch controls
  let touchStartX = 0;
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    const state = game.getState();
    if (state.phase !== "playing") return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;

    if (Math.abs(diff) > 30) {
      if (diff > 0) {
        game.moveRight();
      } else {
        game.moveLeft();
      }
    } else {
      game.boost();
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

  // Background - racing track
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2c3e50");
  gradient.addColorStop(1, "#34495e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Calculate camera offset based on player position
  const cameraPosition = state.player.position;

  // Draw track lanes
  const laneWidth = width / 3;
  ctx.strokeStyle = "#ecf0f1";
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 15]);

  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(laneWidth * i, 0);
    ctx.lineTo(laneWidth * i, height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Draw power-ups
  for (const powerUp of state.powerUps) {
    if (!powerUp.active) continue;
    drawPowerUp(powerUp, cameraPosition, laneWidth);
  }

  // Draw obstacles
  for (const obstacle of state.obstacles) {
    if (!obstacle.active) continue;
    drawObstacle(obstacle, cameraPosition, laneWidth);
  }

  // Draw finish line
  drawFinishLine(state.raceDistance, cameraPosition, width, laneWidth);

  // Draw all racers
  const allRacers = [state.player, ...state.aiRacers];
  for (const racer of allRacers) {
    drawRacer(racer, cameraPosition, laneWidth, height);
  }

  // Draw countdown
  if (state.phase === "countdown") {
    drawCountdown(state.countdown, width, height);
  }

  // Draw position indicators
  drawPositionIndicators(allRacers, width, state.raceDistance);
}

function drawPowerUp(powerUp: PowerUp, cameraPosition: number, laneWidth: number): void {
  const screenY = canvas.height / 2 - (powerUp.x - cameraPosition);

  if (screenY < -50 || screenY > canvas.height + 50) return;

  const x = laneWidth * powerUp.lane + laneWidth / 2;
  const y = screenY;

  if (powerUp.type === "boost") {
    // Lightning bolt boost
    ctx.fillStyle = "#f39c12";
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x - 8, y);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 15);
    ctx.lineTo(x + 8, y);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#f39c12";
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (powerUp.type === "coin") {
    // Coin
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f39c12";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawObstacle(obstacle: Obstacle, cameraPosition: number, laneWidth: number): void {
  const screenY = canvas.height / 2 - (obstacle.x - cameraPosition);

  if (screenY < -50 || screenY > canvas.height + 50) return;

  const x = laneWidth * obstacle.lane + laneWidth / 2 - obstacle.width / 2;
  const y = screenY - 20;

  // Traffic cone obstacle
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(x + obstacle.width / 2, y);
  ctx.lineTo(x, y + 40);
  ctx.lineTo(x + obstacle.width, y + 40);
  ctx.closePath();
  ctx.fill();

  // White stripes
  ctx.strokeStyle = "#ecf0f1";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 15);
  ctx.lineTo(x + obstacle.width - 10, y + 15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 30);
  ctx.lineTo(x + obstacle.width - 5, y + 30);
  ctx.stroke();
}

function drawFinishLine(raceDistance: number, cameraPosition: number, width: number, laneWidth: number): void {
  const screenY = canvas.height / 2 - (raceDistance - cameraPosition);

  if (screenY < -50 || screenY > canvas.height + 50) return;

  // Checkered pattern
  const squareSize = 30;
  for (let x = 0; x < width; x += squareSize) {
    for (let y = 0; y < squareSize * 2; y += squareSize) {
      const offset = Math.floor((screenY + y) / squareSize) % 2;
      ctx.fillStyle = (Math.floor(x / squareSize) + offset) % 2 === 0 ? "#000" : "#fff";
      ctx.fillRect(x, screenY + y - squareSize, squareSize, squareSize);
    }
  }

  // "FINISH" text
  ctx.fillStyle = "#e74c3c";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("FINISH", width / 2, screenY + 50);
}

function drawRacer(racer: Racer, cameraPosition: number, laneWidth: number, height: number): void {
  let screenY: number;

  if (racer.isPlayer) {
    // Player always at center
    screenY = height / 2;
  } else {
    // Other racers relative to player
    screenY = height / 2 - (racer.position - cameraPosition);
  }

  if (!racer.isPlayer && (screenY < -100 || screenY > height + 100)) return;

  const x = laneWidth * racer.lane + laneWidth / 2;
  const y = screenY;

  // Boost trail
  if (racer.isBoosting) {
    ctx.fillStyle = "rgba(241, 196, 15, 0.3)";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x - 20, y + 20 + i * 8, 40, 6);
    }
  }

  // Racer body
  ctx.fillStyle = racer.color;
  ctx.fillRect(x - 20, y - 30, 40, 60);

  // Racer front (rounded)
  ctx.beginPath();
  ctx.arc(x, y - 30, 20, Math.PI, 0);
  ctx.fill();

  // Racing stripe
  ctx.fillStyle = racer.isPlayer ? "#ecf0f1" : "#2c3e50";
  ctx.fillRect(x - 5, y - 30, 10, 60);

  // Helmet/head
  const helmetColor = racer.isPlayer ? "#f1c40f" : "#34495e";
  ctx.fillStyle = helmetColor;
  ctx.beginPath();
  ctx.arc(x, y - 15, 12, 0, Math.PI * 2);
  ctx.fill();

  // Visor
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(x - 10, y - 18, 20, 6);

  // Name tag
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(x - 30, y + 35, 60, 20);

  ctx.fillStyle = "#fff";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(racer.name, x, y + 48);

  // Rank badge if finished
  if (racer.isFinished && racer.rank > 0) {
    const rankColors = ["#f1c40f", "#95a5a6", "#cd7f32", "#7f8c8d"];
    ctx.fillStyle = rankColors[racer.rank - 1] || "#7f8c8d";
    ctx.beginPath();
    ctx.arc(x + 25, y - 25, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "bold 14px Arial";
    ctx.fillText(racer.rank.toString(), x + 25, y - 20);
  }
}

function drawCountdown(countdown: number, width: number, height: number): void {
  const text = countdown > 0 ? countdown.toString() : i18n.t("game.go");

  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = countdown > 0 ? "#e74c3c" : "#27ae60";
  ctx.font = "bold 80px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Glow effect
  ctx.shadowBlur = 30;
  ctx.shadowColor = countdown > 0 ? "#e74c3c" : "#27ae60";
  ctx.fillText(text, width / 2, height / 2);
  ctx.shadowBlur = 0;
}

function drawPositionIndicators(racers: Racer[], width: number, raceDistance: number): void {
  const barHeight = 80;
  const barY = 10;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(10, barY, width - 20, barHeight);

  // Sort by position
  const sorted = [...racers].sort((a, b) => b.position - a.position);

  sorted.forEach((racer, index) => {
    const progress = racer.position / raceDistance;
    const x = 10 + (width - 20) * progress;
    const y = barY + 20 + index * 15;

    // Dot
    ctx.fillStyle = racer.color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    if (racer.isPlayer) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("YOU", x, y - 12);
    }
  });

  // Finish line indicator
  ctx.strokeStyle = "#e74c3c";
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(width - 10, barY);
  ctx.lineTo(width - 10, barY + barHeight);
  ctx.stroke();
  ctx.setLineDash([]);
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  levelDisplay.textContent = state.level.toString();
  coinsDisplay.textContent = state.coins.toString();
  highscoreDisplay.textContent = state.highScore.toString();

  const rankText = state.player.rank > 0 ? `#${state.player.rank}` : "-";
  rankDisplay.textContent = rankText;
}

function showFinishedOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";

  let rankKey = "game.4thPlace";
  if (state.player.rank === 1) rankKey = "game.1stPlace";
  else if (state.player.rank === 2) rankKey = "game.2ndPlace";
  else if (state.player.rank === 3) rankKey = "game.3rdPlace";

  overlayTitle.textContent = i18n.t(rankKey);
  overlayMsg.textContent = i18n.t("game.raceFinished");
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";

  startBtn.textContent = i18n.t("game.restart");
  startBtn.style.display = "inline-block";

  if (state.player.rank === 1) {
    nextBtn.style.display = "inline-block";
  } else {
    nextBtn.style.display = "none";
  }
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  game.start();
  setTimeout(() => {
    startGameLoop();
  }, 3000); // Start after countdown
}

function nextLevel(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  game.nextLevel();
  setTimeout(() => {
    startGameLoop();
  }, 3000);
}

// Event listeners
startBtn.addEventListener("click", startGame);
nextBtn.addEventListener("click", nextLevel);

// Cleanup
window.addEventListener("beforeunload", () => {
  game?.destroy();
  stopGameLoop();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Initialize
initI18n();
initGame();
