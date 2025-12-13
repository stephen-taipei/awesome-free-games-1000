/**
 * Dice Puzzle Main Entry
 * Game #098
 */
import { DiceGame, GameState, Direction, DiceState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const targetDisplay = document.getElementById("target-display")!;
const boardEl = document.getElementById("board")!;
const diceEl = document.getElementById("dice")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const upBtn = document.getElementById("up-btn")!;
const downBtn = document.getElementById("down-btn")!;
const leftBtn = document.getElementById("left-btn")!;
const rightBtn = document.getElementById("right-btn")!;

let game: DiceGame;
let isAnimating = false;

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
  game = new DiceGame();

  game.onStateChange = (state: GameState) => {
    renderBoard(state);
    renderDice(state.dice);
    updateUI(state);

    if (state.status === "won") {
      setTimeout(() => showWinOverlay(), 600);
    }
  };

  // Keyboard controls
  document.addEventListener("keydown", handleKeydown);
}

function createBoard(rows: number, cols: number): void {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell empty";
      cell.dataset.row = r.toString();
      cell.dataset.col = c.toString();
      boardEl.appendChild(cell);
    }
  }
}

function renderBoard(state: GameState): void {
  const { rows, cols } = game.getGridSize();

  // Recreate board if size changed
  if (boardEl.children.length !== rows * cols) {
    createBoard(rows, cols);
  }

  const cells = boardEl.querySelectorAll(".cell");
  const [diceRow, diceCol] = state.dicePos;
  const [goalRow, goalCol] = state.goal;

  cells.forEach((cell) => {
    const r = parseInt(cell.getAttribute("data-row")!);
    const c = parseInt(cell.getAttribute("data-col")!);
    const idx = r * cols + c;
    const cellType = state.grid[r][c];

    cell.className = "cell";

    if (r === diceRow && c === diceCol) {
      cell.classList.add("dice");
      cell.textContent = state.dice.top.toString();
    } else if (cellType === "goal") {
      cell.classList.add("goal");
      cell.textContent = state.targetValue.toString();
    } else if (cellType === "blocked") {
      cell.classList.add("blocked");
      cell.textContent = "";
    } else {
      cell.classList.add("empty");
      cell.textContent = "";
    }
  });
}

function renderDice(dice: DiceState): void {
  const faces = diceEl.querySelectorAll(".dice-face");

  const faceMap: { [key: string]: number } = {
    front: dice.front,
    back: dice.back,
    right: dice.right,
    left: dice.left,
    top: dice.top,
    bottom: dice.bottom,
  };

  faces.forEach((face) => {
    const faceType = face.classList[1]; // front, back, etc.
    const value = faceMap[faceType] || 1;
    face.innerHTML = createDots(value);
  });
}

function createDots(value: number): string {
  let dots = "";
  const positions: { [key: number]: string[] } = {
    1: ["center"],
    2: ["top-right", "bottom-left"],
    3: ["top-right", "center", "bottom-left"],
    4: ["top-left", "top-right", "bottom-left", "bottom-right"],
    5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
    6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"],
  };

  const pos = positions[value] || [];
  pos.forEach(() => {
    dots += '<span class="dot"></span>';
  });

  return dots;
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();
  targetDisplay.textContent = state.targetValue.toString();
}

function handleKeydown(e: KeyboardEvent): void {
  if (game.getState().status !== "playing" || isAnimating) return;

  let dir: Direction | null = null;

  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      dir = "up";
      break;
    case "ArrowDown":
    case "s":
    case "S":
      dir = "down";
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      dir = "left";
      break;
    case "ArrowRight":
    case "d":
    case "D":
      dir = "right";
      break;
  }

  if (dir) {
    e.preventDefault();
    moveWithAnimation(dir);
  }
}

function moveWithAnimation(dir: Direction): void {
  if (isAnimating) return;

  isAnimating = true;

  // Add animation class to dice preview
  diceEl.classList.add(`roll-${dir}`);

  setTimeout(() => {
    game.move(dir);
    diceEl.classList.remove(`roll-${dir}`);
    isAnimating = false;
  }, 400);
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
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => game.reset());

upBtn.addEventListener("click", () => moveWithAnimation("up"));
downBtn.addEventListener("click", () => moveWithAnimation("down"));
leftBtn.addEventListener("click", () => moveWithAnimation("left"));
rightBtn.addEventListener("click", () => moveWithAnimation("right"));

// Initialize
initI18n();
initGame();
