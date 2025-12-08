/**
 * Sliding Puzzle Main Entry
 * Game #017
 */
import { SlidingPuzzleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const container = document.getElementById("grid-container") as HTMLElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const imageBtn = document.getElementById("image-btn")!; // Image Toggle
const diffRadios = document.querySelectorAll('input[name="difficulty"]');

let game: SlidingPuzzleGame;
let currentSize = 3;
let isImageMode = false;

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
  game = new SlidingPuzzleGame(container);

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    if (state.status === "won") {
      showWin();
    }
  });

  // Default init
  game.init(currentSize, isImageMode);
}

function startGame() {
  overlay.style.display = "none";

  // Get diff
  diffRadios.forEach((r) => {
    if ((r as HTMLInputElement).checked) {
      currentSize = parseInt((r as HTMLInputElement).value, 10);
    }
  });

  game.init(currentSize, isImageMode);
  game.start();
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.time")}: ${
      timeDisplay.textContent
    }, ${i18n.t("game.moves")}: ${moveDisplay.textContent}`;
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  overlayMsg.textContent = i18n.t("game.desc");
  startBtn.onclick = startGame;
});

imageBtn.addEventListener("click", () => {
  isImageMode = !isImageMode;
  game.toggleMode();
});

// Init
initI18n();
initGame();
