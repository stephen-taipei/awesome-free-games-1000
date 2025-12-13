/**
 * Rhythm Tap Main Entry
 * Game #336
 */
import { RhythmTapGame, GameState, Note } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const perfectDisplay = document.getElementById("perfect-display")!;
const missDisplay = document.getElementById("miss-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const finalScoreDisplay = document.getElementById("final-score")!;
const startBtn = document.getElementById("start-btn")!;

let game: RhythmTapGame;
let animationFrame: number | null = null;
let gameLoop: number | null = null;

const LANE_COLORS = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#95e1d3"];

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

  game = new RhythmTapGame();
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
      const touchX = e.touches[i].clientX - rect.left;
      const lane = Math.floor((touchX / rect.width) * game.getLaneCount());
      game.tapLane(lane);
    }
  });

  // Mouse controls
  canvas.addEventListener("mousedown", (e) => {
    if (game.getState().phase !== "playing") return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const lane = Math.floor((clickX / rect.width) * game.getLaneCount());
    game.tapLane(lane);
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (game.getState().phase !== "playing") return;

    const keyMap: { [key: string]: number } = {
      d: 0,
      f: 1,
      j: 2,
      k: 3,
    };

    if (e.key in keyMap) {
      game.tapLane(keyMap[e.key]);
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
  const laneWidth = width / game.getLaneCount();

  // Background
  ctx.fillStyle = "#0f0f23";
  ctx.fillRect(0, 0, width, height);

  // Draw lanes
  for (let i = 0; i < game.getLaneCount(); i++) {
    const x = i * laneWidth;

    // Lane background
    ctx.fillStyle = `rgba(${hexToRgb(LANE_COLORS[i])}, 0.1)`;
    ctx.fillRect(x, 0, laneWidth, height);

    // Lane separator
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Draw hit zone
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(0, state.hitZoneY - 30, width, 60);

  // Draw hit line
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, state.hitZoneY);
  ctx.lineTo(width, state.hitZoneY);
  ctx.stroke();

  // Draw notes
  for (const note of state.notes) {
    if (!note.hit && !note.missed) {
      drawNote(note, laneWidth);
    }
  }

  // Draw combo
  if (state.combo >= 5) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${state.combo} COMBO!`, width / 2, 60);
  }
}

function drawNote(note: Note, laneWidth: number): void {
  const x = note.lane * laneWidth + laneWidth / 2;
  const noteWidth = laneWidth * 0.7;
  const noteHeight = 25;

  ctx.fillStyle = LANE_COLORS[note.lane];
  ctx.beginPath();
  ctx.roundRect(x - noteWidth / 2, note.y - noteHeight / 2, noteWidth, noteHeight, 8);
  ctx.fill();

  // Glow effect
  ctx.shadowColor = LANE_COLORS[note.lane];
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "255, 255, 255";
}

function updateUI(state: GameState): void {
  scoreDisplay.textContent = state.score.toString();
  comboDisplay.textContent = state.combo.toString();
  perfectDisplay.textContent = state.perfect.toString();
  missDisplay.textContent = state.miss.toString();
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
