/**
 * Endless Mode Main Entry
 * Game #269
 */
import { EndlessGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const waveDisplay = document.getElementById("wave-display")!;
const livesDisplay = document.getElementById("lives-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnUp = document.getElementById("btn-up")!;
const btnDown = document.getElementById("btn-down")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnFire = document.getElementById("btn-fire")!;

let game: EndlessGame;

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
  game = new EndlessGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        e.preventDefault();
        game.setKey("up", true);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        e.preventDefault();
        game.setKey("down", true);
        break;
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
      case " ":
        e.preventDefault();
        game.setKey("fire", true);
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        game.setKey("up", false);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        game.setKey("down", false);
        break;
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
      case " ":
        game.setKey("fire", false);
        break;
    }
  });

  // Mobile controls
  const setupMobileButton = (btn: HTMLElement, key: keyof Parameters<typeof game.setKey>[0] extends infer K ? K : never) => {
    btn.addEventListener("mousedown", () => game.setKey(key as any, true));
    btn.addEventListener("mouseup", () => game.setKey(key as any, false));
    btn.addEventListener("mouseleave", () => game.setKey(key as any, false));
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      game.setKey(key as any, true);
    });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      game.setKey(key as any, false);
    });
  };

  setupMobileButton(btnUp, "up");
  setupMobileButton(btnDown, "down");
  setupMobileButton(btnLeft, "left");
  setupMobileButton(btnRight, "right");
  setupMobileButton(btnFire, "fire");

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    waveDisplay.textContent = state.wave.toString();
    livesDisplay.textContent = state.lives.toString();

    if (state.status === "over") {
      showGameOver(state.score, state.wave);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number, wave: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score} | Wave: ${wave}`;
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
