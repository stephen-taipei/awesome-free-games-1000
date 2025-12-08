/**
 * Spot Difference Main Entry
 * Game #019
 */
import { SpotDifferenceGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvasL = document.getElementById("canvas-left") as HTMLCanvasElement;
const canvasR = document.getElementById("canvas-right") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const foundDisplay = document.getElementById("found-display")!;
const levelDisplay = document.getElementById("level-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;

let game: SpotDifferenceGame;

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
  game = new SpotDifferenceGame(canvasL, canvasR);

  game.setOnStateChange((state: any) => {
    foundDisplay.textContent = `${state.found}/${state.total}`;
    levelDisplay.textContent = state.level.toString();

    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    if (state.status === "won") {
      showWin();
    }
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.next") || "Next Level";

    startBtn.onclick = () => {
      game.startLevel(game.level + 1);
      overlay.style.display = "none";
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.startLevel(1);
}

function handleInput(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else return;
  } else {
    // Mouse
    clientX = (e as MouseEvent).clientX;
    clientY = (e as MouseEvent).clientY;
  }

  // Scale
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (clientX! - rect.left) * scaleX;
  const y = (clientY! - rect.top) * scaleY;

  game.checkClick(x, y);
}

// Attach events
[canvasL, canvasR].forEach((c) => {
  c.addEventListener("mousedown", (e) => handleInput(e, c));
  c.addEventListener("touchstart", (e) => handleInput(e, c), {
    passive: false,
  });
});

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.textContent = i18n.t("game.start");
  startBtn.onclick = startGame;
});

hintBtn.addEventListener("click", () => {
  game.hint();
});

// Init
initI18n();
initGame();
