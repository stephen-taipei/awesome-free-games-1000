/**
 * Sealer Main Entry
 * Game #359
 */
import { SealerGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const manaDisplay = document.getElementById("mana-display")!;
const sealsDisplay = document.getElementById("seals-display")!;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnSeal = document.getElementById("btn-seal")!;

let game: SealerGame;

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
  game = new SealerGame(canvas);
  game.resize();

  // Mouse controls
  canvas.addEventListener("mousedown", (e) => {
    game.startCharge(e.clientX, e.clientY);
  });

  canvas.addEventListener("mouseup", () => {
    game.endCharge();
  });

  // Touch controls
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    game.startCharge(touch.clientX, touch.clientY);
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.endCharge();
  });

  // Mobile button
  btnSeal.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    game.startCharge(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  btnSeal.addEventListener("touchend", () => {
    game.endCharge();
  });

  btnSeal.addEventListener("mousedown", () => {
    const rect = canvas.getBoundingClientRect();
    game.startCharge(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  btnSeal.addEventListener("mouseup", () => {
    game.endCharge();
  });

  game.setOnStateChange((state) => {
    manaDisplay.textContent = state.mana.toString();
    sealsDisplay.textContent = state.seals.toString();
    scoreDisplay.textContent = state.score.toString();

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
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
initI18n();
initGame();
