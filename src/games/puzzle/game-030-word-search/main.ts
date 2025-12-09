/**
 * Word Search Main Entry
 * Game #030
 */
import { WordSearchGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const gridContainer = document.getElementById("grid-container")!;
const wordListUl = document.getElementById("word-list-ul")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const foundDisplay = document.getElementById("found-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: WordSearchGame;
let isDragging = false;

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
    // Restart logic? Words might change language
    initGame(); // Re-init with new words
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new WordSearchGame();

  // Get words from i18n
  const words = i18n.t("words") as any as string[]; // Cast

  game.setOnStateChange((state: any) => {
    renderGrid(state);
    renderWordList(state.words);
    foundDisplay.textContent = `${
      state.words.filter((w: any) => w.found).length
    }/${state.words.length}`;

    if (state.status === "won") {
      showWin();
    }
  });

  // Start
  game.start(words);
}

function renderGrid(state: any) {
  // Diff render would be better, but MVP replace all
  gridContainer.innerHTML = "";

  // Set Columns
  gridContainer.style.gridTemplateColumns = `repeat(${game.width}, 30px)`;

  state.grid.forEach((row: string[], y: number) => {
    row.forEach((char: string, x: number) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = char;
      cell.dataset.x = x.toString();
      cell.dataset.y = y.toString();

      // Check Found Word Cells
      const isFound = state.words.some(
        (w: any) => w.found && w.cells.some((c: any) => c.x === x && c.y === y)
      );
      if (isFound) cell.classList.add("found");

      // Check Selection
      const isSelected = state.selected.some(
        (c: any) => c.x === x && c.y === y
      );
      if (isSelected) cell.classList.add("selected");

      // Events
      cell.addEventListener("mousedown", (e) => {
        isDragging = true;
        game.handleInputStart(x, y);
      });

      cell.addEventListener("mouseenter", (e) => {
        if (isDragging) game.handleInputMove(x, y);
      });

      gridContainer.appendChild(cell);
    });
  });

  // Global mouseup to catch end
}

// Global Listener for Drag End
window.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    game.handleInputEnd();
  }
});
// Touch support?
gridContainer.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && (el as HTMLElement).classList.contains("cell")) {
      isDragging = true;
      const x = parseInt((el as HTMLElement).dataset.x!);
      const y = parseInt((el as HTMLElement).dataset.y!);
      game.handleInputStart(x, y);
    }
  },
  { passive: false }
);

gridContainer.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && (el as HTMLElement).classList.contains("cell")) {
      const x = parseInt((el as HTMLElement).dataset.x!);
      const y = parseInt((el as HTMLElement).dataset.y!);
      game.handleInputMove(x, y);
    }
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  if (isDragging) {
    isDragging = false;
    game.handleInputEnd();
  }
});

function renderWordList(words: any[]) {
  wordListUl.innerHTML = "";
  words.forEach((w) => {
    const li = document.createElement("li");
    li.textContent = w.word;
    if (w.found) li.className = "found";
    wordListUl.appendChild(li);
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  const words = i18n.t("words") as any as string[];
  game.start(words);
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  startGame();
});

// Init
initI18n();
// initGame called in i18n setup usually, but here we call it manually first?
// Wait, initI18n calls initGame? No.
initGame();
