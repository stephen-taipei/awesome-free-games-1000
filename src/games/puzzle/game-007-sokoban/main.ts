/**
 * Sokoban Main Entry
 * Game #007
 */
import { SokobanGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const undoBtn = document.getElementById("undo-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextLevelBtn = document.getElementById("next-level-btn")!;
const prevLevelBtn = document.getElementById("prev-level")!;
const nextLevelNav = document.getElementById("next-level")!;
const levelDisplay = document.getElementById("level-display")!;
const movesCounter = document.getElementById("moves-counter")!;
const gameOverlay = document.getElementById("game-overlay")!;

let game: SokobanGame;

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
  if (game) updateUI();
}

function updateUI() {
  levelDisplay.textContent = i18n
    .t("game.level")
    .replace("{n}", (game.getLevelIndex() + 1).toString());
}

function initGame() {
  game = new SokobanGame(canvas);

  game.setOnStateChange((state) => {
    movesCounter.textContent = `${i18n.t("game.moves")}: ${state.moves}`;
    updateUI();

    if (state.status === "won") {
      gameOverlay.style.display = "flex";
    } else {
      gameOverlay.style.display = "none";
    }
  });

  game.loadLevel(0);
}

// Controls
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      game.move(0, -1);
      break;
    case "ArrowDown":
      game.move(0, 1);
      break;
    case "ArrowLeft":
      game.move(-1, 0);
      break;
    case "ArrowRight":
      game.move(1, 0);
      break;
    case "z":
      if (e.ctrlKey || e.metaKey) game.undo();
      break;
    case "r":
      game.reset();
      break;
  }
});

// D-Pad
document.querySelectorAll(".d-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const dir = (e.currentTarget as HTMLElement).dataset.dir;
    if (dir === "up") game.move(0, -1);
    if (dir === "down") game.move(0, 1);
    if (dir === "left") game.move(-1, 0);
    if (dir === "right") game.move(1, 0);
  });
});

undoBtn.addEventListener("click", () => game.undo());
resetBtn.addEventListener("click", () => game.reset());

nextLevelBtn.addEventListener("click", () => {
  game.nextLevel();
  gameOverlay.style.display = "none";
});

prevLevelBtn.addEventListener("click", () =>
  game.loadLevel(game.getLevelIndex() - 1)
);
nextLevelNav.addEventListener("click", () => game.nextLevel());

// Init
initI18n();
initGame();
