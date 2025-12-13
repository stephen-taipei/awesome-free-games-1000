/**
 * Color Sort Main Entry
 * Game #083
 */
import { ColorSortGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const tubesContainer = document.getElementById("tubes-container")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const undoBtn = document.getElementById("undo-btn")!;

let game: ColorSortGame;

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
  game = new ColorSortGame();

  game.setOnStateChange((state) => {
    levelDisplay.textContent = state.level.toString();
    movesDisplay.textContent = state.moves.toString();
    undoBtn.style.opacity = state.canUndo ? "1" : "0.5";

    if (state.status === "won") {
      showWin(state.level, state.maxLevel);
    }
  });

  game.setOnRender(() => {
    renderTubes();
  });
}

function renderTubes() {
  tubesContainer.innerHTML = "";
  const tubes = game.getTubes();
  const selectedIndex = game.getSelectedTubeIndex();

  tubes.forEach((tube, index) => {
    const tubeEl = document.createElement("div");
    tubeEl.className = "tube" + (index === selectedIndex ? " selected" : "");
    tubeEl.dataset.index = index.toString();

    // Render balls from bottom to top
    tube.balls.forEach((color, ballIndex) => {
      const ballEl = document.createElement("div");
      ballEl.className = "ball";
      ballEl.style.backgroundColor = color;
      tubeEl.appendChild(ballEl);
    });

    tubeEl.addEventListener("click", () => {
      game.selectTube(index);
    });

    tubesContainer.appendChild(tubeEl);
  });
}

function showWin(level: number, maxLevel: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");

    if (level < maxLevel) {
      overlayMsg.textContent = `Level ${level} completed!`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
      };
    } else {
      overlayMsg.textContent = "All levels completed!";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});
undoBtn.addEventListener("click", () => {
  game.undo();
});

// Init
initI18n();
initGame();
