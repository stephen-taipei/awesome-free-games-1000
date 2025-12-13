/**
 * Countdown Boom Main Entry
 * Game #211
 */
import { CountdownBoomGame, GameState, Wire, WireColor } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const bombsDisplay = document.getElementById("bombs-display")!;
const levelDisplay = document.getElementById("level-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;
const resultIndicator = document.getElementById("result-indicator")!;

let game: CountdownBoomGame;
let animationFrame: number | null = null;

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

  game = new CountdownBoomGame();

  game.onStateChange = (state: GameState) => {
    updateUI(state);
    showResult(state.status);

    if (state.status === "gameOver") {
      showGameOverOverlay(state.score);
    }
  };

  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("touchend", handleTouch, { passive: false });

  window.addEventListener("resize", resizeCanvas);

  startRenderLoop();
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 450;
}

function getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function getWireAt(x: number, y: number): WireColor | null {
  const state = game.getState();
  if (!state.bomb) return null;

  for (const wire of state.bomb.wires) {
    if (wire.cut) continue;

    // Check if click is near the wire line
    const midY = (wire.y1 + wire.y2) / 2;
    if (y >= wire.y1 - 20 && y <= wire.y1 + 20) {
      return wire.color;
    }
  }
  return null;
}

function handleClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const { x, y } = getCanvasCoords(e);
  const wireColor = getWireAt(x, y);

  if (wireColor) {
    game.cutWire(wireColor);
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().status !== "playing") return;

  const touch = e.changedTouches[0];
  const { x, y } = getCanvasCoords(touch);
  const wireColor = getWireAt(x, y);

  if (wireColor) {
    game.cutWire(wireColor);
  }
}

function startRenderLoop(): void {
  const render = () => {
    drawGame(game.getState());
    animationFrame = requestAnimationFrame(render);
  };
  animationFrame = requestAnimationFrame(render);
}

function drawGame(state: GameState): void {
  const { width, height } = canvas;

  // Background
  ctx.fillStyle = "#0f0f23";
  ctx.fillRect(0, 0, width, height);

  if (!state.bomb) return;

  // Draw bomb body
  drawBomb(width / 2, 220, state);

  // Draw timer
  drawTimer(width / 2, 60, state.bomb.timeLeft, state.bomb.maxTime);

  // Draw hint
  drawHint(width / 2, height - 40, state.bomb.hint);

  // Draw wires
  state.bomb.wires.forEach((wire) => drawWire(wire));
}

function drawBomb(x: number, y: number, state: GameState): void {
  // Bomb body
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.roundRect(x - 140, y - 100, 280, 200, 15);
  ctx.fill();

  // Bomb details
  ctx.fillStyle = "#34495e";
  ctx.beginPath();
  ctx.roundRect(x - 120, y - 80, 240, 160, 10);
  ctx.fill();

  // Warning stripes
  ctx.fillStyle = "#f39c12";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x - 130 + i * 60, y - 100, 20, 10);
  }

  // Screen glow effect when danger
  if (state.bomb && state.bomb.timeLeft <= 3) {
    ctx.fillStyle = `rgba(231, 76, 60, ${0.3 + Math.sin(Date.now() / 100) * 0.2})`;
    ctx.beginPath();
    ctx.roundRect(x - 140, y - 100, 280, 200, 15);
    ctx.fill();
  }
}

function drawTimer(x: number, y: number, timeLeft: number, maxTime: number): void {
  // Timer background
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.roundRect(x - 80, y - 25, 160, 50, 8);
  ctx.fill();

  // Timer display
  const displayTime = Math.max(0, timeLeft).toFixed(1);
  let color = "#27ae60";
  if (timeLeft <= 3) color = "#e74c3c";
  else if (timeLeft <= 5) color = "#f39c12";

  ctx.fillStyle = color;
  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(displayTime, x, y);

  // Pulsing effect when low time
  if (timeLeft <= 3) {
    ctx.shadowColor = "#e74c3c";
    ctx.shadowBlur = 20 + Math.sin(Date.now() / 50) * 10;
    ctx.fillText(displayTime, x, y);
    ctx.shadowBlur = 0;
  }
}

function drawHint(x: number, y: number, hint: string): void {
  ctx.fillStyle = "#f39c12";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`💡 ${hint}`, x, y);
}

function drawWire(wire: Wire): void {
  const color = game.getColorHex(wire.color);

  if (wire.cut) {
    // Draw cut wire ends
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";

    // Left part
    ctx.beginPath();
    ctx.moveTo(wire.x1, wire.y1);
    ctx.lineTo(wire.x1 + 60, wire.y1 + 10);
    ctx.stroke();

    // Right part
    ctx.beginPath();
    ctx.moveTo(wire.x2, wire.y2);
    ctx.lineTo(wire.x2 - 60, wire.y2 - 10);
    ctx.stroke();

    // Sparks
    ctx.fillStyle = "#f1c40f";
    for (let i = 0; i < 3; i++) {
      const sparkX = wire.x1 + 70 + Math.random() * 20;
      const sparkY = wire.y1 + (Math.random() - 0.5) * 20;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Draw full wire with curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(wire.x1, wire.y1);
    ctx.bezierCurveTo(
      wire.x1 + 80,
      wire.y1 + 20,
      wire.x2 - 80,
      wire.y2 - 20,
      wire.x2,
      wire.y2
    );
    ctx.stroke();

    // Wire label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(wire.color.toUpperCase(), wire.x1 - 60, wire.y1 + 5);
  }
}

function showResult(status: string): void {
  if (status === "defused") {
    resultIndicator.textContent = i18n.t("game.defused");
    resultIndicator.className = "result-indicator defused show";
  } else if (status === "exploded") {
    resultIndicator.textContent = i18n.t("game.exploded");
    resultIndicator.className = "result-indicator exploded show";
  } else {
    resultIndicator.classList.remove("show");
  }
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  bombsDisplay.textContent = state.bombsDefused.toString();
  levelDisplay.textContent = state.level.toString();
  livesDisplay.textContent = "💣".repeat(state.lives);
}

function showGameOverOverlay(score: number): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = i18n.t("game.finalScore");
  finalScoreDisplay.textContent = score.toString();
  finalScoreDisplay.style.display = "block";
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  resultIndicator.classList.remove("show");
  game.start();
}

// Event listeners
startBtn.addEventListener("click", startGame);

// Cleanup
window.addEventListener("beforeunload", () => {
  game?.destroy();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Initialize
initI18n();
initGame();
