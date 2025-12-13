/**
 * Ninja Slice Main Entry
 * Game #343
 */
import { NinjaSliceGame, GameState, SliceableObject, SliceTrail } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: NinjaSliceGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;

const FRUIT_COLORS = ["#e74c3c", "#f39c12", "#27ae60", "#f1c40f", "#9b59b6"];

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

  game = new NinjaSliceGame();
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
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const touchY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    game.startSlice(touchX, touchY);
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    const touchY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    game.continueSlice(touchX, touchY);
  });

  canvas.addEventListener("touchend", () => {
    game.endSlice();
  });

  // Mouse controls
  canvas.addEventListener("mousedown", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.startSlice(mouseX, mouseY);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.continueSlice(mouseX, mouseY);
  });

  canvas.addEventListener("mouseup", () => {
    game.endSlice();
  });

  canvas.addEventListener("mouseleave", () => {
    game.endSlice();
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
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#16213e");
  gradient.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw slice trail
  drawSliceTrail(state.sliceTrail);

  // Draw objects
  for (const obj of state.objects) {
    drawObject(obj);
  }

  // Draw combo text
  if (state.combo >= 3) {
    ctx.fillStyle = "#f39c12";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${state.combo}x COMBO!`, width / 2, 80);
  }
}

function drawSliceTrail(trail: SliceTrail[]): void {
  if (trail.length < 2) return;

  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 1; i < trail.length; i++) {
    const prev = trail[i - 1];
    const curr = trail[i];
    const alpha = 1 - curr.age / 10;

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 4 * (1 - curr.age / 10);
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }
}

function drawObject(obj: SliceableObject): void {
  if (obj.type === "bomb") {
    drawBomb(obj);
  } else {
    drawFruit(obj);
  }
}

function drawFruit(obj: SliceableObject): void {
  const color = FRUIT_COLORS[obj.id % FRUIT_COLORS.length];

  if (obj.sliced) {
    // Draw sliced halves
    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.rotate(obj.sliceAngle || 0);

    // First half
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -5, obj.radius, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();

    // Inner
    ctx.fillStyle = lightenColor(color, 30);
    ctx.beginPath();
    ctx.arc(0, -5, obj.radius * 0.7, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();

    // Second half
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 5, obj.radius, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();

    // Inner
    ctx.fillStyle = lightenColor(color, 30);
    ctx.beginPath();
    ctx.arc(0, 5, obj.radius * 0.7, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  } else {
    // Draw whole fruit
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(obj.x - obj.radius * 0.3, obj.y - obj.radius * 0.3, obj.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Leaf
    ctx.fillStyle = "#27ae60";
    ctx.beginPath();
    ctx.ellipse(obj.x, obj.y - obj.radius, 8, 4, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBomb(obj: SliceableObject): void {
  if (obj.sliced) {
    // Explosion effect
    ctx.fillStyle = "#e74c3c";
    ctx.shadowColor = "#e74c3c";
    ctx.shadowBlur = 30;

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const dist = 20 + Math.random() * 20;
      ctx.beginPath();
      ctx.arc(
        obj.x + Math.cos(angle) * dist,
        obj.y + Math.sin(angle) * dist,
        8,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  } else {
    // Draw bomb
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
    ctx.fill();

    // Fuse
    ctx.strokeStyle = "#f39c12";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(obj.x, obj.y - obj.radius);
    ctx.bezierCurveTo(
      obj.x + 10,
      obj.y - obj.radius - 10,
      obj.x + 5,
      obj.y - obj.radius - 20,
      obj.x + 15,
      obj.y - obj.radius - 15
    );
    ctx.stroke();

    // Spark
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(obj.x + 15, obj.y - obj.radius - 15, 5, 0, Math.PI * 2);
    ctx.fill();

    // X mark
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(obj.x - 8, obj.y - 8);
    ctx.lineTo(obj.x + 8, obj.y + 8);
    ctx.moveTo(obj.x + 8, obj.y - 8);
    ctx.lineTo(obj.x - 8, obj.y + 8);
    ctx.stroke();
  }
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  comboDisplay.textContent = state.combo.toString();
  livesDisplay.textContent = state.lives.toString();
  highscoreDisplay.textContent = state.highScore.toString();
}

function showGameOverOverlay(state: GameState): void {
  stopGameLoop();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `Max Combo: ${state.maxCombo}`;
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
