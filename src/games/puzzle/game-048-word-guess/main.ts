/**
 * Word Guess Main Entry
 * Game #048
 */
import { WordGuessGame, type CellState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const attemptsDisplay = document.getElementById("attempts-display")!;
const boardEl = document.getElementById("board")!;
const keyboardEl = document.getElementById("keyboard")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: WordGuessGame;

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

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
  game = new WordGuessGame();

  createBoard();
  createKeyboard();

  game.setOnStateChange((state: any) => {
    if (state.attempts !== undefined) {
      attemptsDisplay.textContent = state.attempts;
    }

    if (state.board !== undefined) {
      updateBoard(state.board, state.rowRevealed);
    }

    if (state.keyStates !== undefined) {
      updateKeyboard(state.keyStates);
    }

    if (state.status === "won") {
      showResult(true);
    } else if (state.status === "lost") {
      showResult(false, state.targetWord);
    }
  });

  game.setOnInvalidWord(() => {
    showToast(i18n.t("game.notInList"));
    shakeCurrentRow();
  });

  // Physical keyboard
  window.addEventListener("keydown", handleKeydown);
}

function createBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.row = String(i);

    for (let j = 0; j < 5; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = String(i);
      cell.dataset.col = String(j);
      row.appendChild(cell);
    }

    boardEl.appendChild(row);
  }
}

function createKeyboard() {
  keyboardEl.innerHTML = "";

  for (const row of KEYBOARD_ROWS) {
    const rowEl = document.createElement("div");
    rowEl.className = "keyboard-row";

    for (const key of row) {
      const keyEl = document.createElement("button");
      keyEl.className = "key";
      keyEl.textContent = key;
      keyEl.dataset.key = key;

      if (key === "ENTER" || key === "⌫") {
        keyEl.classList.add("wide");
      }

      keyEl.addEventListener("click", () => handleKeyClick(key));
      rowEl.appendChild(keyEl);
    }

    keyboardEl.appendChild(rowEl);
  }
}

function handleKeyClick(key: string) {
  if (key === "ENTER") {
    game.submitGuess();
  } else if (key === "⌫") {
    game.deleteLetter();
  } else {
    game.inputLetter(key);
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (overlay.style.display !== "none") return;

  if (e.key === "Enter") {
    game.submitGuess();
  } else if (e.key === "Backspace") {
    game.deleteLetter();
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    game.inputLetter(e.key);
  }
}

function updateBoard(board: any[][], rowRevealed?: number) {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      const cell = boardEl.querySelector(`[data-row="${i}"][data-col="${j}"]`) as HTMLElement;
      if (cell) {
        cell.textContent = board[i][j].letter;

        // Remove old state classes
        cell.classList.remove("empty", "filled", "correct", "present", "absent");

        // Add new state class
        cell.classList.add(board[i][j].state);

        // Add reveal animation delay for revealed row
        if (rowRevealed !== undefined && i === rowRevealed) {
          cell.style.animationDelay = `${j * 0.2}s`;
        }
      }
    }
  }
}

function updateKeyboard(keyStates: { [key: string]: CellState }) {
  for (const [key, state] of Object.entries(keyStates)) {
    const keyEl = keyboardEl.querySelector(`[data-key="${key}"]`) as HTMLElement;
    if (keyEl) {
      keyEl.classList.remove("correct", "present", "absent");
      keyEl.classList.add(state);
    }
  }
}

function shakeCurrentRow() {
  const currentRow = game.getCurrentRow();
  const rowEl = boardEl.querySelector(`[data-row="${currentRow}"]`) as HTMLElement;
  if (rowEl) {
    rowEl.classList.add("shake");
    setTimeout(() => rowEl.classList.remove("shake"), 300);
  }
}

function showToast(message: string) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.querySelector(".game-area")!.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

function showResult(won: boolean, targetWord?: string) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (won) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = "";
    } else {
      overlayTitle.textContent = i18n.t("game.lose");
      overlayMsg.textContent = `${i18n.t("game.theWord")}: ${targetWord}`;
    }

    startBtn.textContent = i18n.t("game.playAgain");
    startBtn.onclick = startGame;
  }, 1500);
}

function startGame() {
  overlay.style.display = "none";
  createBoard();
  createKeyboard();
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
