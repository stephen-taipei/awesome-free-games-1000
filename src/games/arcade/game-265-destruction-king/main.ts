/**
 * Destruction King Main Entry
 * Game #265
 */
import { DestructionKingGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const shotsDisplay = document.getElementById("shots-display")!;
const levelDisplay = document.getElementById("level-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: DestructionKingGame;

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
  game = new DestructionKingGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    shotsDisplay.textContent = state.shotsLeft.toString();
    levelDisplay.textContent = state.level.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    } else if (state.status === "complete") {
      showLevelComplete(state.score);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = startGame;
  }, 500);
}

function showLevelComplete(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = `Score: ${score}`;
    startBtn.textContent = i18n.t("game.next");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  startBtn.onclick = startGame;
  game.start();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
