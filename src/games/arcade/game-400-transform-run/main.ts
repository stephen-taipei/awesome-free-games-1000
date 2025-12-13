/**
 * Transform Run Main Entry
 * Game #400
 */
import { TransformRunGame, GameState, ShapeForm } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const distanceDisplay = document.getElementById("distance-display")!;
const energyDisplay = document.getElementById("energy-display")!;
const energyBar = document.getElementById("energy-bar")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const formDisplay = document.getElementById("form-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;
const formButtons = document.querySelectorAll(".form-btn");

let game: TransformRunGame;
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

  game = new TransformRunGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    switch (e.code) {
      case "Space":
        e.preventDefault();
        game.jump();
        break;
      case "Digit1":
      case "Numpad1":
        e.preventDefault();
        game.transform("human");
        break;
      case "Digit2":
      case "Numpad2":
        e.preventDefault();
        game.transform("ball");
        break;
      case "Digit3":
      case "Numpad3":
        e.preventDefault();
        game.transform("bird");
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (game.getState().phase !== "playing") return;

    if (e.code === "Space") {
      game.stopFlying();
    }
  });

  // Touch controls for form buttons
  formButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (game.getState().phase !== "playing") return;
      const form = btn.getAttribute("data-form") as ShapeForm;
      game.transform(form);
    });
  });

  // Touch controls for jump
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.getState().phase === "playing") {
      game.jump();
    }
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (game.getState().phase === "playing") {
      game.stopFlying();
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

  // Background - sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#87CEEB");
  skyGradient.addColorStop(1, "#E0F6FF");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Clouds (parallax)
  drawClouds(state);

  // Ground
  ctx.fillStyle = "#8B7355";
  ctx.fillRect(0, state.groundY, width, height - state.groundY);

  // Ground grass
  ctx.fillStyle = "#90EE90";
  ctx.fillRect(0, state.groundY, width, 10);

  // Draw obstacles
  for (const obstacle of state.obstacles) {
    drawObstacle(obstacle, state);
  }

  // Draw coins
  for (const coin of state.coins) {
    if (!coin.collected) {
      drawCoin(coin, state);
    }
  }

  // Draw player
  drawPlayer(state.player, state);

  // Draw distance markers
  drawDistanceMarkers(state, width);
}

