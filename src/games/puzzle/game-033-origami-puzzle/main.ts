/**
 * Origami Puzzle Main Entry
 * Game #033
 */
import { OrigamiGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const targetIcon = document.getElementById("target-icon")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: OrigamiGame;
let targetCanvas: HTMLCanvasElement;

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
  game = new OrigamiGame(canvas);

  // Setup target canvas
  targetCanvas = document.createElement("canvas");
  targetCanvas.width = 60;
  targetCanvas.height = 60;
  targetIcon.appendChild(targetCanvas);

  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleInput(e.clientX - rect.left, e.clientY - rect.top);
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = state.level.toString();

    // Update target preview
    if (state.targetFolds) {
      const ctx = targetCanvas.getContext("2d")!;
      game.drawTarget(ctx, 60, 60);
    }

    if (state.win) {
      // flash or sound?
      // transition happens in game logic timeout
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});

// Init
initI18n();
initGame();
