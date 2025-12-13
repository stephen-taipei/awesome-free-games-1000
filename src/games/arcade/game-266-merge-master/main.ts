/**
 * Merge Master Main Entry
 * Game #266
 */
import { MergeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highDisplay = document.getElementById("high-display")!;
const levelDisplay = document.getElementById("level-display")!;
const nextPreview = document.getElementById("next-preview")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: MergeGame;

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
  game = new MergeGame(canvas);
  game.resize();

  // Mouse/Touch controls
  let isDragging = false;

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    game.setDropX(x);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      game.setDropX(x);
    }
  });

  canvas.addEventListener("mouseup", () => {
    if (isDragging) {
      game.drop();
      updateNextPreview();
    }
    isDragging = false;
  });

  canvas.addEventListener("mouseleave", () => {
    isDragging = false;
  });

  // Touch events
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    game.setDropX(x);
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (isDragging) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      game.setDropX(x);
    }
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (isDragging) {
      game.drop();
      updateNextPreview();
    }
    isDragging = false;
  });

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();
    levelDisplay.textContent = state.maxLevel.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function updateNextPreview() {
  nextPreview.textContent = game.getNextEmoji();
  nextPreview.style.background = game.getNextColor();
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  updateNextPreview();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