function drawClouds(state: GameState): void {
  const cloudX = (-state.cameraX * 0.2) % 200;
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";

  for (let i = -1; i < 5; i++) {
    const x = cloudX + i * 200;
    // Simple cloud shape
    ctx.beginPath();
    ctx.arc(x, 60, 20, 0, Math.PI * 2);
    ctx.arc(x + 25, 60, 25, 0, Math.PI * 2);
    ctx.arc(x + 50, 60, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawObstacle(obstacle: any, state: GameState): void {
  const screenX = obstacle.x - state.cameraX;

  ctx.save();

  if (obstacle.type === "low") {
    // Low barrier (requires ball form)
    ctx.fillStyle = "#FF6B6B";
    ctx.fillRect(screenX, obstacle.y, obstacle.width, obstacle.height);

    // Warning stripes
    ctx.fillStyle = "#FFE66D";
    for (let i = 0; i < obstacle.width; i += 20) {
      ctx.fillRect(screenX + i, obstacle.y, 10, obstacle.height);
    }

    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BALL", screenX + obstacle.width / 2, obstacle.y + obstacle.height / 2 + 5);
  } else if (obstacle.type === "high") {
    // High wall (requires jump)
    ctx.fillStyle = "#4ECDC4";
    ctx.fillRect(screenX, obstacle.y, obstacle.width, obstacle.height);

    // Brick pattern
    ctx.strokeStyle = "#3BAEA0";
    ctx.lineWidth = 2;
    for (let i = 0; i < obstacle.height; i += 15) {
      ctx.beginPath();
      ctx.moveTo(screenX, obstacle.y + i);
      ctx.lineTo(screenX + obstacle.width, obstacle.y + i);
      ctx.stroke();
    }
  } else if (obstacle.type === "ceiling") {
    // Ceiling obstacle (requires duck/ball)
    ctx.fillStyle = "#95A5A6";
    ctx.fillRect(screenX, obstacle.y, obstacle.width, obstacle.height);

    // Spikes
    ctx.fillStyle = "#7F8C8D";
    for (let i = 0; i < obstacle.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(screenX + i, obstacle.y + obstacle.height);
      ctx.lineTo(screenX + i + 10, obstacle.y + obstacle.height + 15);
      ctx.lineTo(screenX + i + 20, obstacle.y + obstacle.height);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawCoin(coin: any, state: GameState): void {
  const screenX = coin.x - state.cameraX;
  const time = Date.now() / 1000;

  ctx.save();
  ctx.translate(screenX, coin.y);

  // Rotating effect
  const rotation = time * 3;
  const scale = Math.abs(Math.cos(rotation)) * 0.5 + 0.5;

  ctx.scale(scale, 1);

  // Outer glow
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 15;

  // Coin
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
  ctx.fill();

  // Inner circle
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#FFA500";
  ctx.beginPath();
  ctx.arc(0, 0, coin.radius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Symbol
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("E", 0, 0);

  ctx.restore();
}

function drawPlayer(player: any, state: GameState): void {
  const screenX = player.x;

  ctx.save();
  ctx.translate(screenX, player.y);

  if (player.form === "human") {
    drawHumanForm(player);
  } else if (player.form === "ball") {
    drawBallForm(player);
  } else if (player.form === "bird") {
    drawBirdForm(player);
  }

  ctx.restore();
}

function drawHumanForm(player: any): void {
  // Body
  ctx.fillStyle = "#3498DB";
  ctx.fillRect(player.width * 0.2, player.height * 0.3, player.width * 0.6, player.height * 0.5);

  // Head
  ctx.fillStyle = "#F39C12";
  ctx.beginPath();
  ctx.arc(player.width / 2, player.height * 0.2, player.width * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = "#2C3E50";
  ctx.fillRect(player.width * 0.25, player.height * 0.8, player.width * 0.2, player.height * 0.2);
  ctx.fillRect(player.width * 0.55, player.height * 0.8, player.width * 0.2, player.height * 0.2);

  // Running animation
  const legOffset = Math.sin(Date.now() / 100) * 5;
  ctx.fillRect(player.width * 0.25, player.height * 0.8 + legOffset, player.width * 0.2, player.height * 0.2);
}

function drawBallForm(player: any): void {
  const centerX = player.width / 2;
  const centerY = player.height / 2;
  const radius = player.width / 2;

  // Rolling effect
  const rotation = (Date.now() / 50) % (Math.PI * 2);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);

  // Ball gradient
  const gradient = ctx.createRadialGradient(0, -radius * 0.3, 0, 0, 0, radius);
  gradient.addColorStop(0, "#9B59B6");
  gradient.addColorStop(1, "#8E44AD");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Pattern lines
  ctx.strokeStyle = "#BB8FCE";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBirdForm(player: any): void {
  const centerX = player.width / 2;
  const centerY = player.height / 2;
  const wingFlap = Math.sin(Date.now() / 100) * 10;

  // Body
  ctx.fillStyle = "#E74C3C";
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, player.width * 0.3, player.height * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.fillStyle = "#C0392B";

  // Left wing
  ctx.beginPath();
  ctx.moveTo(centerX - 5, centerY);
  ctx.lineTo(centerX - player.width * 0.4, centerY - wingFlap);
  ctx.lineTo(centerX - player.width * 0.3, centerY + 5);
  ctx.closePath();
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(centerX + 5, centerY);
  ctx.lineTo(centerX + player.width * 0.4, centerY - wingFlap);
  ctx.lineTo(centerX + player.width * 0.3, centerY + 5);
  ctx.closePath();
  ctx.fill();

  // Beak
  ctx.fillStyle = "#F39C12";
  ctx.beginPath();
  ctx.moveTo(centerX + player.width * 0.3, centerY);
  ctx.lineTo(centerX + player.width * 0.5, centerY - 3);
  ctx.lineTo(centerX + player.width * 0.5, centerY + 3);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(centerX + player.width * 0.15, centerY - 5, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(centerX + player.width * 0.15, centerY - 5, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawDistanceMarkers(state: GameState, width: number): void {
  // Draw distance every 100 units
  const markerInterval = 100;
  const startMarker = Math.floor(state.cameraX / markerInterval) * markerInterval;

  for (let i = 0; i < 10; i++) {
    const markerPos = startMarker + i * markerInterval;
    const screenX = markerPos - state.cameraX;

    if (screenX >= -50 && screenX <= width + 50) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, state.groundY - 20);
      ctx.lineTo(screenX, state.groundY);
      ctx.stroke();
    }
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  distanceDisplay.textContent = state.distance.toString() + "m";
  energyDisplay.textContent = Math.floor(state.player.energy).toString();
  highscoreDisplay.textContent = state.highScore.toString();

  // Update energy bar
  const energyPercent = (state.player.energy / 100) * 100;
  energyBar.style.width = energyPercent + "%";

  if (energyPercent > 50) {
    energyBar.style.background = "#2ecc71";
  } else if (energyPercent > 20) {
    energyBar.style.background = "#f39c12";
  } else {
    energyBar.style.background = "#e74c3c";
  }

  // Update form display
  formDisplay.textContent = i18n.t(`game.form.${state.player.form}`);

  // Update form buttons
  formButtons.forEach((btn) => {
    const form = btn.getAttribute("data-form");
    if (form === state.player.form) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function showGameOverOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `${i18n.t("game.distance")}: ${state.distance}m`;
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
