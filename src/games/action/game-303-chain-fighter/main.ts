/**
 * Chain Fighter Main Entry
 * Game #303
 */
import { ChainFighterGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const waveDisplay = document.getElementById("wave-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: ChainFighterGame;

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
  game = new ChainFighterGame(canvas);
  game.resize();

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  });

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
        e.preventDefault();
        game.setKey("left", true);
        break;
      case "ArrowRight":
      case "d":
        e.preventDefault();
        game.setKey("right", true);
        break;
      case "z":
      case "Z":
        e.preventDefault();
        game.setKey("attack", true);
        break;
      case "x":
      case "X":
        e.preventDefault();
        game.setKey("grab", true);
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
        game.setKey("left", false);
        break;
      case "ArrowRight":
      case "d":
        game.setKey("right", false);
        break;
      case "z":
      case "Z":
        game.setKey("attack", false);
        break;
      case "x":
      case "X":
        game.setKey("grab", false);
        break;
    }
  });

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = Math.floor(state.score).toString();
    waveDisplay.textContent = state.wave.toString();

    if (state.status === "waveEnd") {
      showWaveClear(state.wave, state.score);
    } else if (state.status === "over") {
      showGameOver(state.score);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showWaveClear(wave: number, score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.clear");
    overlayMsg.textContent = `Wave ${wave} - Score: ${Math.floor(score)}`;
    startBtn.textContent = i18n.t("game.next");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextWave();
    };
  }, 500);
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Final Score: ${Math.floor(score)}`;
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = startGame;
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);

initI18n();
initGame();
