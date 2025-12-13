/**
 * Wild West Main Entry
 * Game #275
 */
import { WildWestGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const bulletsDisplay = document.getElementById("bullets-display")!;
const waveDisplay = document.getElementById("wave-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnReload = document.getElementById("btn-reload")!;
const btnShoot = document.getElementById("btn-shoot")!;

let game: WildWestGame;

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
  game = new WildWestGame(canvas);
  game.resize();

  // Mouse controls
  canvas.addEventListener("mousemove", (e) => {
    game.setCrosshair(e.clientX, e.clientY);
  });

  canvas.addEventListener("click", (e) => {
    game.shoot(e.clientX, e.clientY);
  });

  // Touch controls
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    game.shoot(touch.clientX, touch.clientY);
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    game.setCrosshair(touch.clientX, touch.clientY);
  });

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      game.reload();
    }
  });

  // Mobile controls
  btnReload.addEventListener("click", () => game.reload());
  btnShoot.addEventListener("click", () => game.shoot());

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    bulletsDisplay.textContent = state.bullets.toString();
    waveDisplay.textContent = state.wave.toString();

    if (state.status === "over") {
      showGameOver(state.score, state.wave);
    }
  });

  window.addEventListener("resize", () => game.resize());

  // Hide cursor over canvas
  canvas.style.cursor = "none";
}

function showGameOver(score: number, wave: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score} | ${i18n.t("game.wave")}: ${wave}`;
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
