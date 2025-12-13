/**
 * 3D Maze Main Entry
 * Game #079
 */
import { Maze3DGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

const mobileControls = document.getElementById("mobile-controls")!;

let game: Maze3DGame;

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
  game = new Maze3DGame(canvas);
  game.resize();

  // Keyboard input
  window.addEventListener("keydown", (e) => {
    if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      game.handleKeyDown(e.key);
    }
  });

  window.addEventListener("keyup", (e) => {
    game.handleKeyUp(e.key);
  });

  // Mobile controls
  mobileControls.querySelectorAll(".control-btn").forEach((btn) => {
    const dir = btn.getAttribute("data-dir") as "up" | "down" | "left" | "right";

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      game.move(dir);
    });

    btn.addEventListener("mousedown", () => {
      game.move(dir);
    });
  });

  game.setOnStateChange((state) => {
    levelDisplay.textContent = state.level.toString();
    timeDisplay.textContent = state.time;

    if (state.status === "won") {
      showWin(state.level, state.maxLevel, state.time);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showWin(level: number, maxLevel: number, time: string) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");

    if (level < maxLevel) {
      overlayMsg.textContent = `Level ${level} completed in ${time}!`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
      };
    } else {
      overlayMsg.textContent = `All mazes completed in ${time}!`;
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});

// Init
initI18n();
initGame();
