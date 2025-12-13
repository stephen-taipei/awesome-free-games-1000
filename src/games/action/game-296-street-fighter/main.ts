/**
 * Street Fighter Lite Main Entry
 * Game #296
 */
import { StreetFighterGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const comboDisplay = document.getElementById("combo-display")!;
const roundDisplay = document.getElementById("round-display")!;
const winsDisplay = document.getElementById("wins-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnJump = document.getElementById("btn-jump")!;
const btnPunch = document.getElementById("btn-punch")!;
const btnKick = document.getElementById("btn-kick")!;
const btnSpecial = document.getElementById("btn-special")!;

let game: StreetFighterGame;

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
  game = new StreetFighterGame(canvas);
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
        game.setKey("punch", true);
        break;
      case "x":
      case "X":
        e.preventDefault();
        game.setKey("kick", true);
        break;
      case "c":
      case "C":
        e.preventDefault();
        game.setKey("special", true);
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
        game.setKey("punch", false);
        break;
      case "x":
      case "X":
        game.setKey("kick", false);
        break;
      case "c":
      case "C":
        game.setKey("special", false);
        break;
      case "v":
      case "V":
        game.setKey("block", false);
        break;
    }
  });

  // Mobile controls
  const setupMobileButton = (btn: HTMLElement, key: "left" | "right" | "jump" | "punch" | "kick" | "special" | "block") => {
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
  setupMobileButton(btnPunch, "punch");
  setupMobileButton(btnKick, "kick");
  setupMobileButton(btnSpecial, "special");

  game.setOnStateChange((state) => {
    comboDisplay.textContent = state.combo.toString();
    roundDisplay.textContent = state.round.toString();
    winsDisplay.textContent = state.wins.toString();

    if (state.status === "roundEnd") {
      const playerWon = state.enemyHealth <= 0;
      showRoundEnd(playerWon, state.wins);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showRoundEnd(playerWon: boolean, wins: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = playerWon ? i18n.t("game.win") : i18n.t("game.lose");
    overlayMsg.textContent = `Wins: ${wins}/2`;
    startBtn.textContent = i18n.t("game.next");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextRound();
    };
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
