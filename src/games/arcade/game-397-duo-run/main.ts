/**
 * Duo Run Main Entry
 * Game #397
 */
import { DuoRunGame } from "./game";
import { translations } from "./i18n";

type Locale = "zh-TW" | "zh-CN" | "en" | "ja" | "ko";

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
const scoreDisplay = document.getElementById("score-display")!;
const coinsDisplay = document.getElementById("coins-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const restartBtn = document.getElementById("restart-btn")!;
const finalScoreDisplay = document.getElementById("final-score")!;

let game: DuoRunGame;
let highScore = parseInt(localStorage.getItem("duorun-highscore") || "0");

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-HK")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.includes("zh")) {
    i18n.setLocale("zh-CN");
  } else if (browserLang.includes("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.includes("ko")) {
    i18n.setLocale("ko");
  } else {
    i18n.setLocale("en");
  }

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
  game = new DuoRunGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.score !== undefined) {
      scoreDisplay.textContent = state.score.toString();
    }
    if (state.coins !== undefined) {
      coinsDisplay.textContent = state.coins.toString();
    }

    if (state.status === "gameover") {
      showGameOver();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
  });
}

function showGameOver() {
  setTimeout(() => {
    const finalScore = game.getScore();
    const finalCoins = game.getCoins();

    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem("duorun-highscore", highScore.toString());
    }

    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameover");
    overlayMsg.textContent = i18n.t("game.finalscore");
    finalScoreDisplay.textContent = `${i18n.t("game.score")}: ${finalScore} | ${i18n.t("game.coins")}: ${finalCoins}`;
    finalScoreDisplay.style.display = "block";
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  finalScoreDisplay.style.display = "none";
  game.start();
  scoreDisplay.textContent = "0";
  coinsDisplay.textContent = "0";
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => {
  game.reset();
  scoreDisplay.textContent = "0";
  coinsDisplay.textContent = "0";
});

// Init
initI18n();
initGame();
