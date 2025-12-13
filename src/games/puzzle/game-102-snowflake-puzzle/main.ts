/**
 * Snowflake Puzzle Main Entry
 * Game #102
 */
import { SnowflakeGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const branchesDisplay = document.getElementById("branches-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const rotateBtn = document.getElementById("rotate-btn")!;
const clearBtn = document.getElementById("clear-btn")!;

let game: SnowflakeGame;

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

  game = new SnowflakeGame();

  game.onStateChange = (state: GameState) => {
    render(state);
    updateUI(state);

    if (state.status === "won") {
      setTimeout(() => showWinOverlay(), 500);
    }
  };

  canvas.addEventListener("click", handleCanvasClick);

  window.addEventListener("resize", () => {
    resizeCanvas();
    render(game.getState());
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  canvas.width = size;
  canvas.height = size;
}

function handleCanvasClick(e: MouseEvent): void {
  if (game.getState().status !== "playing") return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left - canvas.width / 2;
  const y = e.clientY - rect.top - canvas.height / 2;

  const state = game.getState();
  const centerRadius = 20;
  const layerHeight = (canvas.width / 2 - centerRadius - 20) / state.layers;

  // Calculate polar coordinates
  const dist = Math.sqrt(x * x + y * y);
  let angle = Math.atan2(y, x);
  if (angle < 0) angle += Math.PI * 2;

  // Determine which layer
  const layer = Math.floor((dist - centerRadius) / layerHeight);
  if (layer < 0 || layer >= state.layers) return;

  // Determine which branch segment we're in
  const branchAngle = (Math.PI * 2) / state.branches;
  const branchIndex = Math.floor(angle / branchAngle);
  const angleInBranch = angle - branchIndex * branchAngle;

  // Only process clicks in the first half of each branch (the "main" cells)
  // The second half is mirrored
  const halfAngle = branchAngle / 2;
  const cellsInLayer = layer + 1;
  const cellAngle = halfAngle / cellsInLayer;

  let cellIndex: number;
  if (angleInBranch < halfAngle) {
    cellIndex = Math.floor(angleInBranch / cellAngle);
  } else {
    // Mirror side
    const mirrorAngle = branchAngle - angleInBranch;
    cellIndex = Math.floor(mirrorAngle / cellAngle);
  }

  if (cellIndex >= 0 && cellIndex <= layer) {
    game.toggleCell(layer, cellIndex);
  }
}

function render(state: GameState): void {
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(cx, cy) - 20;
  const centerRadius = 20;
  const layerHeight = (maxRadius - centerRadius) / state.layers;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Draw background circle
  ctx.beginPath();
  ctx.arc(cx, cy, maxRadius + 10, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(26, 47, 78, 0.5)";
  ctx.fill();

  // Draw center
  ctx.beginPath();
  ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#e8f4fc";
  ctx.shadowColor = "#87ceeb";
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw branch lines
  const branchAngle = (Math.PI * 2) / state.branches;
  ctx.strokeStyle = "rgba(135, 206, 235, 0.3)";
  ctx.lineWidth = 1;

  for (let b = 0; b < state.branches; b++) {
    const angle = b * branchAngle - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(angle) * maxRadius,
      cy + Math.sin(angle) * maxRadius
    );
    ctx.stroke();
  }

  // Draw cells for each branch
  for (let b = 0; b < state.branches; b++) {
    const baseAngle = b * branchAngle - Math.PI / 2;

    for (let layer = 0; layer < state.layers; layer++) {
      const innerR = centerRadius + layer * layerHeight;
      const outerR = innerR + layerHeight;
      const cellsInLayer = layer + 1;
      const halfAngle = branchAngle / 2;
      const cellAngle = halfAngle / cellsInLayer;

      for (let i = 0; i <= layer; i++) {
        const isActive = state.pattern[layer][i];
        const isTarget = state.target[layer][i];

        // Draw on both sides (mirror)
        for (let mirror = 0; mirror < 2; mirror++) {
          let startAngle, endAngle;

          if (mirror === 0) {
            startAngle = baseAngle + i * cellAngle;
            endAngle = baseAngle + (i + 1) * cellAngle;
          } else {
            startAngle = baseAngle + branchAngle - (i + 1) * cellAngle;
            endAngle = baseAngle + branchAngle - i * cellAngle;
          }

          ctx.beginPath();
          ctx.arc(cx, cy, outerR, startAngle, endAngle);
          ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
          ctx.closePath();

          if (isActive) {
            ctx.fillStyle = "#b8d4e8";
            ctx.shadowColor = "#87ceeb";
            ctx.shadowBlur = 10;
          } else {
            ctx.fillStyle = "rgba(26, 47, 78, 0.5)";
            ctx.shadowBlur = 0;
          }

          ctx.fill();
          ctx.shadowBlur = 0;

          // Draw border
          ctx.strokeStyle = isTarget
            ? "rgba(135, 206, 235, 0.8)"
            : "rgba(135, 206, 235, 0.3)";
          ctx.lineWidth = isTarget ? 2 : 1;
          ctx.stroke();
        }
      }
    }
  }

  // Draw target preview (small, in corner)
  drawTargetPreview(state, 60, 60, 50);
}

function drawTargetPreview(
  state: GameState,
  x: number,
  y: number,
  size: number
): void {
  const maxR = size / 2 - 5;
  const centerR = 5;
  const layerH = (maxR - centerR) / state.layers;
  const branchAngle = (Math.PI * 2) / state.branches;

  // Background
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(26, 47, 78, 0.9)";
  ctx.fill();
  ctx.strokeStyle = "#87ceeb";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw target pattern
  for (let b = 0; b < state.branches; b++) {
    const baseAngle = b * branchAngle - Math.PI / 2;

    for (let layer = 0; layer < state.layers; layer++) {
      const innerR = centerR + layer * layerH;
      const outerR = innerR + layerH;
      const cellsInLayer = layer + 1;
      const halfAngle = branchAngle / 2;
      const cellAngle = halfAngle / cellsInLayer;

      for (let i = 0; i <= layer; i++) {
        if (!state.target[layer][i]) continue;

        for (let mirror = 0; mirror < 2; mirror++) {
          let startAngle, endAngle;

          if (mirror === 0) {
            startAngle = baseAngle + i * cellAngle;
            endAngle = baseAngle + (i + 1) * cellAngle;
          } else {
            startAngle = baseAngle + branchAngle - (i + 1) * cellAngle;
            endAngle = baseAngle + branchAngle - i * cellAngle;
          }

          ctx.beginPath();
          ctx.arc(x, y, outerR, startAngle, endAngle);
          ctx.arc(x, y, innerR, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fillStyle = "#87ceeb";
          ctx.fill();
        }
      }
    }
  }

  // Label
  ctx.fillStyle = "#e8f4fc";
  ctx.font = "10px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Target", x, y + size / 2 + 12);
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  branchesDisplay.textContent = state.branches.toString();
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.level")} ${state.level} ${i18n.t("game.win")}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
  }
}

function startGame(level: number = 1): void {
  overlay.style.display = "none";
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => game.reset());
rotateBtn.addEventListener("click", () => game.rotate());
clearBtn.addEventListener("click", () => game.clear());

// Initialize
initI18n();
initGame();
