/**
 * Rope Puzzle Main Entry
 * Game #086
 */
import { RopePuzzleGame } from "./game";
import { translations } from "./i18n";

type Locale = "zh-TW" | "en" | "ja";

// Simple i18n implementation
const i18n = {
  locale: "en" as Locale,
  translations: {} as Record<string, Record<string, string>>,

  loadTranslations(locale: Locale, trans: Record<string, string>) {
    this.translations[locale] = trans;
  },

  setLocale(locale: Locale) {
    this.locale = locale;
  },

  getLocale(): Locale {
    return this.locale;
  },

  t(key: string): string {
    return this.translations[this.locale]?.[key] || key;
  },
};

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: RopePuzzleGame;

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
  game = new RopePuzzleGame(canvas);
  game.resize();

  // Mouse inputs
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", (e) => handleInput("up", e));

  // Touch inputs
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
    if (state.moves !== undefined) {
      movesDisplay.textContent = state.moves.toString();
    }

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
  });
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  game.handleInput(type, x, y);
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${game.getMoves()}`;

    if (game.hasMoreLevels()) {
      nextBtn.style.display = "inline-block";
      startBtn.textContent = i18n.t("game.reset");
    } else {
      nextBtn.style.display = "none";
      overlayTitle.textContent = i18n.t("game.complete");
      startBtn.textContent = i18n.t("game.start");
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  movesDisplay.textContent = "0";
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
