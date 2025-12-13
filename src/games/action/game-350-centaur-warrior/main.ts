import { CentaurWarriorGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const healthDisplay = document.getElementById("health-display")!;
const arrowsDisplay = document.getElementById("arrows-display")!;
const levelDisplay = document.getElementById("level-display")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;
const btnJump = document.getElementById("btn-jump")!;
const btnAttack = document.getElementById("btn-attack")!;
const btnSpecial = document.getElementById("btn-special")!;

let game: CentaurWarriorGame;

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => i18n.loadTranslations(locale as Locale, trans));
  const browserLang = navigator.language;
  if (browserLang.includes("zh")) i18n.setLocale("zh-TW");
  else if (browserLang.includes("ja")) i18n.setLocale("ja");
  else i18n.setLocale("en");
  languageSelect.value = i18n.getLocale();
  updateTexts();
  languageSelect.addEventListener("change", () => { i18n.setLocale(languageSelect.value as Locale); updateTexts(); });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new CentaurWarriorGame(canvas);
  game.resize();
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowLeft": case "a": case "A": e.preventDefault(); game.setKey("left", true); break;
      case "ArrowRight": case "d": case "D": e.preventDefault(); game.setKey("right", true); break;
      case "ArrowUp": case "w": case "W": e.preventDefault(); game.setKey("jump", true); break;
      case " ": e.preventDefault(); game.setKey("attack", true); break;
      case "e": case "E": e.preventDefault(); game.setKey("special", true); break;
    }
  });
  document.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowLeft": case "a": case "A": game.setKey("left", false); break;
      case "ArrowRight": case "d": case "D": game.setKey("right", false); break;
      case "ArrowUp": case "w": case "W": game.setKey("jump", false); break;
      case " ": game.setKey("attack", false); break;
      case "e": case "E": game.setKey("special", false); break;
    }
  });
  const setupMobileButton = (btn: HTMLElement, key: "left" | "right" | "jump" | "attack" | "special") => {
    btn.addEventListener("mousedown", () => game.setKey(key, true));
    btn.addEventListener("mouseup", () => game.setKey(key, false));
    btn.addEventListener("mouseleave", () => game.setKey(key, false));
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); game.setKey(key, true); });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); game.setKey(key, false); });
  };
  setupMobileButton(btnLeft, "left");
  setupMobileButton(btnRight, "right");
  setupMobileButton(btnJump, "jump");
  setupMobileButton(btnAttack, "attack");
  setupMobileButton(btnSpecial, "special");
  game.setOnStateChange((state) => {
    scoreDisplay.textContent = state.score.toString();
    healthDisplay.textContent = state.health.toString();
    arrowsDisplay.textContent = state.arrows.toString();
    levelDisplay.textContent = state.level.toString();
    if (state.status === "clear") showLevelClear(state.score, state.level);
    else if (state.status === "over") showGameOver(state.score);
  });
  window.addEventListener("resize", () => game.resize());
}

function showLevelClear(score: number, level: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.clear");
    overlayMsg.textContent = `${i18n.t("game.level")} ${level} ${i18n.t("game.clear")}! ${i18n.t("game.score")}: ${score}`;
    startBtn.textContent = i18n.t("game.next");
    startBtn.onclick = () => { overlay.style.display = "none"; game.nextLevel(); startBtn.onclick = startGame; };
  }, 500);
}

function showGameOver(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.over");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${score}`;
    startBtn.textContent = i18n.t("game.restart");
    startBtn.onclick = startGame;
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
initI18n();
initGame();
