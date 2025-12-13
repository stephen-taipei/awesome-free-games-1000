/**
 * Extreme Balance Main Entry
 * Game #268
 */
import { BalanceGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highDisplay = document.getElementById("high-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: BalanceGame;

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
  game = new BalanceGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        game.setTiltLeft(true);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        game.setTiltRight(true);
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        game.setTiltLeft(false);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        game.setTiltRight(false);
        break;
    }
  });

  // Mobile controls
  btnLeft.addEventListener("mousedown", () => game.setTiltLeft(true));
  btnLeft.addEventListener("mouseup", () => game.setTiltLeft(false));
  btnLeft.addEventListener("mouseleave", () => game.setTiltLeft(false));
  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.setTiltLeft(true);
  });
  btnLeft.addEventListener("touchend", () => game.setTiltLeft(false));

  btnRight.addEventListener("mousedown", () => game.setTiltRight(true));
  btnRight.addEventListener("mouseup", () => game.setTiltRight(false));
  btnRight.addEventListener("mouseleave", () => game.setTiltRight(false));
  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.setTiltRight(true);
  });
  btnRight.addEventListener("touchend", () => game.setTiltRight(false));

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();
    timeDisplay.textContent = `${state.time}s`;

    if (state.status === "over") {
      showGameOver(state.score, state.time);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number, time: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score} | Time: ${time}s`;
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
