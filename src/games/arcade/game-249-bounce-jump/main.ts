/**
 * Bounce Jump Main Entry
 * Game #249
 */
import { BounceJumpGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highDisplay = document.getElementById("high-display")!;
const heightDisplay = document.getElementById("height-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: BounceJumpGame;

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
  game = new BounceJumpGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      game.setMoveDirection(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      game.setMoveDirection(1);
    }
  });

  document.addEventListener("keyup", (e) => {
    if (
      e.key === "ArrowLeft" ||
      e.key === "a" ||
      e.key === "A" ||
      e.key === "ArrowRight" ||
      e.key === "d" ||
      e.key === "D"
    ) {
      game.setMoveDirection(0);
    }
  });

  // Touch controls
  let touchStartX = 0;

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const touchX = e.touches[0].clientX;

    if (touchX < centerX - 30) {
      game.setMoveDirection(-1);
    } else if (touchX > centerX + 30) {
      game.setMoveDirection(1);
    } else {
      game.setMoveDirection(0);
    }
  });

  canvas.addEventListener("touchend", () => {
    game.setMoveDirection(0);
  });

  // Mouse controls
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    if (e.clientX < centerX - 50) {
      game.setMoveDirection(-1);
    } else if (e.clientX > centerX + 50) {
      game.setMoveDirection(1);
    } else {
      game.setMoveDirection(0);
    }
  });

  canvas.addEventListener("mouseleave", () => {
    game.setMoveDirection(0);
  });

  // Device motion (accelerometer)
  if (window.DeviceMotionEvent) {
    window.addEventListener("devicemotion", (e) => {
      if (e.accelerationIncludingGravity?.x) {
        const tilt = e.accelerationIncludingGravity.x / 5;
        game.setMoveDirection(Math.max(-1, Math.min(1, tilt)));
      }
    });
  }

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();
    heightDisplay.textContent = `${state.height}m`;

    if (state.status === "over") {
      showGameOver(state.score, state.height);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number, height: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score} | ${i18n.t("game.height")}: ${height}m`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
