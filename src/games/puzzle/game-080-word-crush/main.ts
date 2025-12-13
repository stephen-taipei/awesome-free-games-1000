/**
 * Word Crush Main Entry
 * Game #080
 */
import { WordCrushGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const wordsDisplay = document.getElementById("words-display")!;
const currentWordDisplay = document.getElementById("current-word")!;
const letterGrid = document.getElementById("letter-grid")!;
const foundWordsContainer = document.getElementById("found-words")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: WordCrushGame;

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
  game = new WordCrushGame();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    wordsDisplay.textContent = state.wordsFound.toString();
    currentWordDisplay.textContent = state.currentWord;
  });

  game.setOnGridUpdate(() => {
    renderGrid();
  });
}

function renderGrid() {
  letterGrid.innerHTML = "";
  const grid = game.getGrid();

  grid.forEach((row, y) => {
    row.forEach((cell, x) => {
      const cellEl = document.createElement("div");
      cellEl.className = "letter-cell" + (cell.selected ? " selected" : "");
      cellEl.textContent = cell.letter;
      cellEl.dataset.x = x.toString();
      cellEl.dataset.y = y.toString();
      letterGrid.appendChild(cellEl);
    });
  });
}

function getCellFromEvent(e: MouseEvent | Touch): { x: number; y: number } | null {
  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (target && target.classList.contains("letter-cell")) {
    const x = parseInt(target.getAttribute("data-x") || "-1");
    const y = parseInt(target.getAttribute("data-y") || "-1");
    if (x >= 0 && y >= 0) {
      return { x, y };
    }
  }
  return null;
}

function setupInputHandlers() {
  // Mouse events
  letterGrid.addEventListener("mousedown", (e) => {
    const cell = getCellFromEvent(e);
    if (cell) {
      game.startSelection(cell.x, cell.y);
    }
  });

  document.addEventListener("mousemove", (e) => {
    const cell = getCellFromEvent(e);
    if (cell) {
      game.continueSelection(cell.x, cell.y);
    }
  });

  document.addEventListener("mouseup", () => {
    const result = game.endSelection();
    if (result.word.length >= 3) {
      showWordResult(result.valid, result.word);
    }
  });

  // Touch events
  letterGrid.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = getCellFromEvent(touch);
    if (cell) {
      game.startSelection(cell.x, cell.y);
    }
  });

  document.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    const cell = getCellFromEvent(touch);
    if (cell) {
      game.continueSelection(cell.x, cell.y);
    }
  });

  document.addEventListener("touchend", () => {
    const result = game.endSelection();
    if (result.word.length >= 3) {
      showWordResult(result.valid, result.word);
    }
  });
}

function showWordResult(valid: boolean, word: string) {
  if (valid) {
    // Add to found words display
    const wordEl = document.createElement("span");
    wordEl.className = "found-word";
    wordEl.textContent = word;
    foundWordsContainer.appendChild(wordEl);

    // Flash valid
    const cells = letterGrid.querySelectorAll(".letter-cell");
    cells.forEach((cell) => {
      if (cell.classList.contains("selected")) {
        cell.classList.add("valid");
        setTimeout(() => cell.classList.remove("valid"), 300);
      }
    });
  } else {
    // Flash invalid
    currentWordDisplay.style.color = "#e74c3c";
    setTimeout(() => {
      currentWordDisplay.style.color = "";
    }, 300);
  }
}

function startGame() {
  overlay.style.display = "none";
  foundWordsContainer.innerHTML = "";
  game.start();
  renderGrid();
  setupInputHandlers();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  foundWordsContainer.innerHTML = "";
  game.reset();
});

// Init
initI18n();
initGame();
