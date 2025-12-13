/**
 * Mecha Build Main Entry
 * Game #236
 */
import { MechaBuildGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const levelDisplay = document.getElementById("level-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const partsPanel = document.getElementById("parts-panel")!;

let game: MechaBuildGame;

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
  game = new MechaBuildGame(canvas);
  game.resize();

  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    levelDisplay.textContent = state.level.toString();
    timeDisplay.textContent = state.timeLeft.toString();

    if (state.status === "over") {
      showGameOver(state.score);
    } else if (state.status === "levelComplete") {
      showLevelComplete();
    }
  });

  game.setOnPartsUpdate((parts, targetIndex) => {
    renderParts(parts, targetIndex);
  });

  window.addEventListener("resize", () => game.resize());
}

function renderParts(parts: { emoji: string; name: string }[], targetIndex: number) {
  partsPanel.innerHTML = "";

  parts.forEach((part, index) => {
    const btn = document.createElement("button");
    btn.className = "part-btn";
    if (index === targetIndex) {
      btn.classList.add("target");
    }
    btn.textContent = part.emoji;
    btn.dataset.name = part.name;

    btn.addEventListener("click", () => {
      const result = game.selectPart(part.name);

      btn.classList.remove("correct", "wrong");
      if (result === "correct" || result === "complete") {
        btn.classList.add("correct");
      } else {
        btn.classList.add("wrong");
      }

      setTimeout(() => {
        btn.classList.remove("correct", "wrong");
      }, 300);
    });

    partsPanel.appendChild(btn);
  });
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Score: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
  }, 300);
}

function showLevelComplete() {
  // Brief flash message
  const flash = document.createElement("div");
  flash.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(72, 187, 120, 0.9);
    color: white;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-size: 1.5rem;
    font-weight: bold;
    z-index: 100;
  `;
  flash.textContent = i18n.t("game.complete");
  document.body.appendChild(flash);

  setTimeout(() => {
    flash.remove();
  }, 1000);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
