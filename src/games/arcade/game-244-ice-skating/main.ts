/**
 * Ice Skating Main Entry
 * Game #244
 */
import { IceSkatingGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const speedDisplay = document.getElementById("speed-display")!;
const highDisplay = document.getElementById("high-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: IceSkatingGame;

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
  game = new IceSkatingGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    speedDisplay.textContent = state.speed.toString();
    highDisplay.textContent = state.highScore.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    }
  });

  // Mobile controls
  btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); game.turnLeft(true); });
  btnLeft.addEventListener("touchend", () => game.turnLeft(false));
  btnLeft.addEventListener("mousedown", () => game.turnLeft(true));
  btnLeft.addEventListener("mouseup", () => game.turnLeft(false));

  btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); game.turnRight(true); });
  btnRight.addEventListener("touchend", () => game.turnRight(false));
  btnRight.addEventListener("mousedown", () => game.turnRight(true));
  btnRight.addEventListener("mouseup", () => game.turnRight(false));

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score}`;
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
