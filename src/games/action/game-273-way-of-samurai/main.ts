/**
 * Way of Samurai Main Entry
 * Game #273
 */
import { SamuraiGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const comboDisplay = document.getElementById("combo-display")!;
const honorDisplay = document.getElementById("honor-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnUp = document.getElementById("btn-up")!;
const btnDown = document.getElementById("btn-down")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: SamuraiGame;

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
  game = new SamuraiGame(canvas);
  game.resize();

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        e.preventDefault();
        game.slash("up");
        break;
      case "ArrowDown":
      case "s":
      case "S":
        e.preventDefault();
        game.slash("down");
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        game.slash("left");
        break;
      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        game.slash("right");
        break;
    }
  });

  // Touch/swipe controls
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        game.slash(dx > 0 ? "right" : "left");
      }
    } else {
      if (Math.abs(dy) > 30) {
        game.slash(dy > 0 ? "down" : "up");
      }
    }
  });

  // Mobile buttons
  btnUp.addEventListener("click", () => game.slash("up"));
  btnDown.addEventListener("click", () => game.slash("down"));
  btnLeft.addEventListener("click", () => game.slash("left"));
  btnRight.addEventListener("click", () => game.slash("right"));

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    comboDisplay.textContent = state.combo.toString();
    honorDisplay.textContent = state.honor.toString();

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
    overlayMsg.textContent = `Final Score: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
initI18n();
initGame();
