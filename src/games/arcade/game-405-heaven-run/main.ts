/**
 * Heaven Run Main Entry
 * Game #405
 */
import { HeavenRunGame } from "./game";
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

// Mobile controls
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnJump = document.getElementById("btn-jump")!;

let game: HeavenRunGame;

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
  game = new HeavenRunGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    game.handleKeyDown(e.key);

    // Prevent default for game keys
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d"].includes(
        e.key
      )
    ) {
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    game.handleKeyUp(e.key);
  });

  // Mobile controls
  let leftPressed = false;
  let rightPressed = false;

  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    leftPressed = true;
    game.handleKeyDown("ArrowLeft");
  });

  btnLeft.addEventListener("touchend", (e) => {
    e.preventDefault();
    leftPressed = false;
    game.handleKeyUp("ArrowLeft");
  });

  btnLeft.addEventListener("mousedown", (e) => {
    e.preventDefault();
    leftPressed = true;
    game.handleKeyDown("ArrowLeft");
  });

  btnLeft.addEventListener("mouseup", (e) => {
    e.preventDefault();
    leftPressed = false;
    game.handleKeyUp("ArrowLeft");
  });

  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    rightPressed = true;
    game.handleKeyDown("ArrowRight");
  });

  btnRight.addEventListener("touchend", (e) => {
    e.preventDefault();
    rightPressed = false;
    game.handleKeyUp("ArrowRight");
  });

  btnRight.addEventListener("mousedown", (e) => {
    e.preventDefault();
    rightPressed = true;
    game.handleKeyDown("ArrowRight");
  });

  btnRight.addEventListener("mouseup", (e) => {
    e.preventDefault();
    rightPressed = false;
    game.handleKeyUp("ArrowRight");
  });

  btnJump.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.jump();
  });

  btnJump.addEventListener("click", (e) => {
    e.preventDefault();
    game.jump();
  });

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();
    heightDisplay.textContent = state.height.toString();

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
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score} | ${i18n.t(
      "game.height"
    )}: ${height}m`;
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
