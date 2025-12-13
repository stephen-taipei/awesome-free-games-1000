/**
 * Puzzle Fighter Main Entry
 * Game #172
 */
import { PuzzleFighterGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const playerDisplay = document.getElementById("player-display")!;
const cpuDisplay = document.getElementById("cpu-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: PuzzleFighterGame;

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
  game = new PuzzleFighterGame(canvas);
  game.resize();

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
      game.handleKeyDown(e.key);
    }
  });

  game.setOnStateChange((state: any) => {
    if (state.playerGarbage !== undefined) {
      playerDisplay.textContent = state.playerGarbage > 0 ? `+${state.playerGarbage}` : "0";
    }
    if (state.cpuGarbage !== undefined) {
      cpuDisplay.textContent = state.cpuGarbage > 0 ? `+${state.cpuGarbage}` : "0";
    }
    if (state.status === "over") showGameOver(state.playerWon);
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(playerWon: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = playerWon ? i18n.t("game.win") : i18n.t("game.lose");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.reset");
    startBtn.onclick = () => { overlay.style.display = "none"; game.reset(); };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());

initI18n();
initGame();
