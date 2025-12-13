/**
 * Deep Sea Main Entry
 * Game #145
 */
import { DeepSeaGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const depthDisplay = document.getElementById("depth-display")!;
const oxygenDisplay = document.getElementById("oxygen-display")!;
const treasuresDisplay = document.getElementById("treasures-display")!;
const oxygenBar = document.getElementById("oxygen-bar")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: DeepSeaGame;

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
}

function initGame() {
  game = new DeepSeaGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);
  });

  document.addEventListener("keydown", (e) => {
    if (overlay.style.display !== "none") return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
      e.preventDefault();
      game.handleKey(e.key);
    }
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    depthDisplay.textContent = `${state.depth}m`;
    oxygenDisplay.textContent = `${Math.ceil(state.oxygen)}`;
    treasuresDisplay.textContent = `${state.treasuresCollected}/${state.totalTreasures}`;

    const oxygenPercent = (state.oxygen / state.maxOxygen) * 100;
    oxygenBar.style.width = `${oxygenPercent}%`;

    if (oxygenPercent < 30) {
      oxygenBar.style.background = "linear-gradient(90deg, #e74c3c, #c0392b)";
    } else if (oxygenPercent < 60) {
      oxygenBar.style.background = "linear-gradient(90deg, #f39c12, #d68910)";
    } else {
      oxygenBar.style.background = "linear-gradient(90deg, #3498db, #2980b9)";
    }

    if (state.status === "won") {
      showWin();
    } else if (state.status === "complete") {
      showComplete();
    } else if (state.status === "gameOver") {
      showGameOver();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = "";
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 500);
}

function showComplete() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.start");
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    startBtn.onclick = () => {
      game.restart();
      startGame();
    };
  }, 500);
}

function showGameOver() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameOver");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.reset");
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    startBtn.onclick = () => {
      game.reset();
      overlay.style.display = "none";
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
});

initI18n();
initGame();
