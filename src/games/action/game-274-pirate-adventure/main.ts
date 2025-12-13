/**
 * Pirate Adventure Main Entry
 * Game #274
 */
import { PirateGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const goldDisplay = document.getElementById("gold-display")!;
const healthDisplay = document.getElementById("health-display")!;
const levelDisplay = document.getElementById("level-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnJump = document.getElementById("btn-jump")!;
const btnAttack = document.getElementById("btn-attack")!;

let game: PirateGame;
let isLevelClear = false;

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
  game = new PirateGame(canvas);
  game.resize();

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        game.setKey("left", true);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        game.setKey("right", true);
        break;
      case "ArrowUp":
      case "w":
      case "W":
        e.preventDefault();
        game.jump();
        break;
      case " ":
        e.preventDefault();
        game.attack();
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        game.setKey("left", false);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        game.setKey("right", false);
        break;
    }
  });

  // Mobile controls
  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.setKey("left", true);
  });
  btnLeft.addEventListener("touchend", () => game.setKey("left", false));

  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.setKey("right", true);
  });
  btnRight.addEventListener("touchend", () => game.setKey("right", false));

  btnJump.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.jump();
  });

  btnAttack.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.attack();
  });

  // Mouse fallback for mobile buttons
  btnLeft.addEventListener("mousedown", () => game.setKey("left", true));
  btnLeft.addEventListener("mouseup", () => game.setKey("left", false));
  btnLeft.addEventListener("mouseleave", () => game.setKey("left", false));

  btnRight.addEventListener("mousedown", () => game.setKey("right", true));
  btnRight.addEventListener("mouseup", () => game.setKey("right", false));
  btnRight.addEventListener("mouseleave", () => game.setKey("right", false));

  btnJump.addEventListener("click", () => game.jump());
  btnAttack.addEventListener("click", () => game.attack());

  game.setOnStateChange((state) => {
    goldDisplay.textContent = state.gold.toString();
    healthDisplay.textContent = state.health.toString();
    levelDisplay.textContent = state.level.toString();

    if (state.status === "over") {
      showGameOver(state.gold);
    } else if (state.status === "clear") {
      showLevelClear(state.level);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(gold: number) {
  isLevelClear = false;
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.gold")}: ${gold}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 500);
}

function showLevelClear(level: number) {
  isLevelClear = true;
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.clear");
    overlayMsg.textContent = `${i18n.t("game.level")} ${level} ${i18n.t("game.clear")}`;
    startBtn.textContent = i18n.t("game.next");
  }, 500);
}

function handleStart() {
  overlay.style.display = "none";
  if (isLevelClear) {
    game.nextLevel();
  } else {
    game.start();
  }
}

startBtn.addEventListener("click", handleStart);
initI18n();
initGame();
