/**
 * Digger Main Entry
 * Game #182
 */
import { DiggerGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const depthDisplay = document.getElementById("depth-display")!;
const fuelDisplay = document.getElementById("fuel-display")!;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: DiggerGame;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-Hant")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.includes("zh")) {
    i18n.setLocale("zh-CN");
  } else if (browserLang.includes("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.includes("ko")) {
    i18n.setLocale("ko");
  } else {
    i18n.setLocale("en");
  }

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
  game = new DiggerGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    depthDisplay.textContent = `${state.depth}m`;
    fuelDisplay.textContent = `${state.fuel}%`;
    scoreDisplay.textContent = state.score.toString();

    if (state.status === "gameOver") {
      showGameOver();
    }
  });

  window.addEventListener("resize", () => game.resize());
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "W", "a", "A", "s", "S", "d", "D"].includes(e.key)) {
      e.preventDefault();
      game.handleKey(e.key);
    }
  });
}

function showGameOver() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameOver");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${scoreDisplay.textContent}`;
    startBtn.textContent = i18n.t("game.start");
    startBtn.style.display = "inline-block";
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());

initI18n();
initGame();
