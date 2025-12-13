/**
 * Arrow Storm Main Entry
 * Game #340
 */
import { ArrowStormGame, GameState, Arrow, Enemy } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const waveDisplay = document.getElementById("wave-display")!;
const arrowsDisplay = document.getElementById("arrows-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: ArrowStormGame;
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

  game = new ArrowStormGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "gameOver") {
      showGameOverOverlay(state);
    }
  };

  // Touch/Mouse controls for aiming and shooting
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const touchY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);

    game.aim(touchX, touchY);
    game.shoot();
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const touchY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);

    game.aim(touchX, touchY);
  });

  canvas.addEventListener("mousedown", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    game.aim(mouseX, mouseY);
    game.shoot();
  });

  canvas.addEventListener("mousemove", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    game.aim(mouseX, mouseY);
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    if (e.key === " ") {
      game.shoot();
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

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2d3436");
  gradient.addColorStop(1, "#1e272e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Ground
  ctx.fillStyle = "#636e72";
  ctx.fillRect(0, height - 40, width, 40);

  // Draw enemies
  for (const enemy of state.enemies) {
    drawEnemy(enemy);
  }

  // Draw arrows
  for (const arrow of state.arrows) {
    if (arrow.active) {
      drawArrow(arrow);
    }
  }

  // Draw player
  drawPlayer(state);
}

function drawEnemy(enemy: Enemy): void {
  let color: string;
  switch (enemy.type) {
    case "fast":
      color = "#e17055";
      break;
    case "tank":
      color = "#6c5ce7";
      break;
    default:
      color = "#d63031";
  }

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Health indicator for tanks
  if (enemy.type === "tank" && enemy.health > 1) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(enemy.health.toString(), enemy.x, enemy.y);
  }

  // Eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(enemy.x - enemy.radius * 0.3, enemy.y - enemy.radius * 0.2, 3, 0, Math.PI * 2);
  ctx.arc(enemy.x + enemy.radius * 0.3, enemy.y - enemy.radius * 0.2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawArrow(arrow: Arrow): void {
  ctx.save();
  ctx.translate(arrow.x, arrow.y);

  const angle = Math.atan2(arrow.vy, arrow.vx);
  ctx.rotate(angle);

  // Arrow shaft
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(-20, -2, 25, 4);

  // Arrow head
  ctx.fillStyle = "#fdcb6e";
  ctx.beginPath();
  ctx.moveTo(5, -5);
  ctx.lineTo(15, 0);
  ctx.lineTo(5, 5);
  ctx.closePath();
  ctx.fill();

  // Fletching
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(-20, -2);
  ctx.lineTo(-25, -6);
  ctx.lineTo(-18, -2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.lineTo(-25, 6);
  ctx.lineTo(-18, 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPlayer(state: GameState): void {
  const { player } = state;

  // Bow
  ctx.strokeStyle = "#8b4513";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 25, player.angle - Math.PI / 3, player.angle + Math.PI / 3);
  ctx.stroke();

  // Bow string
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const startX = player.x + Math.cos(player.angle - Math.PI / 3) * 25;
  const startY = player.y + Math.sin(player.angle - Math.PI / 3) * 25;
  const endX = player.x + Math.cos(player.angle + Math.PI / 3) * 25;
  const endY = player.y + Math.sin(player.angle + Math.PI / 3) * 25;
  ctx.moveTo(startX, startY);
  ctx.lineTo(player.x, player.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Archer body
  ctx.fillStyle = "#00b894";
  ctx.beginPath();
  ctx.arc(player.x, player.y + 10, 15, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#ffeaa7";
  ctx.beginPath();
  ctx.arc(player.x, player.y - 10, 12, 0, Math.PI * 2);
  ctx.fill();

  // Aim line
  ctx.strokeStyle = "rgba(253, 203, 110, 0.5)";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 20);
  ctx.lineTo(
    player.x + Math.cos(player.angle) * 100,
    player.y - 20 + Math.sin(player.angle) * 100
  );
  ctx.stroke();
  ctx.setLineDash([]);
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  waveDisplay.textContent = state.wave.toString();
  arrowsDisplay.textContent = state.player.arrows.toString();
  livesDisplay.textContent = state.lives.toString();
}

function showGameOverOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `${i18n.t("game.wave")}: ${state.wave}`;
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
