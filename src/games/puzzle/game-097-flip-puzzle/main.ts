/**
 * Flip Puzzle Main Entry
 * Game #097
 */
import { FlipGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const bestDisplay = document.getElementById("best-display")!;
const currentBoard = document.getElementById("current-board")!;
const targetBoard = document.getElementById("target-board")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;

let game: FlipGame;
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
}

function initGame(): void {
  game = new FlipGame();

  game.onStateChange = (state: GameState) => {
    renderBoards(state);
    updateUI(state);

    if (state.status === "won") {
      setTimeout(() => showWinOverlay(), 500);
    }
  };
}

function createBoard(container: HTMLElement, size: number, isTarget: boolean = false): void {
  container.innerHTML = "";
  container.className = `board size-${size}${isTarget ? " target" : ""}`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const tile = document.createElement("div");
      tile.className = "tile off";
      tile.dataset.row = r.toString();
      tile.dataset.col = c.toString();

      if (!isTarget) {
        tile.addEventListener("click", () => handleTileClick(r, c));
      }

      container.appendChild(tile);
    }
  }
}

function handleTileClick(row: number, col: number): void {
  if (game.getState().status !== "playing") return;

  clearHint();

  // Add flip animation
  const size = game.getState().size;
  const tiles = currentBoard.querySelectorAll(".tile");

  // Get affected tiles
  const affected: number[] = [row * size + col];
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      affected.push(nr * size + nc);
    }
  }

  affected.forEach((idx) => {
    tiles[idx].classList.add("flipping");
    setTimeout(() => tiles[idx].classList.remove("flipping"), 300);
  });

  game.flipTile(row, col);
}

function renderBoards(state: GameState): void {
  const { board, target, size } = state;

  // Ensure boards are created with correct size
  if (currentBoard.children.length !== size * size) {
    createBoard(currentBoard, size, false);
    createBoard(targetBoard, size, true);
  }

  // Render current board
  const currentTiles = currentBoard.querySelectorAll(".tile");
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const tile = currentTiles[idx];
      tile.classList.remove("on", "off");
      tile.classList.add(board[r][c] ? "on" : "off");
    }
  }

  // Render target board
  const targetTiles = targetBoard.querySelectorAll(".tile");
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const tile = targetTiles[idx];
      tile.classList.remove("on", "off");
      tile.classList.add(target[r][c] ? "on" : "off");
    }
  }
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();

  const best = game.getBestScore(state.level);
  bestDisplay.textContent = best !== null ? best.toString() : "-";
}

function clearHint(): void {
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }
  currentBoard.querySelectorAll(".hint").forEach((el) => el.classList.remove("hint"));
}

function showHint(): void {
  clearHint();
  const hint = game.getHint();
  if (!hint) return;

  const [row, col] = hint;
  const size = game.getState().size;
  const idx = row * size + col;
  const tile = currentBoard.children[idx];

  if (tile) {
    tile.classList.add("hint");
    hintTimeout = window.setTimeout(clearHint, 3000);
  }
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${state.moves}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
  }
}

function startGame(level: number = 1): void {
  overlay.style.display = "none";
  clearHint();
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => game.reset());
hintBtn.addEventListener("click", showHint);

// Initialize
initI18n();
initGame();
