/**
 * Tap Master Main Entry
 * Game #345
 */
import { TapMasterGame, GameState, Target } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: TapMasterGame;
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

  game = new TapMasterGame();
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
    for (let i = 0; i < e.touches.length; i++) {
      const touchX = (e.touches[i].clientX - rect.left) * (canvas.width / rect.width);
      const touchY = (e.touches[i].clientY - rect.top) * (canvas.height / rect.height);
      game.tap(touchX, touchY);
    }
  });

  // Mouse controls
  canvas.addEventListener("click", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.tap(mouseX, mouseY);
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
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(1, "#16213e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw targets
  for (const target of state.targets) {
    drawTarget(target);
  }

  // Draw combo effect
  if (state.combo >= 5) {
    ctx.fillStyle = "#e74c3c";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${state.combo}x COMBO!`, width / 2, 50);
  }

  // Draw time bar
  drawTimeBar(state, width);
}

function drawTarget(target: Target): void {
  const now = Date.now();
  const age = now - target.createdAt;
  const lifePercent = 1 - age / target.lifetime;

  // Fade and shrink as lifetime expires
  const scale = 0.8 + lifePercent * 0.2;
  const alpha = 0.5 + lifePercent * 0.5;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(target.x, target.y);
  ctx.scale(scale, scale);

  if (target.type === "danger") {
    // Danger target (skull)
    ctx.fillStyle = "#c0392b";
    ctx.shadowColor = "#c0392b";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, target.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Skull face
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-target.radius * 0.25, -target.radius * 0.2, target.radius * 0.15, 0, Math.PI * 2);
    ctx.arc(target.radius * 0.25, -target.radius * 0.2, target.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-target.radius * 0.3, target.radius * 0.3);
    ctx.lineTo(target.radius * 0.3, target.radius * 0.3);
    ctx.stroke();

    // Teeth
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * target.radius * 0.12, target.radius * 0.3);
      ctx.lineTo(i * target.radius * 0.12, target.radius * 0.45);
      ctx.stroke();
    }
  } else if (target.type === "bonus") {
    // Bonus target (star)
    ctx.fillStyle = "#f1c40f";
    ctx.shadowColor = "#f1c40f";
    ctx.shadowBlur = 20;

    drawStar(0, 0, target.radius, target.radius * 0.5, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    // Normal target
    ctx.fillStyle = target.color;
    ctx.shadowColor = target.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, target.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner ring
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(0, 0, target.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Center
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(0, 0, target.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lifetime indicator ring
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, target.radius + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifePercent);
  ctx.stroke();

  ctx.restore();
}

function drawStar(cx: number, cy: number, outerRadius: number, innerRadius: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

function drawTimeBar(state: GameState, width: number): void {
  const barHeight = 6;
  const timePercent = state.timeLeft / 30000;

  // Background
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fillRect(0, 0, width, barHeight);

  // Progress
  const color = timePercent > 0.3 ? "#2ecc71" : timePercent > 0.1 ? "#f1c40f" : "#e74c3c";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width * timePercent, barHeight);
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  timeDisplay.textContent = Math.ceil(state.timeLeft / 1000).toString();
  comboDisplay.textContent = state.combo.toString();
  highscoreDisplay.textContent = state.highScore.toString();
}

function showGameOverOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");

  const accuracy = state.taps > 0 ? Math.round((state.hits / state.taps) * 100) : 0;
  overlayMsg.textContent = `${i18n.t("game.accuracy")}: ${accuracy}% | Max Combo: ${state.maxCombo}`;

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
