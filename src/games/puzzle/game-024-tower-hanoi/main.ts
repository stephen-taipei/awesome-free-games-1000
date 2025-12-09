/**
 * Tower Hanoi Main Entry
 * Game #024
 */
import { HanoiGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const towerDivs = [0, 1, 2].map((i) => document.getElementById(`tower-${i}`)!);
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const minMovesDisplay = document.getElementById("min-moves-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const diskSelect = document.getElementById("disk-select") as HTMLSelectElement;

const resetBtn = document.getElementById("reset-btn")!;

let game: HanoiGame;
const DISK_COLORS = [
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#34495e",
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
  game = new HanoiGame();

  // Bind Tower Clicks
  towerDivs.forEach((t, idx) => {
    t.addEventListener("click", () => {
      game.selectTower(idx);
    });
  });

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();
    minMovesDisplay.textContent = state.minMoves.toString();

    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    renderTowers(state.towers, state.selected);

    if (state.status === "won") {
      showWin();
    }
  });
}

function renderTowers(towers: number[][], selectedTower: number | null) {
  towerDivs.forEach((div, idx) => {
    // Clear Disks only (keep pole/base)
    // Pole and Base are first two children? Check HTML structure
    // Index.html: pole, base. Disks follow.

    // Remove old disks
    const disks = div.querySelectorAll(".disk");
    disks.forEach((d) => d.remove());

    // Add new disks
    const stack = towers[idx];
    stack.forEach((diskSize: number, i: number) => {
      const disk = document.createElement("div");
      disk.className = "disk";

      // Calc width: Max width say 90% of tower width?
      // Min width say 20%?
      // Disk value 1..N
      // Width % = 20 + (diskSize / maxDisks) * 70?
      // Actually maxDisks varies.
      // Just use diskSize as modifier. Max supported 7.
      // Width = (diskSize * 10) + 20 + '%'; ?
      // Let's assume max disk is 7.
      const width = 25 + diskSize * 10; // 35% to 95%
      disk.style.width = `${width}%`;
      disk.style.backgroundColor =
        DISK_COLORS[(diskSize - 1) % DISK_COLORS.length];

      // Handle Selection Visual
      // If this tower is selected, raise only the TOP disk
      if (selectedTower === idx && i === stack.length - 1) {
        disk.classList.add("selected");
      }

      // Order: Reverse?
      // Flex column-reverse: First child is at bottom.
      // Stack[0] (Base) should be first child appended? Yes.
      // Wait, array [N, ..., 1]. N is bottom.
      // So append in order 0..L-1

      div.appendChild(disk);
    });

    if (selectedTower === idx) {
      div.classList.add("selected-tower");
    } else {
      div.classList.remove("selected-tower");
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
  const disks = parseInt(diskSelect.value, 10);
  game.start(disks);
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.onclick = startGame;
});

// Init
initI18n();
initGame();
