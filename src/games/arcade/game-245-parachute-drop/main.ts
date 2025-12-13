/**
 * Parachute Drop Main Entry
 * Game #245
 */
import { ParachuteDropGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const altitudeDisplay = document.getElementById("altitude-display")!;
const highDisplay = document.getElementById("high-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: ParachuteDropGame;

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
  game = new ParachuteDropGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    altitudeDisplay.textContent = state.altitude.toString();
    highDisplay.textContent = state.highScore.toString();

    if (state.status === "landed") {
      showLanded(state.score);
    } else if (state.status === "crashed") {
      showCrashed(state.score);
    }
  });

  // Mobile controls
  btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(true); });
  btnLeft.addEventListener("touchend", () => game.moveLeft(false));
  btnLeft.addEventListener("mousedown", () => game.moveLeft(true));
  btnLeft.addEventListener("mouseup", () => game.moveLeft(false));

  btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(true); });
  btnRight.addEventListener("touchend", () => game.moveRight(false));
  btnRight.addEventListener("mousedown", () => game.moveRight(true));
  btnRight.addEventListener("mouseup", () => game.moveRight(false));

  window.addEventListener("resize", () => game.resize());
}

function showLanded(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.landed");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function showCrashed(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.crashed");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
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
