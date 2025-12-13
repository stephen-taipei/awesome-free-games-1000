/**
 * Bumper Cars Main Entry
 * Game #189
 */
import { BumperCarsGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;
const hitsDisplay = document.getElementById("hits-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnUp = document.getElementById("btn-up")!;
const btnDown = document.getElementById("btn-down")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: BumperCarsGame;

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
  game = new BumperCarsGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    game.setKey(e.key, true);
  });

  document.addEventListener("keyup", (e) => {
    game.setKey(e.key, false);
  });

  // Mobile controls
  const setupButton = (btn: HTMLElement, direction: "up" | "down" | "left" | "right") => {
    let interval: number | null = null;

    const start = () => {
      game.accelerate(direction);
      interval = window.setInterval(() => game.accelerate(direction), 50);
    };

    const stop = () => {
      if (interval) clearInterval(interval);
    };

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      start();
    });
    btn.addEventListener("touchend", stop);
    btn.addEventListener("mousedown", start);
    btn.addEventListener("mouseup", stop);
    btn.addEventListener("mouseleave", stop);
  };

  setupButton(btnUp, "up");
  setupButton(btnDown, "down");
  setupButton(btnLeft, "left");
  setupButton(btnRight, "right");

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    timeDisplay.textContent = state.time.toString();
    hitsDisplay.textContent = state.hits.toString();

    if (state.status === "over") {
      showGameOver(state.score, state.hits);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number, hits: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score} | ${i18n.t("game.hits")}: ${hits}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
