/**
 * Snake Main Entry
 * Game #151
 */
import { SnakeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highDisplay = document.getElementById("high-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

// Mobile controls
const btnUp = document.getElementById("btn-up")!;
const btnDown = document.getElementById("btn-down")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: SnakeGame;

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
  game = new SnakeGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        e.preventDefault();
        game.setDirection("up");
        break;
      case "ArrowDown":
      case "s":
      case "S":
        e.preventDefault();
        game.setDirection("down");
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        game.setDirection("left");
        break;
      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        game.setDirection("right");
        break;
    }
  });

  // Mobile controls
  btnUp.addEventListener("click", () => game.setDirection("up"));
  btnDown.addEventListener("click", () => game.setDirection("down"));
  btnLeft.addEventListener("click", () => game.setDirection("left"));
  btnRight.addEventListener("click", () => game.setDirection("right"));

  // Touch swipe controls
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

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) game.setDirection("right");
      else if (dx < -30) game.setDirection("left");
    } else {
      if (dy > 30) game.setDirection("down");
      else if (dy < -30) game.setDirection("up");
    }
  });

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score}`;
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
