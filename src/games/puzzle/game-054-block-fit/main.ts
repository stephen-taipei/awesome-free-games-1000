/**
 * Block Fit Main Entry
 * Game #054
 */
import { BlockFitGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const placedDisplay = document.getElementById("placed-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: BlockFitGame;
let clickTimer: number | null = null;

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
  game = new BlockFitGame(canvas);
  game.resize();

  // Mouse events with click detection
  let mouseDownTime = 0;
  let mouseDownPos = { x: 0, y: 0 };

  canvas.addEventListener("mousedown", (e) => {
    mouseDownTime = Date.now();
    const rect = canvas.getBoundingClientRect();
    mouseDownPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    game.handleInput("down", mouseDownPos.x, mouseDownPos.y);
  });

  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleInput("move", x, y);
  });

  window.addEventListener("mouseup", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Detect click (short press without much movement)
    const elapsed = Date.now() - mouseDownTime;
    const dist = Math.hypot(x - mouseDownPos.x, y - mouseDownPos.y);

    if (elapsed < 200 && dist < 10) {
      game.handleInput("click", x, y);
    } else {
      game.handleInput("up", x, y);
    }
  });

  // Touch events
  let touchStartTime = 0;
  let touchStartPos = { x: 0, y: 0 };

  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      touchStartTime = Date.now();
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      touchStartPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
      game.handleInput("down", touchStartPos.x, touchStartPos.y);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      game.handleInput("move", x, y);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const elapsed = Date.now() - touchStartTime;
      const dist = Math.hypot(x - touchStartPos.x, y - touchStartPos.y);

      if (elapsed < 200 && dist < 10) {
        game.handleInput("click", x, y);
      } else {
        game.handleInput("up", x, y);
      }
    },
    { passive: false }
  );

  game.setOnStateChange((state: any) => {
    if (state.placed !== undefined) {
      placedDisplay.textContent = state.placed;
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      showWin(state.hasNextLevel);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showWin(hasNextLevel: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        levelDisplay.textContent = "1";
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
