/**
 * Ball Maze Main Entry
 * Game #046
 */
import { BallMazeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: BallMazeGame;
let useDeviceOrientation = false;

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
  game = new BallMazeGame(canvas);
  game.resize();

  // Setup device orientation
  if (window.DeviceOrientationEvent) {
    // Request permission on iOS 13+
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      startBtn.addEventListener("click", async () => {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === "granted") {
            useDeviceOrientation = true;
            setupDeviceOrientation();
          }
        } catch (e) {
          console.log("Device orientation permission denied");
        }
        startGame();
      }, { once: true });
    } else {
      useDeviceOrientation = true;
      setupDeviceOrientation();
    }
  }

  // Keyboard controls as fallback
  setupKeyboardControls();

  game.setOnStateChange((state: any) => {
    if (state.time !== undefined) {
      timeDisplay.textContent = `${state.time}s`;
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      showWin(state.hasNextLevel);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function setupDeviceOrientation() {
  window.addEventListener("deviceorientation", (e) => {
    if (!useDeviceOrientation) return;

    // gamma: left-right tilt (-90 to 90)
    // beta: front-back tilt (-180 to 180)
    const gamma = e.gamma || 0;
    const beta = e.beta || 0;

    // Convert to -1 to 1 range
    const x = Math.max(-1, Math.min(1, gamma / 30));
    const y = Math.max(-1, Math.min(1, (beta - 45) / 30)); // Offset for natural holding angle

    game.setGravity(x, y);
  });
}

function setupKeyboardControls() {
  const keys: { [key: string]: boolean } = {};

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    updateGravityFromKeys();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    updateGravityFromKeys();
  });

  function updateGravityFromKeys() {
    let x = 0;
    let y = 0;

    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) x -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) x += 1;
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) y -= 1;
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) y += 1;

    game.setGravity(x, y);
  }
}

function showWin(hasNextLevel: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = `${i18n.t("game.time")}: ${timeDisplay.textContent}`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = `${i18n.t("game.time")}: ${timeDisplay.textContent}`;
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});

// Init
initI18n();
initGame();
