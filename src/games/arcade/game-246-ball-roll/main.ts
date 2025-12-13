/**
 * Ball Roll Main Entry
 * Game #246
 */
import { BallRollGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const levelDisplay = document.getElementById("level-display")!;
const livesDisplay = document.getElementById("lives-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: BallRollGame;

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
  game = new BallRollGame(canvas);
  game.resize();

  // Keyboard controls
  const keys: Record<string, boolean> = {};

  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    updateTilt();
  });

  document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    updateTilt();
  });

  function updateTilt() {
    let tx = 0;
    let ty = 0;
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) tx -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) tx += 1;
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) ty -= 1;
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) ty += 1;
    game.setTilt(tx, ty);
  }

  // Device orientation for mobile
  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", (e) => {
      if (e.gamma !== null && e.beta !== null) {
        const tiltX = Math.max(-1, Math.min(1, e.gamma / 30));
        const tiltY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
        game.setTilt(tiltX, tiltY);
      }
    });
  }

  // Touch controls for non-gyro devices
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const dx = (e.touches[0].clientX - touchStartX) / 50;
    const dy = (e.touches[0].clientY - touchStartY) / 50;
    game.setTilt(Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy)));
  });

  canvas.addEventListener("touchend", () => {
    game.setTilt(0, 0);
  });

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    levelDisplay.textContent = state.level.toString();
    livesDisplay.textContent = state.lives.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    } else if (state.status === "won") {
      showLevelComplete(state.level, state.score);
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
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
  }, 300);
}

function showLevelComplete(level: number, score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.levelComplete");
    overlayMsg.textContent = `${i18n.t("game.level")} ${level} - ${i18n.t("game.score")}: ${score}`;
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

function nextLevel() {
  overlay.style.display = "none";
  game.nextLevel();
}

startBtn.addEventListener("click", startGame);
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
