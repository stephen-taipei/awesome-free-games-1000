/**
 * Double Jump Main Entry
 * Game #238
 */
import { DoubleJumpGame } from "./game";
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

const jumpBtn = document.getElementById("jump-btn")!;
const jump1 = document.getElementById("jump-1")!;
const jump2 = document.getElementById("jump-2")!;

let game: DoubleJumpGame;

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
  game = new DoubleJumpGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();

    // Update jump indicators
    jump1.classList.toggle("active", state.jumpsLeft >= 1);
    jump2.classList.toggle("active", state.jumpsLeft >= 2);

    if (state.status === "over") {
      showGameOver(state.score);
    }
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      game.jump();
    }
  });

  // Mobile jump button
  jumpBtn.addEventListener("click", () => game.jump());
  jumpBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.jump();
  });

  // Canvas tap
  canvas.addEventListener("click", () => game.jump());

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
