/**
 * Magnet Ball Main Entry
 * Game #195
 */
import { MagnetBallGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const collectedDisplay = document.getElementById("collected-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnAttract = document.getElementById("btn-attract")!;
const btnRepel = document.getElementById("btn-repel")!;

let game: MagnetBallGame;

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
  game = new MagnetBallGame(canvas);
  game.resize();

  // Magnet mode buttons
  btnAttract.addEventListener("click", () => {
    game.setMagnetMode("attract");
    btnAttract.classList.add("selected");
    btnRepel.classList.remove("selected");
  });

  btnRepel.addEventListener("click", () => {
    game.setMagnetMode("repel");
    btnRepel.classList.add("selected");
    btnAttract.classList.remove("selected");
  });

  // Mouse controls
  canvas.addEventListener("mousedown", (e) => {
    game.setMagnetActive(true, e.clientX, e.clientY);
  });

  canvas.addEventListener("mousemove", (e) => {
    game.updateMagnetPosition(e.clientX, e.clientY);
  });

  canvas.addEventListener("mouseup", () => {
    game.setMagnetActive(false);
  });

  canvas.addEventListener("mouseleave", () => {
    game.setMagnetActive(false);
  });

  // Touch controls
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    game.setMagnetActive(true, touch.clientX, touch.clientY);
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    game.updateMagnetPosition(touch.clientX, touch.clientY);
  });

  canvas.addEventListener("touchend", () => {
    game.setMagnetActive(false);
  });

  game.setOnStateChange((state) => {
    levelDisplay.textContent = state.level.toString();
    collectedDisplay.textContent = `${state.collected}/${state.total}`;

    if (state.status === "over") {
      showGameOver();
    } else if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.start();
    };
  }, 500);
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.next");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
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
