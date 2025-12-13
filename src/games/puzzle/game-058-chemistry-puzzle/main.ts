/**
 * Chemistry Puzzle Main Entry
 * Game #058
 */
import { ChemistryGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const elementsZone = document.getElementById("elements-zone") as HTMLElement;
const flaskContent = document.getElementById("flask-content") as HTMLElement;
const flaskLiquid = document.getElementById("flask-liquid") as HTMLElement;
const flask = document.getElementById("flask") as HTMLElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const targetDisplay = document.getElementById("target-display")!;
const resultDisplay = document.getElementById("result-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const clearBtn = document.getElementById("clear-btn")!;
const reactBtn = document.getElementById("react-btn")!;

let game: ChemistryGame;

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
  game = new ChemistryGame(elementsZone, flaskContent, flaskLiquid);
  game.setupDropZone(flask);

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    targetDisplay.textContent = state.target;

    if (state.status === "won") {
      showWin();
    } else if (state.status === "failed") {
      showFail();
    }
  });
}

function showWin() {
  flask.classList.add("reaction-animation");
  setTimeout(() => {
    flask.classList.remove("reaction-animation");
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${game.getTargetCompound()}`;
    startBtn.textContent = i18n.t("game.nextLevel");

    startBtn.onclick = () => {
      game.nextLevel();
      overlay.style.display = "none";
      resultDisplay.textContent = "";
    };
  }, 500);
}

function showFail() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.fail");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.tryAgain");

    startBtn.onclick = () => {
      game.reset();
      overlay.style.display = "none";
      resultDisplay.textContent = "";
    };
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  resultDisplay.textContent = "";
  game.start();
}

function handleReact() {
  const result = game.react();
  if (result) {
    resultDisplay.textContent = `= ${result}`;
    flask.classList.add("reaction-animation");
    setTimeout(() => flask.classList.remove("reaction-animation"), 500);
  } else {
    resultDisplay.textContent = "= ???";
  }
}

startBtn.addEventListener("click", startGame);
clearBtn.addEventListener("click", () => {
  game.clearFlask();
  resultDisplay.textContent = "";
});
reactBtn.addEventListener("click", handleReact);

// Init
initI18n();
initGame();
