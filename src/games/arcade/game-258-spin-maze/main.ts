/**
 * Spin Maze Main Entry
 * Game #258
 */
import { SpinMazeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

// Mobile controls
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: SpinMazeGame;

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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function initGame() {
  game = new SpinMazeGame(canvas);
  game.resize();

  // Mobile controls
  btnLeft.addEventListener("mousedown", () => game.setRotationInput(-1));
  btnLeft.addEventListener("mouseup", () => game.setRotationInput(0));
  btnLeft.addEventListener("mouseleave", () => game.setRotationInput(0));
  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.setRotationInput(-1);
  });
  btnLeft.addEventListener("touchend", () => game.setRotationInput(0));

  btnRight.addEventListener("mousedown", () => game.setRotationInput(1));
  btnRight.addEventListener("mouseup", () => game.setRotationInput(0));
  btnRight.addEventListener("mouseleave", () => game.setRotationInput(0));
  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.setRotationInput(1);
  });
  btnRight.addEventListener("touchend", () => game.setRotationInput(0));

  game.setOnStateChange((state) => {
    levelDisplay.textContent = state.level.toString();
    timeDisplay.textContent = formatTime(state.time);

    if (state.status === "complete") {
      showLevelComplete();
    } else if (state.status === "victory") {
      showVictory();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showLevelComplete() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.next");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
  }, 300);
}

function showVictory() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.victory");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = startGame;
  }, 300);
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
