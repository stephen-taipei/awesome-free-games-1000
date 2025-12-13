/**
 * Space Walk Main Entry
 * Game #233
 */
import { SpaceWalkGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highScoreDisplay = document.getElementById("high-score-display")!;
const oxygenDisplay = document.getElementById("oxygen-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const instructionsBtn = document.getElementById("instructions-btn")!;
const instructionsModal = document.getElementById("instructions-modal")!;
const closeModalBtn = document.getElementById("close-modal")!;

// Mobile controls
const btnUp = document.getElementById("btn-up")!;
const btnDown = document.getElementById("btn-down")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: SpaceWalkGame;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.startsWith("zh-TW") || browserLang.startsWith("zh-HK")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.startsWith("zh")) {
    i18n.setLocale("zh-CN");
  } else if (browserLang.startsWith("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.startsWith("ko")) {
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
  game = new SpaceWalkGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    game.setKey(e.key, true);
  });

  document.addEventListener("keyup", (e) => {
    game.setKey(e.key, false);
  });

  // Mobile button controls
  let moveIntervals: { [key: string]: number } = {};

  const startMove = (direction: "up" | "down" | "left" | "right") => {
    game.movePlayer(direction);
    moveIntervals[direction] = window.setInterval(() => {
      game.movePlayer(direction);
    }, 50);
  };

  const stopMove = (direction: string) => {
    if (moveIntervals[direction]) {
      clearInterval(moveIntervals[direction]);
      delete moveIntervals[direction];
    }
  };

  // Touch events
  btnUp.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startMove("up");
  });
  btnUp.addEventListener("touchend", () => stopMove("up"));

  btnDown.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startMove("down");
  });
  btnDown.addEventListener("touchend", () => stopMove("down"));

  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startMove("left");
  });
  btnLeft.addEventListener("touchend", () => stopMove("left"));

  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startMove("right");
  });
  btnRight.addEventListener("touchend", () => stopMove("right"));

  // Mouse events (for desktop testing)
  btnUp.addEventListener("mousedown", () => startMove("up"));
  btnUp.addEventListener("mouseup", () => stopMove("up"));
  btnUp.addEventListener("mouseleave", () => stopMove("up"));

  btnDown.addEventListener("mousedown", () => startMove("down"));
  btnDown.addEventListener("mouseup", () => stopMove("down"));
  btnDown.addEventListener("mouseleave", () => stopMove("down"));

  btnLeft.addEventListener("mousedown", () => startMove("left"));
  btnLeft.addEventListener("mouseup", () => stopMove("left"));
  btnLeft.addEventListener("mouseleave", () => stopMove("left"));

  btnRight.addEventListener("mousedown", () => startMove("right"));
  btnRight.addEventListener("mouseup", () => stopMove("right"));
  btnRight.addEventListener("mouseleave", () => stopMove("right"));

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    highScoreDisplay.textContent = state.highScore.toString();
    oxygenDisplay.textContent = `${state.oxygen}%`;
    timeDisplay.textContent = `${state.survivalTime}${i18n.t("game.seconds")}`;

    // Update oxygen color
    if (state.oxygen < 30) {
      oxygenDisplay.style.color = "#ff3333";
    } else if (state.oxygen < 60) {
      oxygenDisplay.style.color = "#ffaa00";
    } else {
      oxygenDisplay.style.color = "#00ff00";
    }

    if (state.status === "over") {
      showGameOver(state.score, state.highScore, state.survivalTime);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showGameOver(score: number, highScore: number, time: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");

    const isNewRecord = score === highScore && score > 0;
    let msg = `${i18n.t("game.finalScore")}: ${score}`;
    msg += `\n${i18n.t("game.survived")}: ${time} ${i18n.t("game.seconds")}`;
    if (isNewRecord) {
      msg += `\n🎉 ${i18n.t("game.newRecord")} 🎉`;
    }

    overlayMsg.textContent = msg;
    overlayMsg.style.whiteSpace = "pre-line";
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = startGame;
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

function showInstructions() {
  instructionsModal.style.display = "flex";
}

function hideInstructions() {
  instructionsModal.style.display = "none";
}

startBtn.addEventListener("click", startGame);
instructionsBtn.addEventListener("click", showInstructions);
closeModalBtn.addEventListener("click", hideInstructions);

// Click outside modal to close
instructionsModal.addEventListener("click", (e) => {
  if (e.target === instructionsModal) {
    hideInstructions();
  }
});

// Init
initI18n();
initGame();
