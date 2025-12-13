/**
 * Reaction Test Main Entry
 * Game #214
 */
import { ReactionTestGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const roundDisplay = document.getElementById("round-display")!;
const averageDisplay = document.getElementById("average-display")!;
const bestDisplay = document.getElementById("best-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const resultTime = document.getElementById("result-time")!;
const resultUnit = document.getElementById("result-unit")!;
const timesList = document.getElementById("times-list")!;
const startBtn = document.getElementById("start-btn")!;

let game: ReactionTestGame;
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

  game = new ReactionTestGame();

  game.onStateChange = (state: GameState) => {
    updateUI(state);

    if (state.phase === "complete") {
      showCompleteOverlay(state);
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
  canvas.height = 350;
}

function handleClick(): void {
  if (game.getState().phase === "idle" || game.getState().phase === "complete") return;
  game.click();
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  if (game.getState().phase === "idle" || game.getState().phase === "complete") return;
  game.click();
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

  // Background based on phase
  switch (state.phase) {
    case "waiting":
      ctx.fillStyle = "#e74c3c"; // Red - wait
      break;
    case "ready":
      ctx.fillStyle = "#27ae60"; // Green - click!
      break;
    case "tooSoon":
      ctx.fillStyle = "#f39c12"; // Orange - too soon
      break;
    case "clicked":
      ctx.fillStyle = "#3498db"; // Blue - showing result
      break;
    default:
      ctx.fillStyle = "#1a1a2e"; // Default dark
  }

  ctx.fillRect(0, 0, width, height);

  // Draw text based on phase
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  switch (state.phase) {
    case "idle":
      ctx.font = "bold 28px 'Segoe UI'";
      ctx.fillText(i18n.t("game.instructions"), width / 2, height / 2);
      break;

    case "waiting":
      ctx.font = "bold 48px 'Segoe UI'";
      ctx.fillText(i18n.t("game.wait"), width / 2, height / 2);
      break;

    case "ready":
      ctx.font = "bold 48px 'Segoe UI'";
      ctx.fillText(i18n.t("game.click"), width / 2, height / 2);
      break;

    case "tooSoon":
      ctx.font = "bold 36px 'Segoe UI'";
      ctx.fillText(i18n.t("game.tooSoon"), width / 2, height / 2 - 20);
      ctx.font = "20px 'Segoe UI'";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText(i18n.t("game.wait"), width / 2, height / 2 + 25);
      break;

    case "clicked":
      ctx.font = "bold 64px 'Segoe UI'";
      ctx.fillText(`${state.lastTime}`, width / 2, height / 2 - 20);
      ctx.font = "24px 'Segoe UI'";
      ctx.fillText(i18n.t("game.ms"), width / 2, height / 2 + 30);
      break;
  }

  // Draw round indicator
  if (state.phase !== "idle" && state.phase !== "complete") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "16px 'Segoe UI'";
    ctx.textAlign = "right";
    ctx.fillText(
      `${i18n.t("game.round")} ${state.round}/${state.totalRounds}`,
      width - 20,
      30
    );
  }
}

function updateUI(state: GameState): void {
  roundDisplay.textContent = state.phase === "idle" ? "-" : `${state.round}/${state.totalRounds}`;
  averageDisplay.textContent = game.getAverageTime() > 0 ? `${game.getAverageTime()}` : "-";
  bestDisplay.textContent = game.getBestTime() > 0 ? `${game.getBestTime()}` : "-";
}

function showCompleteOverlay(state: GameState): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.testComplete");
  overlayMsg.textContent = i18n.t("game.result");

  const avg = game.getAverageTime();
  resultTime.textContent = avg.toString();
  resultTime.style.display = "block";
  resultUnit.textContent = i18n.t("game.ms");
  resultUnit.style.display = "block";

  // Show all times
  timesList.innerHTML = "";
  state.times.forEach((time, idx) => {
    const badge = document.createElement("span");
    badge.className = "time-badge";
    badge.textContent = `#${idx + 1}: ${time}${i18n.t("game.ms")}`;
    timesList.appendChild(badge);
  });
  timesList.style.display = "flex";

  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  resultTime.style.display = "none";
  resultUnit.style.display = "none";
  timesList.style.display = "none";
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
