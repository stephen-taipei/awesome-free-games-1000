/**
 * Crossword Main Entry
 * Game #018
 */
import { CrosswordGame, type CrosswordWord } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const gridContainer = document.getElementById("crossword-grid") as HTMLElement;
const cluesAcross = document.getElementById("clues-across")!;
const cluesDown = document.getElementById("clues-down")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const checkBtn = document.getElementById("check-btn")!;

let game: CrosswordGame;
let inputs: HTMLInputElement[][] = [];

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
  game = new CrosswordGame();
  renderGrid();
  renderClues();

  game.setOnStateChange((status) => {
    if (status === "won") {
      alert(i18n.t("game.win"));
    }
  });
}

function renderGrid() {
  const level = game.level;
  gridContainer.style.gridTemplateColumns = `repeat(${level.cols}, 30px)`;
  gridContainer.innerHTML = "";
  inputs = Array(level.rows)
    .fill(null)
    .map(() => Array(level.cols).fill(null));

  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const cellInfo = game.getCellInfo(r, c);
      const cellDiv = document.createElement("div");
      cellDiv.className = "cell";

      if (!cellInfo) {
        cellDiv.classList.add("blocked");
      } else {
        if (cellInfo.startNum) {
          const numSpan = document.createElement("span");
          numSpan.className = "cell-number";
          numSpan.textContent = cellInfo.startNum.toString();
          cellDiv.appendChild(numSpan);
        }

        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 1;
        input.className = "cell-input";

        input.addEventListener("input", (e) => handleInput(e, r, c));
        input.addEventListener("keydown", (e) => handleKey(e, r, c));
        input.addEventListener("focus", () => highlightClue(cellInfo.words));

        inputs[r][c] = input;
        cellDiv.appendChild(input);
      }
      gridContainer.appendChild(cellDiv);
    }
  }
}

function renderClues() {
  cluesAcross.innerHTML = "";
  cluesDown.innerHTML = "";

  game.level.words.forEach((w) => {
    const li = document.createElement("li");
    li.textContent = `${w.id}. ${w.clue}`;
    li.id = `clue-${w.id}`;

    if (w.direction === "across") cluesAcross.appendChild(li);
    else cluesDown.appendChild(li);

    li.addEventListener("click", () => {
      // Focus first cell
      if (inputs[w.row][w.col]) inputs[w.row][w.col].focus();
    });
  });
}

// Navigation State
let currentDirection: "across" | "down" = "across";

function handleInput(e: Event, r: number, c: number) {
  const input = e.target as HTMLInputElement;
  const val = input.value;

  // allow valid inputs
  if (val.match(/[a-zA-Z]/)) {
    game.setUserInput(r, c, val);
    moveFocus(r, c, 1);
  } else {
    input.value = ""; // Clear invalid
  }
}

function handleKey(e: KeyboardEvent, r: number, c: number) {
  const input = e.target as HTMLInputElement;

  if (e.key === "Backspace") {
    if (input.value === "") {
      moveFocus(r, c, -1);
    } else {
      input.value = "";
      game.setUserInput(r, c, "");
    }
  } else if (e.key === "ArrowRight") {
    findNextFocus(r, c, 0, 1);
  } else if (e.key === "ArrowLeft") {
    findNextFocus(r, c, 0, -1);
  } else if (e.key === "ArrowDown") {
    findNextFocus(r, c, 1, 0);
  } else if (e.key === "ArrowUp") {
    findNextFocus(r, c, -1, 0);
  }
}

function moveFocus(r: number, c: number, dist: number) {
  // Determine direction based on Context?
  // Simplified: default Across unless we know?
  // We can infer direction if multiple active words.
  // Let's just try moving right for Across, down for Down.
  // If blocked, stop.

  // Better: Detect which word we are editing.
  // For now simple right/down preference logic.

  // If currentDirection is across
  if (currentDirection === "across") {
    const nextC = c + dist;
    if (inputs[r] && inputs[r][nextC]) {
      inputs[r][nextC].focus();
    }
  } else {
    const nextR = r + dist;
    if (inputs[nextR] && inputs[nextR][c]) {
      inputs[nextR][c].focus();
    }
  }
}

function findNextFocus(r: number, c: number, dr: number, dc: number) {
  // Just move to grid neighbor if exists
  const nr = r + dr;
  const nc = c + dc;
  if (inputs[nr] && inputs[nr][nc]) {
    inputs[nr][nc].focus();
    // Update direction inferrence if arrow keys used
    if (dr !== 0) currentDirection = "down";
    if (dc !== 0) currentDirection = "across";
  }
}

function highlightClue(words: CrosswordWord[]) {
  // Clear all
  document
    .querySelectorAll(".clue-section li")
    .forEach((l) => l.classList.remove("active"));

  words.forEach((w) => {
    const el = document.getElementById(`clue-${w.id}`);
    if (el) el.classList.add("active");

    // Update preference if unique
    if (words.length === 1) currentDirection = words[0].direction;
    // If multiple (intersection), preserve current if possible, else pick first?
    // Actually, if we just clicked, we don't change direction unless ambiguous?
    // Let's stick to currentDirection logic in handleInput/Key.
  });
}

function startGame() {
  overlay.style.display = "none";
  game.reset(); // Also wipes UI inputs via re-render? No
  document.querySelectorAll("input").forEach((i) => (i.value = ""));
}

startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  game.reset();
  document.querySelectorAll("input").forEach((i) => (i.value = ""));
  document
    .querySelectorAll(".cell")
    .forEach((c) => c.classList.remove("correct", "wrong"));
});

checkBtn.addEventListener("click", () => {
  // Visual Feedback
  const correct = game.checkWin();
  if (correct) {
    game.setState("won");
    alert(i18n.t("game.win"));
  } else {
    // Highlight wrong cells
    // Iterate grid
    for (let r = 0; r < game.level.rows; r++) {
      for (let c = 0; c < game.level.cols; c++) {
        // Checking input vs words is hard per cell if multiple words
        // But character must match expected character at that position!
        // We need expected Grid.
        // Let's construct expected grid once.
        // Or Iterate words and check.
        // Check if empty?
      }
    }
    // Simple: Check against words def
    let allCorrect = true;
    game.level.words.forEach((w) => {
      for (let i = 0; i < w.answer.length; i++) {
        let r = w.row;
        let c = w.col;
        if (w.direction === "across") c += i;
        else r += i;

        const val = game.userGrid[r][c];
        const expected = w.answer[i];
        if (val !== expected && inputs[r][c]) {
          inputs[r][c].parentElement?.classList.add("wrong");
          allCorrect = false;
        } else if (inputs[r][c]) {
          inputs[r][c].parentElement?.classList.add("correct");
          inputs[r][c].parentElement?.classList.remove("wrong");
        }
      }
    });
  }
});

// Init
initI18n();
initGame();
