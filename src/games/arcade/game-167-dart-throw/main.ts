/**
 * Dart Throw Main Entry
 * Game #167
 */
import { DartThrowGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const roundDisplay = document.getElementById("round-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: DartThrowGame;

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
  game = new DartThrowGame(canvas);
  game.resize();

  canvas.addEventListener("click", () => {
    game.handleClick();
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.handleClick();
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.score !== undefined) scoreDisplay.textContent = String(state.score);
    if (state.round !== undefined) roundDisplay.textContent = `${state.round}/5`;
    if (state.status === "over") showGameOver(state.score);
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(finalScore: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.finalScore")}: ${finalScore}`;
    startBtn.textContent = i18n.t("game.reset");
    startBtn.onclick = () => { overlay.style.display = "none"; game.reset(); };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());

initI18n();
initGame();
