/**
 * Space Invaders Main Entry
 * Game #155
 */
import { SpaceInvadersGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const levelDisplay = document.getElementById("level-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

// Mobile controls
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnFire = document.getElementById("btn-fire")!;

let game: SpaceInvadersGame;

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
  game = new SpaceInvadersGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      game.shoot();
    }
    game.setKey(e.key, true);
  });

  document.addEventListener("keyup", (e) => {
    game.setKey(e.key, false);
  });

  // Mobile button controls
  let leftInterval: number | null = null;
  let rightInterval: number | null = null;

  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.movePlayer("left");
    leftInterval = window.setInterval(() => game.movePlayer("left"), 50);
  });

  btnLeft.addEventListener("touchend", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.movePlayer("right");
    rightInterval = window.setInterval(() => game.movePlayer("right"), 50);
  });

  btnRight.addEventListener("touchend", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  btnFire.addEventListener("click", () => game.shoot());

  // Mouse click for desktop
  btnLeft.addEventListener("mousedown", () => {
    game.movePlayer("left");
    leftInterval = window.setInterval(() => game.movePlayer("left"), 50);
  });

  btnLeft.addEventListener("mouseup", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnLeft.addEventListener("mouseleave", () => {
    if (leftInterval) clearInterval(leftInterval);
  });

  btnRight.addEventListener("mousedown", () => {
    game.movePlayer("right");
    rightInterval = window.setInterval(() => game.movePlayer("right"), 50);
  });

  btnRight.addEventListener("mouseup", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  btnRight.addEventListener("mouseleave", () => {
    if (rightInterval) clearInterval(rightInterval);
  });

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    livesDisplay.textContent = state.lives.toString();
    levelDisplay.textContent = state.level.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    } else if (state.status === "levelComplete") {
      showLevelComplete(state.level);
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
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.start();
    };
  }, 300);
}

function showLevelComplete(level: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = `${i18n.t("game.level")} ${level} ${i18n.t("game.win")}`;
    overlayMsg.textContent = i18n.t("game.nextLevel");
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
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
