/**
 * Bejeweled Main Entry
 * Game #011
 */
import { BejeweledGame, type GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const scoreDisplay = document.getElementById("score-display")!;
const levelDisplay = document.getElementById("level-display")!;
const levelProgress = document.getElementById("level-progress")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;

let game: BejeweledGame;

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
  game = new BejeweledGame(canvas);

  game.setOnStateChange((state: GameState) => {
    scoreDisplay.textContent = state.score.toString();
    levelDisplay.textContent = state.level.toString();
    levelProgress.style.width = `${state.progress}%`;

    if (state.status === "gameover") {
      showGameOver(state.score);
    }
  });

  game.setOnGameOver((score) => {
    showGameOver(score);
  });
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

function showGameOver(score: number) {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
  startBtn.textContent = i18n.t("game.reset");
}

// Input Handling
function handleInput(e: MouseEvent | TouchEvent) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else return;
  } else if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else return;

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  game.handleInput(x, y);
}

canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    handleInput(e);
  },
  { passive: false }
);

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", startGame);
hintBtn.addEventListener("click", () => game.getHint());

// Init
initI18n();
initGame();
