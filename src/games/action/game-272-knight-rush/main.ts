/**
 * Knight Rush Main Entry
 * Game #272
 */
import { KnightGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const healthDisplay = document.getElementById("health-display")!;
const distanceDisplay = document.getElementById("distance-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnUp = document.getElementById("btn-up")!;
const btnDown = document.getElementById("btn-down")!;
const btnAttack = document.getElementById("btn-attack")!;

let game: KnightGame;

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
  game = new KnightGame(canvas);
  game.resize();

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        e.preventDefault();
        game.moveUp();
        break;
      case "ArrowDown":
      case "s":
      case "S":
        e.preventDefault();
        game.moveDown();
        break;
      case " ":
        e.preventDefault();
        game.attack();
        break;
    }
  });

  btnUp.addEventListener("click", () => game.moveUp());
  btnDown.addEventListener("click", () => game.moveDown());
  btnAttack.addEventListener("click", () => game.attack());

  btnUp.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveUp(); });
  btnDown.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveDown(); });
  btnAttack.addEventListener("touchstart", (e) => { e.preventDefault(); game.attack(); });

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    healthDisplay.textContent = state.health.toString();
    distanceDisplay.textContent = `${state.distance}m`;

    if (state.status === "over") {
      showGameOver(state.score, state.distance);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number, distance: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score} | Distance: ${distance}m`;
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
