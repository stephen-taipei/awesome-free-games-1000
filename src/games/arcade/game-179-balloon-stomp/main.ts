/**
 * Balloon Stomp Main Entry
 * Game #179
 */
import { BalloonStompGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const finalScoreDisplay = document.getElementById("final-score")!;

let game: BalloonStompGame;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-Hant")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.includes("zh")) {
    i18n.setLocale("zh-CN");
  } else if (browserLang.includes("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.includes("ko")) {
    i18n.setLocale("ko");
  } else {
    i18n.setLocale("en");
  }

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
  game = new BalloonStompGame(canvas);
  game.resize();

  document.addEventListener("keydown", (e) => {
    if (overlay.style.display === "none") {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        e.preventDefault();
        game.handleKeyDown(e.code);
      }
    }
  });

  document.addEventListener("keyup", (e) => {
    game.handleKeyUp(e.code);
  });

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    timeDisplay.textContent = state.time.toString() + "s";

    if (state.time <= 10) {
      timeDisplay.style.color = "#e74c3c";
    } else {
      timeDisplay.style.color = "#fff";
    }

    if (state.status === "gameOver") {
      showGameOver(state.score);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameOver");
    overlayMsg.textContent = "";
    finalScoreDisplay.textContent = `${i18n.t("game.score")}: ${score}`;
    finalScoreDisplay.style.display = "block";
    startBtn.textContent = i18n.t("game.reset");
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);

initI18n();
initGame();
