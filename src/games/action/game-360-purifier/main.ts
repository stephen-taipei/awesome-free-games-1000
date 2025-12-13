/**
 * Purifier Main Entry
 * Game #360
 */
import { PurifierGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const lightDisplay = document.getElementById("light-display")!;
const purifiedDisplay = document.getElementById("purified-display")!;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnBurst = document.getElementById("btn-burst")!;

let game: PurifierGame;

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
  game = new PurifierGame(canvas);
  game.resize();

  // Mouse controls
  canvas.addEventListener("mousemove", (e) => {
    game.setMouse(e.clientX, e.clientY);
  });

  canvas.addEventListener("click", () => {
    game.burst();
  });

  // Touch controls
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    game.setMouse(touch.clientX, touch.clientY);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    game.setMouse(touch.clientX, touch.clientY);
  });

  // Mobile button
  btnBurst.addEventListener("click", () => game.burst());

  game.setOnStateChange((state) => {
    lightDisplay.textContent = state.light.toString();
    purifiedDisplay.textContent = state.purified.toString();
    scoreDisplay.textContent = state.score.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    }
  });

  window.addEventListener("resize", () => game.resize());

  canvas.style.cursor = "none";
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
initI18n();
initGame();
