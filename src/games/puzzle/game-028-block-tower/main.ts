/**
 * Block Tower Main Entry
 * Game #028
 */
import { BlockTowerGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const heightDisplay = document.getElementById("height-display")!;
const blockDisplay = document.getElementById("block-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: BlockTowerGame;

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
  game = new BlockTowerGame(canvas);
  game.resize(); // Initial

  game.setOnStateChange((state: any) => {
    if (state.height !== undefined)
      heightDisplay.textContent = state.height.toString();
    if (state.blocks !== undefined)
      blockDisplay.textContent = state.blocks.toString();

    if (state.status === "gameover") {
      showGameOver();
    }
  });

  window.addEventListener("resize", () => game.resize());

  // Controls
  canvas.addEventListener("click", () => game.drop());
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") game.drop();
  });
}

function showGameOver() {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = `${i18n.t("game.height")}: ${
    heightDisplay.textContent
  }`;
  startBtn.textContent = i18n.t("game.start");

  startBtn.onclick = () => {
    startGame();
  };
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset(); // Just restart
});

// Init
initI18n();
initGame();
