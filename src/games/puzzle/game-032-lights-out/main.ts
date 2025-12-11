/**
 * Lights Out Main Entry
 * Game #032
 */
import { LightsOutGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const gridContainer = document.getElementById("grid-container")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const newGameBtn = document.getElementById("hint-btn")!; // Using hint btn style for new game

let game: LightsOutGame;

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
  game = new LightsOutGame();

  game.setOnStateChange((state: any) => {
    renderGrid(state.grid);
    movesDisplay.textContent = state.moves.toString();

    if (state.status === "won") {
      showWin();
    }
  });

  // Initial Render dummy
  renderGrid(game.grid);
}

function renderGrid(grid: boolean[][]) {
  gridContainer.innerHTML = "";
  grid.forEach((row, y) => {
    row.forEach((isOn, x) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (isOn) cell.classList.add("on");

      cell.addEventListener("click", () => {
        game.move(x, y);
      });

      gridContainer.appendChild(cell);
    });
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${
      movesDisplay.textContent
    }`;
    startBtn.textContent = i18n.t("game.newgame");

    startBtn.onclick = () => {
      startGame();
    };
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.newGame();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());
newGameBtn.addEventListener("click", () => game.newGame());

// Init
initI18n();
initGame();
