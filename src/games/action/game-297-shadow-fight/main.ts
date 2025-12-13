/**
 * Shadow Fight Main Entry
 * Game #297
 */
import { ShadowFightGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const waveDisplay = document.getElementById("wave-display")!;
const killsDisplay = document.getElementById("kills-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnJump = document.getElementById("btn-jump")!;
const btnSlash = document.getElementById("btn-slash")!;
const btnThrust = document.getElementById("btn-thrust")!;
const btnSpin = document.getElementById("btn-spin")!;

let game: ShadowFightGame;

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
  game = new ShadowFightGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        game.setKey("left", true);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        game.setKey("right", true);
        break;
      case "ArrowUp":
      case "w":
      case "W":
        e.preventDefault();
        game.setKey("jump", true);
        break;
      case "z":
      case "Z":
        e.preventDefault();
        game.setKey("slash", true);
        break;
      case "x":
      case "X":
        e.preventDefault();
        game.setKey("thrust", true);
        break;
      case "c":
      case "C":
        e.preventDefault();
        game.setKey("spin", true);
        break;
      case "v":
      case "V":
        e.preventDefault();
        game.setKey("block", true);
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        game.setKey("left", false);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        game.setKey("right", false);
        break;
      case "ArrowUp":
      case "w":
      case "W":
        game.setKey("jump", false);
        break;
      case "z":
      case "Z":
        game.setKey("slash", false);
        break;
      case "x":
      case "X":
        game.setKey("thrust", false);
        break;
      case "c":
      case "C":
        game.setKey("spin", false);
        break;
      case "v":
      case "V":
        game.setKey("block", false);
        break;
    }
  });

  // Mobile controls
  const setupMobileButton = (btn: HTMLElement, key: "left" | "right" | "jump" | "slash" | "thrust" | "spin" | "block") => {
    btn.addEventListener("mousedown", () => game.setKey(key, true));
    btn.addEventListener("mouseup", () => game.setKey(key, false));
    btn.addEventListener("mouseleave", () => game.setKey(key, false));
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      game.setKey(key, true);
    });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      game.setKey(key, false);
    });
  };

  setupMobileButton(btnLeft, "left");
  setupMobileButton(btnRight, "right");
  setupMobileButton(btnJump, "jump");
  setupMobileButton(btnSlash, "slash");
  setupMobileButton(btnThrust, "thrust");
  setupMobileButton(btnSpin, "spin");

  game.setOnStateChange((state) => {
    waveDisplay.textContent = state.wave.toString();
    killsDisplay.textContent = state.kills.toString();

    if (state.status === "waveEnd") {
      showWaveClear(state.wave, state.kills);
    } else if (state.status === "over") {
      showGameOver(state.kills);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showWaveClear(wave: number, kills: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.clear");
    overlayMsg.textContent = `Wave ${wave} - Kills: ${kills}`;
    startBtn.textContent = i18n.t("game.next");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextWave();
    };
  }, 500);
}

function showGameOver(kills: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `Total Kills: ${kills}`;
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = startGame;
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
