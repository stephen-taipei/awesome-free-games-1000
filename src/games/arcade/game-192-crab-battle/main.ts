/**
 * Crab Battle Main Entry
 * Game #192
 */
import { CrabBattleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const healthDisplay = document.getElementById("health-display")!;
const waveDisplay = document.getElementById("wave-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnAttack = document.getElementById("btn-attack")!;

let game: CrabBattleGame;

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
  game = new CrabBattleGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    game.setKey(e.key, true);
  });

  document.addEventListener("keyup", (e) => {
    game.setKey(e.key, false);
  });

  // Mobile controls
  let leftInterval: number | null = null;
  let rightInterval: number | null = null;

  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.movePlayer("left");
    leftInterval = window.setInterval(() => game.movePlayer("left"), 30);
  });

  btnLeft.addEventListener("touchend", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.movePlayer("right");
    rightInterval = window.setInterval(() => game.movePlayer("right"), 30);
  });

  btnRight.addEventListener("touchend", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  btnAttack.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.attack();
  });

  // Mouse support
  btnLeft.addEventListener("mousedown", () => {
    game.movePlayer("left");
    leftInterval = window.setInterval(() => game.movePlayer("left"), 30);
  });

  btnLeft.addEventListener("mouseup", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnLeft.addEventListener("mouseleave", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnRight.addEventListener("mousedown", () => {
    game.movePlayer("right");
    rightInterval = window.setInterval(() => game.movePlayer("right"), 30);
  });

  btnRight.addEventListener("mouseup", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  btnRight.addEventListener("mouseleave", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  btnAttack.addEventListener("click", () => game.attack());

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    healthDisplay.textContent = state.health.toString();
    waveDisplay.textContent = state.wave.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    } else if (state.status === "won") {
      showWin(state.score);
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

function showWin(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
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
