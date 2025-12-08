/**
 * Warehouse Keeper Main Entry
 * Game #022
 */
import { WarehouseGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const timeDisplay = document.getElementById("time-display")!;
const levelDisplay = document.getElementById("level-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const undoBtn = document.getElementById("undo-btn")!;

// Mobile Controls
const upBtn = document.getElementById("up-btn")!;
const downBtn = document.getElementById("down-btn")!;
const leftBtn = document.getElementById("left-btn")!;
const rightBtn = document.getElementById("right-btn")!;

let game: WarehouseGame;

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
  game = new WarehouseGame(canvas);

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();
    levelDisplay.textContent = state.level.toString();
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    if (state.status === "won") {
      showWin();
    }
  });

  // Handle swipe?
  setupSwipe();
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${
      moveDisplay.textContent
    }`;
    startBtn.textContent = i18n.t("game.start"); // Next level?

    startBtn.onclick = () => {
      // Loop level 1 for now or impl multiple
      game.loadLevel(0);
      overlay.style.display = "none";
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.loadLevel(0);
}

// Input Handlers
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      game.move(0, -1);
      e.preventDefault();
      break;
    case "ArrowDown":
      game.move(0, 1);
      e.preventDefault();
      break;
    case "ArrowLeft":
      game.move(-1, 0);
      e.preventDefault();
      break;
    case "ArrowRight":
      game.move(1, 0);
      e.preventDefault();
      break;
    case "z": // Undo if ctrl+z?
      if (e.metaKey || e.ctrlKey) game.undo();
      break;
  }
});

// Mobile Buttons
upBtn.addEventListener("click", () => game.move(0, -1));
downBtn.addEventListener("click", () => game.move(0, 1));
leftBtn.addEventListener("click", () => game.move(-1, 0));
rightBtn.addEventListener("click", () => game.move(1, 0));

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});
undoBtn.addEventListener("click", () => {
  game.undo();
});

// Swipe Logic
function setupSwipe() {
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      e.preventDefault();
    },
    { passive: false }
  );

  canvas.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        if (dx > 0) game.move(1, 0);
        else game.move(-1, 0);
      }
    } else {
      if (Math.abs(dy) > 30) {
        if (dy > 0) game.move(0, 1);
        else game.move(0, -1);
      }
    }
  });
}

// Init
initI18n();
initGame();
