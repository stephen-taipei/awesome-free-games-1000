/**
 * Cannon Fire Main Entry
 * Game #222
 */
import { CannonFireGame, GameState, Target } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const scoreDisplay = document.getElementById("score-display")!;
const shotsDisplay = document.getElementById("shots-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const fireBtn = document.getElementById("fire-btn") as HTMLButtonElement;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: CannonFireGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;
let isDragging = false;

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

  game = new CannonFireGame();
  game.setCanvasSize(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    fireBtn.style.display = state.phase === "aiming" ? "block" : "none";
    fireBtn.disabled = state.shotsLeft <= 0;

    if (state.phase === "levelComplete" || state.phase === "gameOver") {
      showResultOverlay(state);
    }
  };

  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd);

  fireBtn.addEventListener("click", () => {
    game.fire();
    startGameLoop();
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

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function handleAim(x: number, y: number): void {
  const cannon = game.getCannonPosition();
  const dx = x - cannon.x;
  const dy = y - cannon.y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const power = Math.min(100, Math.sqrt(dx * dx + dy * dy) / 2);
  game.setAim(angle, power);
}

function handleMouseDown(e: MouseEvent): void {
  if (game.getState().phase !== "aiming") return;
  isDragging = true;
  const { x, y } = getCanvasCoords(e);
  handleAim(x, y);
}

function handleMouseMove(e: MouseEvent): void {
  if (!isDragging || game.getState().phase !== "aiming") return;
  const { x, y } = getCanvasCoords(e);
  handleAim(x, y);
}

function handleMouseUp(): void {
  isDragging = false;
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase !== "aiming") return;
  isDragging = true;
  const { x, y } = getCanvasCoords(e.touches[0]);
  handleAim(x, y);
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (!isDragging || game.getState().phase !== "aiming") return;
  const { x, y } = getCanvasCoords(e.touches[0]);
  handleAim(x, y);
}

function handleTouchEnd(): void {
  isDragging = false;
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function startGameLoop(): void {
  if (gameLoop) return;
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

  // Sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#87ceeb");
  skyGradient.addColorStop(0.7, "#b0e0e6");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  drawCloud(100, 60);
  drawCloud(250, 40);
  drawCloud(350, 80);

  // Ground
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(0, height - 30, width, 30);

  // Grass
  ctx.fillStyle = "#27ae60";
  ctx.fillRect(0, height - 30, width, 8);

  // Draw targets
  for (const target of state.targets) {
    if (!target.destroyed) {
      drawTarget(target);
    }
  }

  // Draw cannon
  drawCannon(state.cannonAngle, state.cannonPower);

  // Draw trajectory preview
  if (state.phase === "aiming") {
    drawTrajectory(state.cannonAngle, state.cannonPower);
  }

  // Draw cannonball
  if (state.cannonball) {
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.arc(state.cannonball.x, state.cannonball.y, state.cannonball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Cannonball shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(state.cannonball.x - 3, state.cannonball.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCloud(x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.arc(x + 25, y - 10, 25, 0, Math.PI * 2);
  ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawCannon(angle: number, power: number): void {
  const cannon = game.getCannonPosition();

  // Cannon base
  ctx.fillStyle = "#7f8c8d";
  ctx.beginPath();
  ctx.arc(cannon.x, cannon.y, 25, 0, Math.PI * 2);
  ctx.fill();

  // Cannon barrel
  ctx.save();
  ctx.translate(cannon.x, cannon.y);
  ctx.rotate((angle * Math.PI) / 180);

  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(0, -10, 50, 20);

  // Barrel opening
  ctx.fillStyle = "#1a252f";
  ctx.beginPath();
  ctx.arc(50, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Power indicator
  const powerWidth = power * 0.6;
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(cannon.x - 30, cannon.y + 35, 60, 8);
  ctx.fillStyle = power > 70 ? "#e74c3c" : power > 40 ? "#f39c12" : "#27ae60";
  ctx.fillRect(cannon.x - 30, cannon.y + 35, powerWidth, 8);
}

function drawTrajectory(angle: number, power: number): void {
  const cannon = game.getCannonPosition();
  const radians = (angle * Math.PI) / 180;
  const speed = power * 0.15;
  const vx = Math.cos(radians) * speed;
  const vy = Math.sin(radians) * speed;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 2;
  ctx.beginPath();

  let x = cannon.x + 40;
  let y = cannon.y;
  let velY = vy;

  ctx.moveTo(x, y);

  for (let i = 0; i < 30; i++) {
    x += vx;
    velY += 0.25;
    y += velY;

    if (y > canvas.height - 30) break;

    ctx.lineTo(x, y);
  }

  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTarget(target: Target): void {
  if (target.type === "star") {
    ctx.fillStyle = "#f1c40f";
    drawStar(target.x + target.width / 2, target.y + target.height / 2, 15);
  } else if (target.type === "barrel") {
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(target.x, target.y, target.width, target.height);
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 2;
    ctx.strokeRect(target.x, target.y, target.width, target.height);

    // TNT label
    ctx.fillStyle = "white";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TNT", target.x + target.width / 2, target.y + target.height / 2);
  } else {
    ctx.fillStyle = "#cd853f";
    ctx.fillRect(target.x, target.y, target.width, target.height);
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 2;
    ctx.strokeRect(target.x, target.y, target.width, target.height);
  }
}

function drawStar(x: number, y: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);

    const innerAngle = angle + (2 * Math.PI) / 10;
    ctx.lineTo(x + Math.cos(innerAngle) * (size * 0.5), y + Math.sin(innerAngle) * (size * 0.5));
  }
  ctx.closePath();
  ctx.fill();
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  scoreDisplay.textContent = state.score.toString();
  shotsDisplay.textContent = state.shotsLeft.toString();
}

function showResultOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";

  if (state.phase === "levelComplete") {
    overlayTitle.textContent = i18n.t("game.levelComplete");
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
  } else {
    overlayTitle.textContent = i18n.t("game.gameOver");
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = startGame;
  }

  overlayMsg.textContent = "";
  finalScoreDisplay.textContent = state.score.toString();
  finalScoreDisplay.style.display = "block";
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  game.start();
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
