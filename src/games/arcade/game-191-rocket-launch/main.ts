/**
 * Rocket Launch Main Entry
 * Game #191
 */
import { RocketLaunchGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const altitudeDisplay = document.getElementById("altitude-display")!;
const fuelDisplay = document.getElementById("fuel-display")!;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnThrust = document.getElementById("btn-thrust")!;

let game: RocketLaunchGame;

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
  game = new RocketLaunchGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    game.setKey(e.key, true);
  });

  document.addEventListener("keyup", (e) => {
    game.setKey(e.key, false);
  });

  // Mobile controls - steering
  let leftInterval: number | null = null;
  let rightInterval: number | null = null;

  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.steer("left");
    leftInterval = window.setInterval(() => game.steer("left"), 30);
  });

  btnLeft.addEventListener("touchend", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.steer("right");
    rightInterval = window.setInterval(() => game.steer("right"), 30);
  });

  btnRight.addEventListener("touchend", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  // Mouse support for steering
  btnLeft.addEventListener("mousedown", () => {
    game.steer("left");
    leftInterval = window.setInterval(() => game.steer("left"), 30);
  });

  btnLeft.addEventListener("mouseup", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnLeft.addEventListener("mouseleave", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnRight.addEventListener("mousedown", () => {
    game.steer("right");
    rightInterval = window.setInterval(() => game.steer("right"), 30);
  });

  btnRight.addEventListener("mouseup", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  btnRight.addEventListener("mouseleave", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  // Thrust button
  btnThrust.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.setThrust(true);
  });

  btnThrust.addEventListener("touchend", () => {
    game.setThrust(false);
  });

  btnThrust.addEventListener("mousedown", () => {
    game.setThrust(true);
  });

  btnThrust.addEventListener("mouseup", () => {
    game.setThrust(false);
  });

  btnThrust.addEventListener("mouseleave", () => {
    game.setThrust(false);
  });

  game.setOnStateChange((state) => {
    altitudeDisplay.textContent = state.altitude.toString();
    fuelDisplay.textContent = Math.floor(state.fuel).toString();
    scoreDisplay.textContent = state.score.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    } else if (state.status === "won") {
      showWin(state.score);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function showWin(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
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
