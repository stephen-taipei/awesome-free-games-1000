/**
 * Maze Main Entry
 * Game #020
 */
import { MazeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const timeDisplay = document.getElementById("time-display")!;
const levelDisplay = document.getElementById("level-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const diffRadios = document.querySelectorAll('input[name="difficulty"]');

// Mobile Controls
const upBtn = document.getElementById("up-btn")!;
const downBtn = document.getElementById("down-btn")!;
const leftBtn = document.getElementById("left-btn")!;
const rightBtn = document.getElementById("right-btn")!;

let game: MazeGame;
let difficulty = 10; // Default Easy (Size 30)

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
  game = new MazeGame(canvas);

  game.setOnStateChange((state: any) => {
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    if (state.status === "won") {
      showWin();
    }
  });

  // Resize Observer
  /* window.addEventListener('resize', () => {
         // Debounce?
    }); */
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.time")}: ${
      timeDisplay.textContent
    }`;
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";

  // Get diff
  diffRadios.forEach((r) => {
    if ((r as HTMLInputElement).checked) {
      difficulty = parseInt((r as HTMLInputElement).value, 10);
    }
  });

  game.start(difficulty);
  levelDisplay.textContent = difficulty === 10 ? "Easy" : "Hard";
}

// Input Handlers
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      game.move("up");
      e.preventDefault();
      break;
    case "ArrowDown":
      game.move("down");
      e.preventDefault();
      break;
    case "ArrowLeft":
      game.move("left");
      e.preventDefault();
      break;
    case "ArrowRight":
      game.move("right");
      e.preventDefault();
      break;
  }
});

// Mobile Buttons
upBtn.addEventListener("click", () => game.move("up"));
downBtn.addEventListener("click", () => game.move("down"));
leftBtn.addEventListener("click", () => game.move("left"));
rightBtn.addEventListener("click", () => game.move("right"));

// Prevent double tap zoom
document.addEventListener(
  "dblclick",
  function (event) {
    event.preventDefault();
  },
  { passive: false }
);

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.onclick = startGame;
});

// Init
initI18n();
initGame();
