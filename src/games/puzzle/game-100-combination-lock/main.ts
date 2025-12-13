/**
 * Combination Lock Main Entry
 * Game #100
 */
import { CombinationGame, GameState, Hint, HintType } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const attemptsDisplay = document.getElementById("attempts-display")!;
const dialsEl = document.getElementById("dials")!;
const hintsListEl = document.getElementById("hints-list")!;
const lockShackle = document.getElementById("lock-shackle")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const checkBtn = document.getElementById("check-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: CombinationGame;

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
    renderHints(game.getState().hints);
  });
}

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  game = new CombinationGame();

  game.onStateChange = (state: GameState) => {
    renderDials(state);
    renderHints(state.hints);
    updateUI(state);

    if (state.status === "won") {
      lockShackle.classList.add("unlocked");
      setTimeout(() => showWinOverlay(), 800);
    }
  };
}

function createDials(count: number): void {
  dialsEl.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const dial = document.createElement("div");
    dial.className = "dial";
    dial.dataset.index = i.toString();

    const inner = document.createElement("div");
    inner.className = "dial-inner";

    const number = document.createElement("div");
    number.className = "dial-number";
    number.id = `dial-${i}-number`;
    number.textContent = "0";

    inner.appendChild(number);
    dial.appendChild(inner);

    // Controls
    const controls = document.createElement("div");
    controls.className = "dial-controls";

    const upBtn = document.createElement("button");
    upBtn.className = "dial-btn";
    upBtn.innerHTML = "&#9650;";
    upBtn.addEventListener("click", () => game.incrementDial(i));

    const downBtn = document.createElement("button");
    downBtn.className = "dial-btn";
    downBtn.innerHTML = "&#9660;";
    downBtn.addEventListener("click", () => game.decrementDial(i));

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    dial.appendChild(controls);

    // Indicator
    const indicator = document.createElement("div");
    indicator.className = "dial-indicator";
    dial.appendChild(indicator);

    // Touch/scroll support
    let startY = 0;
    dial.addEventListener("touchstart", (e) => {
      startY = e.touches[0].clientY;
    });

    dial.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const deltaY = startY - e.touches[0].clientY;
      if (Math.abs(deltaY) > 20) {
        if (deltaY > 0) {
          game.incrementDial(i);
        } else {
          game.decrementDial(i);
        }
        startY = e.touches[0].clientY;
      }
    });

    dial.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        game.incrementDial(i);
      } else {
        game.decrementDial(i);
      }
    });

    dialsEl.appendChild(dial);
  }
}

function renderDials(state: GameState): void {
  if (dialsEl.children.length !== state.digits) {
    createDials(state.digits);
  }

  for (let i = 0; i < state.digits; i++) {
    const numberEl = document.getElementById(`dial-${i}-number`);
    if (numberEl) {
      numberEl.textContent = state.currentGuess[i].toString();
    }
  }
}

function renderHints(hints: Hint[]): void {
  hintsListEl.innerHTML = "";

  hints.forEach((hint) => {
    const row = document.createElement("div");
    row.className = "hint-row";

    const codeEl = document.createElement("div");
    codeEl.className = "hint-code";

    hint.code.forEach((digit, i) => {
      const digitEl = document.createElement("span");
      digitEl.className = `hint-digit ${hint.results[i]}`;
      digitEl.textContent = digit.toString();
      codeEl.appendChild(digitEl);
    });

    const textEl = document.createElement("span");
    textEl.className = "hint-text";
    textEl.textContent = hint.description;

    row.appendChild(codeEl);
    row.appendChild(textEl);
    hintsListEl.appendChild(row);
  });
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  attemptsDisplay.textContent = state.attempts.toString();
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.attempts")}: ${state.attempts}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      lockShackle.classList.remove("unlocked");
      game.nextLevel();
    };
  }
}

function startGame(level: number = 1): void {
  overlay.style.display = "none";
  lockShackle.classList.remove("unlocked");
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => {
  lockShackle.classList.remove("unlocked");
  game.reset();
});
checkBtn.addEventListener("click", () => game.check());

// Keyboard support
document.addEventListener("keydown", (e) => {
  if (game.getState().status !== "playing") return;

  if (e.key === "Enter") {
    game.check();
  }
});

// Initialize
initI18n();
initGame();
