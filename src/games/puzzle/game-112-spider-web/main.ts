/**
 * Spider Web Main Entry
 * Game #112
 */
import { SpiderWebGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const threadsDisplay = document.getElementById("threads-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: SpiderWebGame;

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
  game = new SpiderWebGame(canvas);
  game.resize();

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleInput("down", e.clientX - rect.left, e.clientY - rect.top);
  });
  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleInput("move", e.clientX - rect.left, e.clientY - rect.top);
  });
  window.addEventListener("mouseup", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleInput("up", e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    game.handleInput("down", touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });
  window.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    game.handleInput("move", touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });
  window.addEventListener("touchend", (e) => {
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    game.handleInput("up", touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.threads !== undefined) threadsDisplay.textContent = state.threads;
    if (state.level !== undefined) levelDisplay.textContent = String(state.level);
    if (state.status === "won") showWin(state.hasNextLevel);
  });

  window.addEventListener("resize", () => game.resize());
}

function showWin(hasNextLevel: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";
    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => { overlay.style.display = "none"; game.nextLevel(); };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => { game.setLevel(0); levelDisplay.textContent = "1"; startGame(); };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());

initI18n();
initGame();
