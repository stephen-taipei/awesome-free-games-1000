/**
 * Bug Crisis Main Entry
 * Game #204
 */
import { BugCrisisGame } from "./game";
import { translations } from "./i18n";

type Locale = "zh-TW" | "en" | "ja";

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
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const waveDisplay = document.getElementById("wave-display")!;
const scoreDisplay = document.getElementById("score-display")!;
const livesDisplay = document.getElementById("lives-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: BugCrisisGame;

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
  game = new BugCrisisGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.score !== undefined) {
      scoreDisplay.textContent = state.score.toString();
    }
    if (state.lives !== undefined) {
      livesDisplay.textContent = state.lives.toString();
    }

    if (state.status === "won") {
      showWin();
    } else if (state.status === "lost") {
      showLost();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${game.getScore()}`;

    if (game.hasMoreLevels()) {
      nextBtn.style.display = "inline-block";
      startBtn.textContent = i18n.t("game.reset");
    } else {
      nextBtn.style.display = "none";
      overlayTitle.textContent = i18n.t("game.complete");
      startBtn.textContent = i18n.t("game.start");
    }
  }, 300);
}

function showLost() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameover");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${game.getScore()}`;
    nextBtn.style.display = "none";
    startBtn.textContent = i18n.t("game.reset");
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  waveDisplay.textContent = game.getLevel().toString();
  scoreDisplay.textContent = "0";
  livesDisplay.textContent = "5";
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  waveDisplay.textContent = game.getLevel().toString();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  waveDisplay.textContent = game.getLevel().toString();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
