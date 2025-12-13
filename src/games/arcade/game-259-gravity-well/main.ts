/**
 * Gravity Well Main Entry
 * Game #259
 */
import { GravityWellGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const collectedDisplay = document.getElementById("collected-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: GravityWellGame;

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
  game = new GravityWellGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    collectedDisplay.textContent = `${state.collected}/${state.total}`;

    if (state.status === "over") {
      showGameOver(state.score, state.collected, state.total);
    } else if (state.status === "victory") {
      showVictory(state.score, state.collected, state.total);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number, collected: number, total: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Collected: ${collected}/${total} | Score: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function showVictory(score: number, collected: number, total: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.victory");
    overlayMsg.textContent = `Collected: ${collected}/${total} | Score: ${score}`;
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
