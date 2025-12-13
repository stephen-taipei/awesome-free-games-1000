/**
 * Pixel Survival Main Entry
 * Game #235
 */
import { PixelSurvivalGame } from "./game";
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
const timeDisplay = document.getElementById("time-display")!;
const highscoreDisplay = document.getElementById("highscore-display")!;
const enemyDisplay = document.getElementById("enemy-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const restartBtn = document.getElementById("restart-btn")!;
const instructionsBtn = document.getElementById("instructions-btn")!;
const instructionsModal = document.getElementById("instructions-modal")!;
const closeModalBtn = document.getElementById("close-modal-btn")!;

let game: PixelSurvivalGame;
let highScore = 0;

// Load high score from localStorage
const STORAGE_KEY = "pixel-survival-highscore";
const storedHighScore = localStorage.getItem(STORAGE_KEY);
if (storedHighScore) {
  highScore = parseInt(storedHighScore, 10);
}

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-Hant")) {
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
  highscoreDisplay.textContent = highScore.toString();
}

function initGame() {
  game = new PixelSurvivalGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.score !== undefined) {
      scoreDisplay.textContent = state.score.toString();
    }
    if (state.time !== undefined) {
      const minutes = Math.floor(state.time / 60);
      const seconds = state.time % 60;
      timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    if (state.enemyCount !== undefined) {
      enemyDisplay.textContent = state.enemyCount.toString();
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
  const finalScore = game.getScore();
  const finalTime = game.getTime();

  // Update high score
  if (finalScore > highScore) {
    highScore = finalScore;
    localStorage.setItem(STORAGE_KEY, highScore.toString());
    highscoreDisplay.textContent = highScore.toString();
  }

  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameover");

    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    overlayMsg.innerHTML = `
      ${i18n.t("game.finalscore")}: <strong>${finalScore}</strong><br>
      ${i18n.t("game.survived")}: <strong>${minutes}:${seconds.toString().padStart(2, '0')}</strong>
    `;

    startBtn.textContent = i18n.t("game.restart");
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  scoreDisplay.textContent = "0";
  timeDisplay.textContent = "0:00";
  enemyDisplay.textContent = "0";
}

function showInstructions() {
  instructionsModal.style.display = "flex";
}

function hideInstructions() {
  instructionsModal.style.display = "none";
}

// Event listeners
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => {
  game.start();
  scoreDisplay.textContent = "0";
  timeDisplay.textContent = "0:00";
  enemyDisplay.textContent = "0";
});
instructionsBtn.addEventListener("click", showInstructions);
closeModalBtn.addEventListener("click", hideInstructions);

instructionsModal.addEventListener("click", (e) => {
  if (e.target === instructionsModal) {
    hideInstructions();
  }
});

// Init
initI18n();
initGame();
