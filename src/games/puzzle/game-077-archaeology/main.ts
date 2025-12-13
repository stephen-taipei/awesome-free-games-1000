/**
 * Archaeology Main Entry
 * Game #077
 */
import { ArchaeologyGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const artifactsDisplay = document.getElementById("artifacts-display")!;
const brushDisplay = document.getElementById("brush-display")!;

const toolBrush = document.getElementById("tool-brush")!;
const toolPick = document.getElementById("tool-pick")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: ArchaeologyGame;

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
  game = new ArchaeologyGame(canvas);
  game.resize();

  // Mouse inputs
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", () => handleInput("up", null));

  // Touch inputs
  canvas.addEventListener("touchstart", (e) => handleTouch("down", e), { passive: false });
  window.addEventListener("touchmove", (e) => handleTouch("move", e), { passive: false });
  window.addEventListener("touchend", () => handleInput("up", null), { passive: false });

  // Tool selection
  toolBrush.addEventListener("click", () => {
    game.setTool("brush");
    toolBrush.classList.add("active");
    toolPick.classList.remove("active");
    canvas.style.cursor = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><text y=\"24\" font-size=\"24\">🖌️</text></svg>') 0 32, auto";
  });

  toolPick.addEventListener("click", () => {
    game.setTool("pick");
    toolPick.classList.add("active");
    toolBrush.classList.remove("active");
    canvas.style.cursor = "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><text y=\"24\" font-size=\"24\">⛏️</text></svg>') 0 32, auto";
  });

  game.setOnStateChange((state) => {
    artifactsDisplay.textContent = `${state.artifactsFound}/${state.totalArtifacts}`;
    brushDisplay.textContent = `${state.brushHealth}%`;

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent | null) {
  if (!e && type === "up") {
    game.handleInput("up", 0, 0);
    return;
  }
  if (!e) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move", e: TouchEvent) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  game.handleInput(type, x, y);
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = "All artifacts discovered safely!";
    startBtn.textContent = i18n.t("game.reset");
    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
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
