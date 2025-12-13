/**
 * Rhythm Battle Main Entry
 * Game #240
 */
import { RhythmBattleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const comboDisplay = document.getElementById("combo-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const laneButtons = document.querySelectorAll(".lane-btn");

let game: RhythmBattleGame;

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
  game = new RhythmBattleGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    comboDisplay.textContent = state.combo.toString();

    if (state.status === "over") {
      showGameOver(state.score, state.maxCombo);
    }
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    const keyMap: Record<string, number> = {
      a: 0,
      A: 0,
      s: 1,
      S: 1,
      d: 2,
      D: 2,
      f: 3,
      F: 3,
    };

    if (e.key in keyMap) {
      e.preventDefault();
      game.hitLane(keyMap[e.key]);
      highlightButton(keyMap[e.key]);
    }
  });

  // Mobile button controls
  laneButtons.forEach((btn) => {
    const lane = parseInt(btn.getAttribute("data-lane") || "0");

    btn.addEventListener("click", () => {
      game.hitLane(lane);
      highlightButton(lane);
    });

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      game.hitLane(lane);
      highlightButton(lane);
    });
  });

  window.addEventListener("resize", () => game.resize());
}

function highlightButton(lane: number) {
  const btn = laneButtons[lane];
  btn.classList.add("active");
  setTimeout(() => btn.classList.remove("active"), 100);
}

function showGameOver(score: number, maxCombo: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score} | Max Combo: ${maxCombo}`;
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
