/**
 * Pipe Burst Main Entry
 * Game #255
 */
import { PipeBurstGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highDisplay = document.getElementById("high-display")!;
const fixedDisplay = document.getElementById("fixed-display")!;
const waterDisplay = document.getElementById("water-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: PipeBurstGame;

function initI18n() {
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

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new PipeBurstGame(canvas);
  game.resize();

  // Mouse controls
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handlePointerDown(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener("mouseup", () => {
    game.handlePointerUp();
  });

  canvas.addEventListener("mouseleave", () => {
    game.handlePointerUp();
  });

  // Touch controls
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    game.handlePointerDown(touch.clientX - rect.left, touch.clientY - rect.top);
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.handlePointerUp();
  });

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();
    fixedDisplay.textContent = state.fixed.toString();
    waterDisplay.textContent = `${state.waterLevel}%`;

    if (state.status === "over") {
      showGameOver(state.score, state.fixed);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number, fixed: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score} | ${i18n.t("game.fixed")}: ${fixed}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
