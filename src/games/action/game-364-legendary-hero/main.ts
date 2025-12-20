/**
 * Legendary Hero Main Entry
 * Game #364
 */
import { LegendaryHeroGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const healthDisplay = document.getElementById("health-display")!;
const legendDisplay = document.getElementById("legend-display")!;
const comboDisplay = document.getElementById("combo-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnAttack1 = document.getElementById("btn-attack1")!;
const btnAttack2 = document.getElementById("btn-attack2")!;

let game: LegendaryHeroGame;

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
  game = new LegendaryHeroGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
      case "w":
      case "arrowup":
        e.preventDefault();
        game.setKey("up", true);
        break;
      case "s":
      case "arrowdown":
        e.preventDefault();
        game.setKey("down", true);
        break;
      case "a":
      case "arrowleft":
        e.preventDefault();
        game.setKey("left", true);
        break;
      case "d":
      case "arrowright":
        e.preventDefault();
        game.setKey("right", true);
        break;
      case "j":
        e.preventDefault();
        game.lightAttack();
        break;
      case "k":
        e.preventDefault();
        game.heavyAttack();
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key.toLowerCase()) {
      case "w":
      case "arrowup":
        game.setKey("up", false);
        break;
      case "s":
      case "arrowdown":
        game.setKey("down", false);
        break;
      case "a":
      case "arrowleft":
        game.setKey("left", false);
        break;
      case "d":
      case "arrowright":
        game.setKey("right", false);
        break;
    }
  });

  // Mobile controls
  btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); game.setKey("left", true); });
  btnLeft.addEventListener("touchend", () => game.setKey("left", false));
  btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); game.setKey("right", true); });
  btnRight.addEventListener("touchend", () => game.setKey("right", false));
  btnAttack1.addEventListener("click", () => game.lightAttack());
  btnAttack2.addEventListener("click", () => game.heavyAttack());

  // Mouse fallback
  btnLeft.addEventListener("mousedown", () => game.setKey("left", true));
  btnLeft.addEventListener("mouseup", () => game.setKey("left", false));
  btnLeft.addEventListener("mouseleave", () => game.setKey("left", false));
  btnRight.addEventListener("mousedown", () => game.setKey("right", true));
  btnRight.addEventListener("mouseup", () => game.setKey("right", false));
  btnRight.addEventListener("mouseleave", () => game.setKey("right", false));

  game.setOnStateChange((state) => {
    healthDisplay.textContent = state.health.toString();
    legendDisplay.textContent = state.legend.toString();
    comboDisplay.textContent = state.combo.toString();

    if (state.status === "over") {
      showGameOver(state.legend);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(legend: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.legend")}: ${legend}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
initI18n();
initGame();
