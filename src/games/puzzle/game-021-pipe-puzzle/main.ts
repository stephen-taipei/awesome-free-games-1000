/**
 * Pipe Puzzle Main Entry
 * Game #021
 */
import { PipeGame, type PipeType, type Pipe } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const container = document.getElementById("grid-container") as HTMLElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const timeDisplay = document.getElementById("time-display")!;
const levelDisplay = document.getElementById("level-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;

let game: PipeGame;
let lastRenderTime = 0;

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
  game = new PipeGame(container);

  game.setOnStateChange((state: any) => {
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    // Render Grid if changed or first time
    // Optimisation: Diffing?
    // Or just complete redraw for now (6x6 is small).
    // Actually, we should redraw only rotations if possible?
    // Let's do full redraw but efficient SVG injection.

    renderGrid(state.grid);

    if (state.status === "won") {
      showWin();
    }
  });
}

function renderGrid(grid: Pipe[][]) {
  // Check if grid size changed
  const rows = grid.length;
  const cols = grid[0].length;

  // Set grid columns once
  if (container.style.gridTemplateColumns === "") {
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  }

  // Naive: Clear and Rebuild
  // Better: Update existing if count matches
  if (container.children.length === 0) {
    // Build
    grid.forEach((row) => {
      row.forEach((p) => {
        const cell = document.createElement("div");
        cell.className = "pipe-cell";
        cell.dataset.x = p.x.toString();
        cell.dataset.y = p.y.toString();

        cell.addEventListener("click", () => {
          game.rotatePipe(p.x, p.y);
        });

        container.appendChild(cell);
      });
    });
  }

  // Update visual state
  const cells = Array.from(container.children) as HTMLElement[];
  let idx = 0;

  grid.forEach((row) => {
    row.forEach((p) => {
      const cell = cells[idx++];
      const svg = getPipeSVG(p.type, p.active);

      // Check if SVG changed to avoid flicker?
      // Or just check data-type / data-active attrs
      const prevType = cell.dataset.type;
      const prevActive = cell.dataset.active;

      if (
        prevType !== p.type ||
        prevActive !== String(p.active) ||
        cell.innerHTML === ""
      ) {
        cell.innerHTML = svg;
        cell.dataset.type = p.type;
        cell.dataset.active = String(p.active);
      }

      // Update rotation transform
      // We set it on the SVG or the container?
      // SVG inside handles path? No, standard Pipe is Straight top-bottom.
      // Rotating cell div is easiest.
      cell.style.transform = `rotate(${p.rotation}deg)`;

      // Visual fix: active pipes need transition?
      // Transition handles transform.
      // Active Color change handles CSS class inside SVG?
      if (p.active) {
        cell.classList.add("pipe-active");
        cell.classList.remove("pipe-default");
      } else {
        cell.classList.add("pipe-default");
        cell.classList.remove("pipe-active");
      }
    });
  });
}

function getPipeSVG(type: PipeType, active: boolean): string {
  // Simple SVG Paths based on type
  // Viewbox 0 0 100 100
  // Stroke width 20?

  let d = "";
  // Standard: Center (50,50).
  // Top (50,0). Right (100,50). Bottom (50,100). Left (0,50).

  switch (type) {
    case "straight":
      d = "M50,0 L50,100";
      break;
    case "elbow":
      d = "M50,0 Q50,50 100,50"; // Top to Right curve? Or Line?
      // Line: M50,0 L50,50 L100,50
      d = "M50,0 L50,50 L100,50";
      break;
    case "t":
      d = "M50,0 L50,50 L100,50 M50,50 L50,100"; // Top, Right, Bottom
      break;
    case "cross":
      d = "M50,0 L50,100 M0,50 L100,50";
      break;
    case "start": // Start is Top? No, Start is fixed Right output.
      // Start and End are usually special images.
      // Let's just use Straight but with an arrowhead or box?
      // Game logic says Start has connections: [False, True, False, False]. Right.
      // So draw line from Center to Right. And maybe a box at Center.
      d = "M20,50 L100,50";
      break;
    case "end": // End is fixed Left input.
      d = "M0,50 L80,50";
      break;
    case "empty":
      return "";
  }

  // Add Start/End markers
  let extra = "";
  if (type === "start")
    extra = '<circle cx="35" cy="50" r="15" fill="#e74c3c" />';
  if (type === "end")
    extra = '<rect x="65" y="35" width="30" height="30" fill="#2ecc71" />';

  return `<svg class="pipe-svg" viewBox="0 0 100 100">
        <path d="${d}" />
        ${extra}
    </svg>`;
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.time")}: ${
      timeDisplay.textContent
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
