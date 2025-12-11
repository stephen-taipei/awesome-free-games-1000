/**
 * Mirror Puzzle Main Entry
 * Game #035
 */
import { MirrorGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const statusDisplay = document.getElementById("status-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: MirrorGame;

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
  game = new MirrorGame(canvas);
  game.resize();

  // Mouse Inputs
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", (e) => handleInput("up", e));
  canvas.addEventListener("dblclick", (e) => handleInput("dblclick", e));

  // Touch (Double tap?)
  canvas.addEventListener("touchstart", (e) => handleTouch("down", e), {
    passive: false,
  });
  window.addEventListener("touchmove", (e) => handleTouch("move", e), {
    passive: false,
  });
  window.addEventListener("touchend", (e) => handleTouch("up", e), {
    passive: false,
  });

  game.setOnStateChange((state: any) => {
    if (state.hit !== undefined) {
      statusDisplay.textContent = state.hit
        ? i18n.t("game.connected")
        : i18n.t("game.searching");
      statusDisplay.style.color = state.hit ? "#2ecc71" : "#34495e";
    }

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function handleInput(type: "down" | "move" | "up" | "dblclick", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

let lastTap = 0;
function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  // Simple Double Tap detection
  if (type === "down") {
    const now = Date.now();
    if (now - lastTap < 300) {
      game.handleInput("dblclick", x, y);
    } else {
      game.handleInput("down", x, y);
    }
    lastTap = now;
  } else {
    game.handleInput(type, x, y);
  }
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 1000);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});

// Init
initI18n();
initGame();
