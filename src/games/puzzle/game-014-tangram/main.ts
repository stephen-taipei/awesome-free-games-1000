/**
 * Tangram Main Entry
 * Game #014
 */
import { TangramGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const levelDisplay = document.getElementById("level-display")!;
const statusDisplay = document.getElementById("status-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;
const prevBtn = document.getElementById("prev-level")!;
const nextBtn = document.getElementById("next-level")!;

let game: TangramGame;

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
  game = new TangramGame(canvas);

  game.setOnStateChange((status) => {
    statusDisplay.textContent =
      status === "playing" ? i18n.t("game.playing") : i18n.t("game.won");
    if (status === "won") {
      // alert(i18n.t('game.won'));
    }
  });
}

function startGame() {
  overlay.style.display = "none";
  game.startLevel(0);
}

// Input Handling
function getPos(e: MouseEvent | TouchEvent) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else return null;
  } else if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else return null;

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

canvas.addEventListener("mousedown", (e) => {
  const pos = getPos(e);
  if (pos) game.handleDown(pos.x, pos.y);
});
canvas.addEventListener("mousemove", (e) => {
  const pos = getPos(e);
  if (pos) game.handleMove(pos.x, pos.y);
});
canvas.addEventListener("mouseup", () => game.handleUp());
canvas.addEventListener("mouseleave", () => game.handleUp());

// Touch
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) game.handleDown(pos.x, pos.y);
  },
  { passive: false }
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) game.handleMove(pos.x, pos.y);
  },
  { passive: false }
);
canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  game.handleUp();
});

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.resetPieces());
hintBtn.addEventListener("click", () => {
  alert(i18n.t("game.controls"));
});
prevBtn.addEventListener("click", () => {
  game.prevLevel();
  levelDisplay.textContent = (game["levelIndex"] + 1).toString();
});
nextBtn.addEventListener("click", () => {
  game.nextLevel();
  levelDisplay.textContent = (game["levelIndex"] + 1).toString();
});

// Init
initI18n();
initGame();
