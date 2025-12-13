/**
 * Space Dodge Main Entry
 * Game #344
 */
import { SpaceDodgeGame, GameState, Asteroid, Star, PowerUp } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: SpaceDodgeGame;
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

  game = new SpaceDodgeGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  // Touch controls
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    game.moveShip(touchX);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    game.moveShip(touchX);
  });

  // Mouse controls
  canvas.addEventListener("mousemove", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    game.moveShip(mouseX);
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    const state = game.getState();
    if (e.key === "ArrowLeft") {
      game.moveShip(state.spaceship.x - 20);
    } else if (e.key === "ArrowRight") {
      game.moveShip(state.spaceship.x + state.spaceship.width + 20);
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
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, width, height);

  // Draw stars
  for (const star of state.stars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.size * 0.2})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw power-ups
  for (const powerUp of state.powerUps) {
    if (!powerUp.collected) {
      drawPowerUp(powerUp);
    }
  }

  // Draw asteroids
  for (const asteroid of state.asteroids) {
    drawAsteroid(asteroid);
  }

  // Draw spaceship
  drawSpaceship(state);
}

function drawAsteroid(asteroid: Asteroid): void {
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.rotate(asteroid.rotation);

  // Rocky texture
  ctx.fillStyle = "#8b7355";
  ctx.beginPath();

  const points = 8;
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points;
    const variance = 0.7 + Math.sin(i * 1.5) * 0.3;
    const r = asteroid.radius * variance;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();

  // Craters
  ctx.fillStyle = "#6b5344";
  ctx.beginPath();
  ctx.arc(-asteroid.radius * 0.2, -asteroid.radius * 0.2, asteroid.radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(asteroid.radius * 0.3, asteroid.radius * 0.2, asteroid.radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPowerUp(powerUp: PowerUp): void {
  let color: string;
  let symbol: string;

  switch (powerUp.type) {
    case "shield":
      color = "#00ff88";
      symbol = "S";
      break;
    case "slow":
      color = "#ffff00";
      symbol = "-";
      break;
    case "shrink":
      color = "#ff00ff";
      symbol = "<>";
      break;
  }

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(powerUp.x, powerUp.y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#000";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, powerUp.x, powerUp.y);
}

function drawSpaceship(state: GameState): void {
  const { spaceship } = state;

  // Shield effect
  if (spaceship.invincible) {
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(
      spaceship.x + spaceship.width / 2,
      spaceship.y + spaceship.height / 2,
      spaceship.width,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Engine glow
  ctx.fillStyle = "#ff6b00";
  ctx.shadowColor = "#ff6b00";
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(spaceship.x + 10, spaceship.y + spaceship.height);
  ctx.lineTo(spaceship.x + spaceship.width / 2, spaceship.y + spaceship.height + 15 + Math.random() * 5);
  ctx.lineTo(spaceship.x + spaceship.width - 10, spaceship.y + spaceship.height);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Ship body
  ctx.fillStyle = "#00d2ff";
  ctx.shadowColor = "#00d2ff";
  ctx.shadowBlur = 10;

  // Main hull
  ctx.beginPath();
  ctx.moveTo(spaceship.x + spaceship.width / 2, spaceship.y);
  ctx.lineTo(spaceship.x, spaceship.y + spaceship.height);
  ctx.lineTo(spaceship.x + spaceship.width, spaceship.y + spaceship.height);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;

  // Cockpit
  ctx.fillStyle = "#80e5ff";
  ctx.beginPath();
  ctx.ellipse(
    spaceship.x + spaceship.width / 2,
    spaceship.y + spaceship.height * 0.4,
    spaceship.width * 0.2,
    spaceship.height * 0.2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Wings
  ctx.fillStyle = "#0099cc";
  ctx.beginPath();
  ctx.moveTo(spaceship.x, spaceship.y + spaceship.height * 0.7);
  ctx.lineTo(spaceship.x - 10, spaceship.y + spaceship.height);
  ctx.lineTo(spaceship.x + 5, spaceship.y + spaceship.height);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(spaceship.x + spaceship.width, spaceship.y + spaceship.height * 0.7);
  ctx.lineTo(spaceship.x + spaceship.width + 10, spaceship.y + spaceship.height);
  ctx.lineTo(spaceship.x + spaceship.width - 5, spaceship.y + spaceship.height);
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = Math.floor(state.distance / 10).toString();
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
