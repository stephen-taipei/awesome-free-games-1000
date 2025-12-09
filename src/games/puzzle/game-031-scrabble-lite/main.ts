/**
 * Scrabble Lite Main Entry
 * Game #031
 */
import { ScrabbleGame, type Tile } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const boardDiv = document.getElementById("board")!;
const rackDiv = document.getElementById("rack")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const submitBtn = document.getElementById("submit-btn")!;
const shuffleBtn = document.getElementById("shuffle-btn")!;

let game: ScrabbleGame;

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
  game = new ScrabbleGame();

  game.setOnStateChange((state: any) => {
    renderBoard(state.board);
    renderRack(state.rack);
    scoreDisplay.textContent = state.score.toString();
  });
}

function renderBoard(board: any[][]) {
  boardDiv.innerHTML = "";

  board.forEach((row, y) => {
    row.forEach((cell: any, x: number) => {
      const cellDiv = document.createElement("div");
      cellDiv.className = "cell";
      if (cell.bonus) {
        cellDiv.classList.add(cell.bonus.toLowerCase());
        cellDiv.textContent = cell.bonus;
      }

      // Drop zone
      cellDiv.addEventListener("dragover", (e) => e.preventDefault());
      cellDiv.addEventListener("drop", (e: any) => {
        e.preventDefault();
        const tileId = e.dataTransfer.getData("tileId");
        game.moveTileToBoard(tileId, x, y);
      });

      // Tile Render
      if (cell.tile) {
        const tileDiv = createTileElement(cell.tile);
        tileDiv.classList.add("on-board");

        if (!cell.tile.locked) {
          tileDiv.draggable = true;
          tileDiv.addEventListener("dragstart", (e: any) => {
            e.dataTransfer.setData("tileId", cell.tile.id);
          });

          // Click to return? Double click?
          tileDiv.addEventListener("dblclick", () => {
            game.returnToRack(cell.tile);
          });
        } else {
          tileDiv.classList.add("locked");
        }

        cellDiv.appendChild(tileDiv);
      }

      boardDiv.appendChild(cellDiv);
    });
  });
}

function renderRack(rack: Tile[]) {
  rackDiv.innerHTML = "";
  rack.forEach((tile) => {
    const tDiv = createTileElement(tile);
    tDiv.draggable = true;
    tDiv.addEventListener("dragstart", (e: any) => {
      e.dataTransfer.setData("tileId", tile.id);
    });
    rackDiv.appendChild(tDiv);
  });

  // Allow drop back to rack
  rackDiv.addEventListener("dragover", (e) => e.preventDefault());
  rackDiv.addEventListener("drop", (e: any) => {
    e.preventDefault();
    const tileId = e.dataTransfer.getData("tileId");
    // Use existing helper? We need reference to tile object if coming from board?
    // Game logic find tile by ID in temp array
    const temp = game.placedTilesTemp.find((pt) => pt.tile.id === tileId);
    if (temp) {
      game.returnToRack(temp.tile);
    }
  });
}

function createTileElement(tile: Tile) {
  const div = document.createElement("div");
  div.className = "tile";
  div.textContent = tile.char;
  const sub = document.createElement("sub");
  sub.textContent = tile.points.toString();
  div.appendChild(sub);
  return div;
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.onclick = startGame;
});
submitBtn.addEventListener("click", () => game.submit());
shuffleBtn.addEventListener("click", () => game.shuffleRack());

// Init
initI18n();
initGame();
