/**
 * The Creator Main Entry
 * Game #356
 */
import { CreatorGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const energyDisplay = document.getElementById("energy-display")!;
const creationsDisplay = document.getElementById("creations-display")!;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnCreate1 = document.getElementById("btn-create1")!;
const btnCreate2 = document.getElementById("btn-create2")!;
const btnCreate3 = document.getElementById("btn-create3")!;

let game: CreatorGame;

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
  game = new CreatorGame(canvas);
  game.resize();

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        game.setKey("left", true);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        game.setKey("right", true);
        break;
      case "1":
        e.preventDefault();
        game.create(1);
        break;
      case "2":
        e.preventDefault();
        game.create(2);
        break;
      case "3":
        e.preventDefault();
        game.create(3);
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        game.setKey("left", false);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        game.setKey("right", false);
        break;
    }
  });

  // Mobile controls
  btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); game.setKey("left", true); });
  btnLeft.addEventListener("touchend", () => game.setKey("left", false));
  btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); game.setKey("right", true); });
  btnRight.addEventListener("touchend", () => game.setKey("right", false));

  btnCreate1.addEventListener("click", () => game.create(1));
  btnCreate2.addEventListener("click", () => game.create(2));
  btnCreate3.addEventListener("click", () => game.create(3));

  // Mouse fallback
  btnLeft.addEventListener("mousedown", () => game.setKey("left", true));
  btnLeft.addEventListener("mouseup", () => game.setKey("left", false));
  btnLeft.addEventListener("mouseleave", () => game.setKey("left", false));
  btnRight.addEventListener("mousedown", () => game.setKey("right", true));
  btnRight.addEventListener("mouseup", () => game.setKey("right", false));
  btnRight.addEventListener("mouseleave", () => game.setKey("right", false));

  game.setOnStateChange((state) => {
    energyDisplay.textContent = state.energy.toString();
    creationsDisplay.textContent = state.creations.toString();
    scoreDisplay.textContent = state.score.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    }
  });

  window.addEventListener("resize", () => game.resize());
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
