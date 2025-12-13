/**
 * Monster TD Main Entry
 * Game #194
 */
import { MonsterTDGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const goldDisplay = document.getElementById("gold-display")!;
const waveDisplay = document.getElementById("wave-display")!;
const livesDisplay = document.getElementById("lives-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const towerArrowBtn = document.getElementById("tower-arrow")!;
const towerCannonBtn = document.getElementById("tower-cannon")!;
const towerIceBtn = document.getElementById("tower-ice")!;

let game: MonsterTDGame;

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
  game = new MonsterTDGame(canvas);
  game.resize();

  // Tower selection
  const towerButtons = [
    { btn: towerArrowBtn, type: "arrow" as const },
    { btn: towerCannonBtn, type: "cannon" as const },
    { btn: towerIceBtn, type: "ice" as const },
  ];

  towerButtons.forEach(({ btn, type }) => {
    btn.addEventListener("click", () => {
      const current = game.getSelectedTower();
      if (current === type) {
        game.selectTower(null);
        btn.classList.remove("selected");
      } else {
        game.selectTower(type);
        towerButtons.forEach((t) => t.btn.classList.remove("selected"));
        btn.classList.add("selected");
      }
    });
  });

  // Canvas click for tower placement
  canvas.addEventListener("click", (e) => {
    game.handleClick(e.clientX, e.clientY);
    updateTowerButtons();
  });

  game.setOnStateChange((state) => {
    goldDisplay.textContent = state.gold.toString();
    waveDisplay.textContent = state.wave.toString();
    livesDisplay.textContent = state.lives.toString();

    updateTowerButtons();

    if (state.status === "over") {
      showGameOver();
    } else if (state.status === "won") {
      showWin();
    } else if (state.status === "waveComplete") {
      showWaveComplete(state.wave);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function updateTowerButtons() {
  const towerTypes = [
    { btn: towerArrowBtn, type: "arrow" as const },
    { btn: towerCannonBtn, type: "cannon" as const },
    { btn: towerIceBtn, type: "ice" as const },
  ];

  towerTypes.forEach(({ btn, type }) => {
    if (game.canAfford(type)) {
      btn.classList.remove("disabled");
    } else {
      btn.classList.add("disabled");
    }
  });
}

function showGameOver() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.start();
    };
  }, 500);
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.start();
    };
  }, 500);
}

function showWaveComplete(wave: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = `${i18n.t("game.wave")} ${wave}`;
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.nextWave");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextWave();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
