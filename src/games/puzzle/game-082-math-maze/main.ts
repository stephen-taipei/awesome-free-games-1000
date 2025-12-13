/**
 * Math Maze Main Entry
 * Game #082
 */
import { MathMazeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const targetDisplay = document.getElementById("target-display")!;
const currentDisplay = document.getElementById("current-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

const mobileControls = document.getElementById("mobile-controls")!;

let game: MathMazeGame;

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
  game = new MathMazeGame(canvas);
  game.resize();

  // Keyboard input
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
        e.preventDefault();
        game.move("up");
        break;
      case "ArrowDown":
      case "s":
        e.preventDefault();
        game.move("down");
        break;
      case "ArrowLeft":
      case "a":
        e.preventDefault();
        game.move("left");
        break;
      case "ArrowRight":
      case "d":
        e.preventDefault();
        game.move("right");
        break;
    }
  });

  // Mobile controls
  mobileControls.querySelectorAll(".control-btn").forEach((btn) => {
    const dir = btn.getAttribute("data-dir") as "up" | "down" | "left" | "right";

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      game.move(dir);
    });

    btn.addEventListener("click", () => {
      game.move(dir);
    });
  });

  // Swipe support
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    const minSwipe = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > minSwipe) game.move("right");
      else if (dx < -minSwipe) game.move("left");
    } else {
      if (dy > minSwipe) game.move("down");
      else if (dy < -minSwipe) game.move("up");
    }
  });

  game.setOnStateChange((state) => {
    targetDisplay.textContent = state.targetValue.toString();
    currentDisplay.textContent = state.currentValue.toString();

    // Color current value based on proximity to target
    if (state.currentValue === state.targetValue) {
      currentDisplay.style.color = "#00b894";
    } else if (Math.abs(state.currentValue - state.targetValue) < 10) {
      currentDisplay.style.color = "#fdcb6e";
    } else {
      currentDisplay.style.color = "#4834d4";
    }

    if (state.status === "won") {
      showWin(state.level, state.maxLevel);
    } else if (state.status === "lost") {
      showLost();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showWin(level: number, maxLevel: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");

    if (level < maxLevel) {
      overlayMsg.textContent = `Level ${level} completed!`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
      };
    } else {
      overlayMsg.textContent = "All levels completed!";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        startGame();
      };
    }
  }, 500);
}

function showLost() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameOver");
    overlayMsg.textContent = "Your value doesn't match the target!";
    startBtn.textContent = i18n.t("game.retry");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.reset();
    };
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
