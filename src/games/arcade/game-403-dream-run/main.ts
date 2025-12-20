/**
 * Dream Run Main Entry
 * Game #403
 */
import { DreamRunGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const distanceDisplay = document.getElementById("distance-display")!;
const stardustDisplay = document.getElementById("stardust-display")!;
const scoreDisplay = document.getElementById("score-display")!;
const highDisplay = document.getElementById("high-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

// Mobile controls
const btnJump = document.getElementById("btn-jump")!;
const btnFloat = document.getElementById("btn-float")!;
const btnPhase = document.getElementById("btn-phase")!;

let game: DreamRunGame;
let isFloating = false;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-HK")) {
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
  game = new DreamRunGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case " ":
      case "w":
      case "W":
      case "ArrowUp":
        e.preventDefault();
        if (!isFloating) {
          game.jump();
          isFloating = true;
          game.startFloat();
        }
        break;
      case "f":
      case "F":
        e.preventDefault();
        game.activatePhase();
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case " ":
      case "w":
      case "W":
      case "ArrowUp":
        e.preventDefault();
        isFloating = false;
        game.stopFloat();
        break;
    }
  });

  // Mobile controls
  btnJump.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.jump();
    isFloating = true;
    game.startFloat();
  });

  btnJump.addEventListener("touchend", (e) => {
    e.preventDefault();
    isFloating = false;
    game.stopFloat();
  });

  btnFloat.addEventListener("touchstart", (e) => {
    e.preventDefault();
    isFloating = true;
    game.startFloat();
  });

  btnFloat.addEventListener("touchend", (e) => {
    e.preventDefault();
    isFloating = false;
    game.stopFloat();
  });

  btnPhase.addEventListener("click", (e) => {
    e.preventDefault();
    game.activatePhase();
  });

  // Mouse controls for desktop
  btnJump.addEventListener("mousedown", (e) => {
    e.preventDefault();
    game.jump();
    isFloating = true;
    game.startFloat();
  });

  btnJump.addEventListener("mouseup", (e) => {
    e.preventDefault();
    isFloating = false;
    game.stopFloat();
  });

  btnFloat.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isFloating = true;
    game.startFloat();
  });

  btnFloat.addEventListener("mouseup", (e) => {
    e.preventDefault();
    isFloating = false;
    game.stopFloat();
  });

  btnPhase.addEventListener("click", () => {
    game.activatePhase();
  });

  game.setOnStateChange((state) => {
    distanceDisplay.textContent = state.distance.toString();
    stardustDisplay.textContent = state.stardust.toString();
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
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  isFloating = false;
  game.start();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
