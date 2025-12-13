/**
 * Light Speed Main Entry
 * Game #234 - Arcade
 */
import { LightSpeedGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const scoreDisplay = document.getElementById("score-display")!;
const bestDisplay = document.getElementById("best-display")!;
const livesDisplay = document.getElementById("lives-display")!;
const levelDisplay = document.getElementById("level-display")!;
const avgTimeDisplay = document.getElementById("avgtime-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const symbolButtons = document.getElementById("symbol-buttons")!;
const instructionsBtn = document.getElementById("instructions-btn")!;
const instructionsModal = document.getElementById("instructions-modal")!;
const closeInstructionsBtn = document.getElementById("close-instructions")!;

let game: LightSpeedGame;

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
    game.draw();
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new LightSpeedGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    bestDisplay.textContent = state.bestScore.toString();
    livesDisplay.textContent = "♥".repeat(state.lives);
    levelDisplay.textContent = state.level.toString();
    avgTimeDisplay.textContent = state.avgReactionTime > 0
      ? `${state.avgReactionTime}ms`
      : "-";

    if (state.status === "gameover") {
      showGameOver();
    }
  });

  game.setOnChallengeReady((challenge) => {
    if (challenge.type === "symbol" && challenge.options) {
      showSymbolButtons(challenge.options, challenge.correctAnswer);
    } else {
      hideSymbolButtons();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showSymbolButtons(options: string[], correctAnswer: string) {
  symbolButtons.innerHTML = "";
  symbolButtons.style.display = "flex";

  options.forEach((symbol) => {
    const btn = document.createElement("button");
    btn.className = "btn symbol-btn";
    btn.textContent = symbol;
    btn.onclick = () => {
      game.respond(symbol);
    };
    symbolButtons.appendChild(btn);
  });
}

function hideSymbolButtons() {
  symbolButtons.style.display = "none";
  symbolButtons.innerHTML = "";
}

function showGameOver() {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = `${i18n.t("game.finalScore")}: ${scoreDisplay.textContent}`;
  startBtn.textContent = i18n.t("game.restart");

  startBtn.onclick = () => {
    startGame();
  };
}

function startGame() {
  overlay.style.display = "none";
  hideSymbolButtons();
  game.start();
}

// Event Listeners
startBtn.addEventListener("click", startGame);

canvas.addEventListener("click", () => {
  game.handleClick();
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  game.handleClick();
});

// Keyboard
document.addEventListener("keydown", (e) => {
  game.handleKeyPress(e.key);
});

// Instructions modal
instructionsBtn.addEventListener("click", () => {
  instructionsModal.style.display = "flex";
});

closeInstructionsBtn.addEventListener("click", () => {
  instructionsModal.style.display = "none";
});

instructionsModal.addEventListener("click", (e) => {
  if (e.target === instructionsModal) {
    instructionsModal.style.display = "none";
  }
});

// Init
initI18n();
initGame();
