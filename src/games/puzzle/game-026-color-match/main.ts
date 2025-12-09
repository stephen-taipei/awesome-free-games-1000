/**
 * Color Match Main Entry
 * Game #026
 */
import { ColorMatchGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const yesBtn = document.getElementById("yes-btn")!;
const noBtn = document.getElementById("no-btn")!;

let game: ColorMatchGame;

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
    game.draw(); // Redraw text in new language
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new ColorMatchGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    timeDisplay.textContent = state.time.toString();

    if (state.status === "gameover") {
      showGameOver();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver() {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${
    scoreDisplay.textContent
  }`;
  startBtn.textContent = i18n.t("game.start");

  startBtn.onclick = () => {
    startGame();
  };
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);

yesBtn.addEventListener("click", () => game.answer(true));
noBtn.addEventListener("click", () => game.answer(false));

// Keyboard
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") game.answer(false); // No on left usually?
  if (e.key === "ArrowRight") game.answer(true);
});

// Init
initI18n();
initGame();
