/**
 * Room Escape Main Entry
 * Game #060
 */
import { RoomEscapeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const roomView = document.getElementById("room-view") as HTMLElement;
const inventoryEl = document.getElementById("inventory") as HTMLElement;
const messageBox = document.getElementById("message-box") as HTMLElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const roomDisplay = document.getElementById("room-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: RoomEscapeGame;
let messageTimeout: number;

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
  game = new RoomEscapeGame(roomView, inventoryEl, messageBox);

  game.setOnStateChange((state: any) => {
    roomDisplay.textContent = String(state.level);

    if (state.status === "won") {
      showWin();
    }
  });

  game.setOnMessage((key: string) => {
    showMessage(i18n.t(key));
  });
}

function showMessage(text: string) {
  messageBox.textContent = text;
  messageBox.classList.add("show");

  clearTimeout(messageTimeout);
  messageTimeout = window.setTimeout(() => {
    messageBox.classList.remove("show");
  }, 2500);
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.room")} ${game.level}`;
    startBtn.textContent = i18n.t("game.nextRoom");

    startBtn.onclick = () => {
      game.nextLevel();
      overlay.style.display = "none";
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());

// Init
initI18n();
initGame();
