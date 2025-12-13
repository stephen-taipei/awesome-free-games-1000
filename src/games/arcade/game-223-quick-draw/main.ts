/**
 * Quick Draw Main Entry
 * Game #223
 */
import { QuickDrawGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n/index";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const roundDisplay = document.getElementById("round-display")!;
const winsDisplay = document.getElementById("wins-display")!;
const bestDisplay = document.getElementById("best-display")!;
const gameArea = document.getElementById("game-area")!;
const duelScreen = document.getElementById("duel-screen")!;
const countdown = document.getElementById("countdown")!;
const statusText = document.getElementById("status-text")!;
const reactionTime = document.getElementById("reaction-time")!;
const timeValue = document.getElementById("time-value")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: QuickDrawGame;

function initI18n(): void {
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

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  game = new QuickDrawGame();

  game.onStateChange = (state: GameState) => {
    updateUI(state);
  };

  gameArea.addEventListener("click", handleClick);
  gameArea.addEventListener("touchstart", handleTouch, { passive: false });

  // Update best time display
  const state = game.getState();
  if (state.bestTime > 0) {
    bestDisplay.textContent = `${state.bestTime}ms`;
  }
}

function handleClick(): void {
  const state = game.getState();

  if (state.phase === "ready" || state.phase === "draw") {
    game.shoot();
  } else if (state.phase === "won" || state.phase === "lost" || state.phase === "tooEarly") {
    if (game.isGameComplete()) {
      showGameCompleteOverlay();
    } else {
      game.nextRound();
    }
  }
}

function handleTouch(e: TouchEvent): void {
  e.preventDefault();
  handleClick();
}

function updateUI(state: GameState): void {
  roundDisplay.textContent = `${state.round}/${game.getMaxRounds()}`;
  winsDisplay.textContent = state.wins.toString();

  if (state.bestTime > 0) {
    bestDisplay.textContent = `${state.bestTime}ms`;
  }

  // Update duel screen
  duelScreen.className = "duel-screen " + state.phase;

  // Countdown
  if (state.phase === "waiting" && state.countdown > 0) {
    countdown.style.display = "block";
    countdown.textContent = state.countdown.toString();
    statusText.style.display = "none";
    reactionTime.style.display = "none";
  } else {
    countdown.style.display = "none";
    statusText.style.display = "block";

    switch (state.phase) {
      case "ready":
        statusText.textContent = i18n.t("game.wait");
        reactionTime.style.display = "none";
        break;
      case "draw":
        statusText.textContent = i18n.t("game.draw");
        reactionTime.style.display = "none";
        break;
      case "won":
        statusText.textContent = i18n.t("game.won");
        showReactionTime(state.reactionTime);
        break;
      case "lost":
        statusText.textContent = i18n.t("game.lost");
        showReactionTime(state.reactionTime);
        break;
      case "tooEarly":
        statusText.textContent = i18n.t("game.tooEarly");
        reactionTime.style.display = "none";
        break;
    }
  }
}

function showReactionTime(time: number): void {
  reactionTime.style.display = "block";
  timeValue.textContent = time.toString();
}

function showGameCompleteOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameComplete");
  overlayMsg.textContent = `${i18n.t("game.wins")}: ${game.getState().wins}/${game.getMaxRounds()}`;
  startBtn.textContent = i18n.t("game.restart");
}

function startGame(): void {
  overlay.style.display = "none";
  game.start();
}

// Event listeners
startBtn.addEventListener("click", startGame);

// Cleanup
window.addEventListener("beforeunload", () => {
  game?.destroy();
});

// Initialize
initI18n();
initGame();
