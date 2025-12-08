/**
 * Nonogram Main Entry
 * Game #013
 */
import { NonogramGame, type GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelSelect = document.getElementById(
  "level-select"
) as HTMLSelectElement;

const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const checkBtn = document.getElementById("check-btn")!;
const switchModeBtn = document.getElementById("switch-mode-btn")!; // Mobile Only

let game: NonogramGame;
let inputMode: "fill" | "mark" = "fill"; // For Mobile touch logic mainly, or enforced

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
    if (key) {
      if (key === "game.modeFill")
        el.textContent =
          inputMode === "fill"
            ? i18n.t("game.modeFill")
            : i18n.t("game.modeMark");
      else el.textContent = i18n.t(key);
    }
  });
}

function initGame() {
  game = new NonogramGame(canvas);

  game.setOnStateChange((state: GameState) => {
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    if (state.status === "won") {
      showWin();
    }
  });
}

function startGame() {
  overlay.style.display = "none";
  const lvl = parseInt(levelSelect.value, 10);
  game.startLevel(lvl);
}

function showWin() {
  // Small delay to see final grid
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent =
      i18n.t("game.time") + ": " + timeDisplay.textContent;
    startBtn.textContent = i18n.t("game.start");

    // Override temporarily to allow replay
    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

// Input Handling
function getPos(e: MouseEvent | TouchEvent) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else return null;
  } else if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else return null;

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

canvas.addEventListener("mousedown", (e) => {
  e.preventDefault(); // Prevent context menu
  const pos = getPos(e);
  if (pos) {
    const isRight = e.button === 2 || inputMode === "mark";
    game.handleInput(pos.x, pos.y, isRight, false);
  }
});
canvas.addEventListener("mousemove", (e) => {
  if (e.buttons === 0) return; // Only drag needed
  const pos = getPos(e);
  if (pos) {
    const isRight = e.buttons === 2 || inputMode === "mark";
    game.handleInput(pos.x, pos.y, isRight, true);
  }
});
canvas.addEventListener("mouseup", () => game.endDrag());
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// Touch
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) {
      const isRight = inputMode === "mark";
      game.handleInput(pos.x, pos.y, isRight, false);
    }
  },
  { passive: false }
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) {
      const isRight = inputMode === "mark";
      game.handleInput(pos.x, pos.y, isRight, true);
    }
  },
  { passive: false }
);
canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  game.endDrag();
});

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());
checkBtn.addEventListener("click", () => game.checkWithButton());

switchModeBtn.addEventListener("click", () => {
  inputMode = inputMode === "fill" ? "mark" : "fill";
  updateTexts();
});
levelSelect.addEventListener("change", () => {
  startGame();
});

// Init
initI18n();
initGame();
