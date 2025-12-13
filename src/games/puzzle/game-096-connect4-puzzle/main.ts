/**
 * Connect 4 Puzzle Main Entry
 * Game #096
 */
import { Connect4Game, CellState, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const targetDisplay = document.getElementById("target-display")!;
const boardEl = document.getElementById("board")!;
const previewRow = document.getElementById("preview-row")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const undoBtn = document.getElementById("undo-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;
const switchBtn = document.getElementById("switch-btn")!;
const currentPieceEl = document.getElementById("current-piece")!;

let game: Connect4Game;
let hintTimeout: number | null = null;

function initI18n(): void {
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

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
  updateTargetDisplay();
}

function updateTargetDisplay(): void {
  if (game) {
    const maxMoves = game.getMaxMoves();
    targetDisplay.textContent = `${maxMoves} ${i18n.t("game.targetMoves")}`;
  }
}

function initGame(): void {
  game = new Connect4Game();

  game.onStateChange = (state: GameState) => {
    renderBoard(state);
    updateUI(state);
  };

  game.onWin = (winningCells: [number, number][]) => {
    highlightWinningCells(winningCells);
    setTimeout(() => showWinOverlay(), 800);
  };

  // Create preview row
  createPreviewRow();

  // Create board
  createBoard();
}

function createPreviewRow(): void {
  previewRow.innerHTML = "";
  for (let c = 0; c < 7; c++) {
    const cell = document.createElement("div");
    cell.className = "preview-cell";
    cell.dataset.col = c.toString();
    cell.addEventListener("click", () => handleColumnClick(c));
    previewRow.appendChild(cell);
  }
}

function createBoard(): void {
  boardEl.innerHTML = "";
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r.toString();
      cell.dataset.col = c.toString();
      cell.addEventListener("click", () => handleColumnClick(c));
      boardEl.appendChild(cell);
    }
  }
}

function handleColumnClick(col: number): void {
  if (game.getState().status !== "playing") return;

  clearHint();

  const dropped = game.dropPiece(col);
  if (dropped) {
    // Add drop animation to the newly placed piece
    const state = game.getState();
    let targetRow = -1;
    for (let r = 0; r < 6; r++) {
      if (state.board[r][col] !== "empty") {
        targetRow = r;
        break;
      }
    }
    if (targetRow >= 0) {
      const cell = boardEl.querySelector(
        `[data-row="${targetRow}"][data-col="${col}"]`
      );
      if (cell) {
        cell.classList.add("dropping");
        setTimeout(() => cell.classList.remove("dropping"), 400);
      }
    }
  }
}

function renderBoard(state: GameState): void {
  const cells = boardEl.querySelectorAll(".cell");
  cells.forEach((cell) => {
    const row = parseInt(cell.getAttribute("data-row")!);
    const col = parseInt(cell.getAttribute("data-col")!);
    const cellState = state.board[row][col];

    cell.classList.remove("red", "yellow", "winning", "hint");
    if (cellState !== "empty") {
      cell.classList.add(cellState);
    }
  });

  // Update preview row colors
  const previewCells = previewRow.querySelectorAll(".preview-cell");
  previewCells.forEach((cell) => {
    cell.classList.remove("red", "yellow");
    cell.classList.add(state.currentPiece);
  });
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = `${state.moves}/${game.getMaxMoves()}`;
  updateTargetDisplay();

  // Update current piece indicator
  currentPieceEl.classList.remove("red", "yellow");
  currentPieceEl.classList.add(state.currentPiece);

  // Update button states
  undoBtn.disabled = state.history.length === 0 || state.status === "won";

  if (state.status === "lost") {
    showLostOverlay();
  }
}

function highlightWinningCells(cells: [number, number][]): void {
  cells.forEach(([row, col]) => {
    const cell = boardEl.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (cell) {
      cell.classList.add("winning");
    }
  });
}

function clearHint(): void {
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }
  boardEl.querySelectorAll(".hint").forEach((el) => el.classList.remove("hint"));
}

function showHint(): void {
  clearHint();
  const hintCol = game.getHint();
  if (hintCol === null) return;

  // Find the row where piece would land
  const state = game.getState();
  let targetRow = -1;
  for (let r = 5; r >= 0; r--) {
    if (state.board[r][hintCol] === "empty") {
      targetRow = r;
      break;
    }
  }

  if (targetRow >= 0) {
    const cell = boardEl.querySelector(
      `[data-row="${targetRow}"][data-col="${hintCol}"]`
    );
    if (cell) {
      cell.classList.add("hint");
      hintTimeout = window.setTimeout(clearHint, 3000);
    }
  }
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  if (game.getState().level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.level")} ${game.getState().level} ${i18n.t("game.win")}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
  }
}

function showLostOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.level") + " " + game.getState().level;
  overlayMsg.textContent = i18n.t("game.desc");
  startBtn.textContent = i18n.t("game.reset");
  startBtn.onclick = () => {
    overlay.style.display = "none";
    game.reset();
  };
}

function startGame(level: number = 1): void {
  overlay.style.display = "none";
  clearHint();
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => game.reset());
undoBtn.addEventListener("click", () => game.undo());
hintBtn.addEventListener("click", showHint);
switchBtn.addEventListener("click", () => game.switchPiece());

// Initialize
initI18n();
initGame();
