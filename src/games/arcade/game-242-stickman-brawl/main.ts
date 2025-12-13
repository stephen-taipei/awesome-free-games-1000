/**
 * Stickman Brawl Main Entry
 * Game #242
 */
import { StickmanBrawlGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const playerHpDisplay = document.getElementById("player-hp")!;
const enemyHpDisplay = document.getElementById("enemy-hp")!;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

// Mobile controls
const btnUp = document.getElementById("btn-up")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnPunch = document.getElementById("btn-punch")!;
const btnKick = document.getElementById("btn-kick")!;

let game: StickmanBrawlGame;

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
  game = new StickmanBrawlGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    playerHpDisplay.textContent = state.playerHp.toString();
    enemyHpDisplay.textContent = state.enemyHp.toString();
    scoreDisplay.textContent = state.score.toString();

    if (state.status === "lose") {
      showGameOver(state.score, state.round);
    }
  });

  // Mobile controls
  btnUp.addEventListener("touchstart", (e) => { e.preventDefault(); game.jump(); });
  btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveLeft(); });
  btnLeft.addEventListener("touchend", () => game.stopMove());
  btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); game.moveRight(); });
  btnRight.addEventListener("touchend", () => game.stopMove());
  btnPunch.addEventListener("touchstart", (e) => { e.preventDefault(); game.attack("punch"); });
  btnKick.addEventListener("touchstart", (e) => { e.preventDefault(); game.attack("kick"); });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number, round: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score} | Round: ${round}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
