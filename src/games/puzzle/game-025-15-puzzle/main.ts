/**
 * 15 Puzzle Main Entry
 * Game #025
 */
import { Puzzle15Game } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const gridContainer = document.getElementById("grid-container")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;

let game: Puzzle15Game;

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
  game = new Puzzle15Game();

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();

    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    renderGrid(state.tiles);

    if (state.status === "won") {
      showWin();
    }
  });
}

function renderGrid(tiles: number[]) {
  // For CSS Grid, we can just place items in order.
  // However, to animate, we might want absolute positioning?
  // Let's stick to simple grid redraw for MVP, adds 'correct' class.
  // Actually, simple redraw kills transitions.
  // If we want transitions (defined in CSS), we need to map Tile Value -> DOM Element and update its 'order' or transform.
  // CSS Grid 'order' property is perfect for this!

  // First run: Create elements 1-15.
  if (gridContainer.children.length === 0) {
    for (let i = 1; i <= 15; i++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = i.toString();
      tile.id = `tile-${i}`;
      tile.addEventListener("click", () => {
        game.move(i);
      });
      gridContainer.appendChild(tile);
    }
    // Empty slot implicit?
    // We can create a spacer or just handle layout.
    // With CSS Grid, easiest is to have 16 slots.
    // 0 is empty.
    const empty = document.createElement("div");
    empty.className = "tile tile-empty";
    empty.id = "tile-0";
    gridContainer.appendChild(empty);
  }

  // Update Order
  // tiles array indices are positions 0..15. Values are tile IDs.
  // So if tiles[0] is 5, then element #tile-5 should have order: 0.

  tiles.forEach((val, pos) => {
    const el = document.getElementById(`tile-${val}`);
    if (el) {
      el.style.order = pos.toString();

      // Check correct position
      if (val !== 0) {
        if (val === pos + 1) el.classList.add("correct");
        else el.classList.remove("correct");
      }
    }
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${
      moveDisplay.textContent
    }`;
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.textContent = i18n.t("game.start");
  startBtn.onclick = startGame;
});

// Init
initI18n();
initGame();
