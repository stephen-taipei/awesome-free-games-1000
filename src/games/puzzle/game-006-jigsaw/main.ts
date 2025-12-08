/**
 * Jigsaw Puzzle Main Entry
 * Game #006
 */
import { JigsawGame, DIFFICULTY_CONFIGS, type Difficulty } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { isTouchDevice } from "../../../shared/utils";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const startBtn = document.getElementById("start-btn")!;
const difficultySelect = document.getElementById(
  "difficulty-select"
) as HTMLSelectElement;
const imageSelect = document.getElementById(
  "image-select"
) as HTMLSelectElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const helpBtn = document.getElementById("help-btn")!;
const helpModal = document.getElementById("help-modal")!;
const modalClose = document.getElementById("modal-close")!;
const loadingOverlay = document.getElementById("loading-overlay")!;
const gameOverlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayStats = document.getElementById("overlay-stats")!;
const playAgainBtn = document.getElementById("play-again-btn")!;
const timeCounter = document.getElementById("time-counter")!;
const pieceCounter = document.getElementById("piece-counter")!;

let game: JigsawGame;
let timerInterval: any = null;

const IMAGE_SOURCES = {
  nature:
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  city: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  animals:
    "https://images.unsplash.com/photo-1474511320723-9a56873867b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
};

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  // Set default language
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

  // Update Select Options
  Array.from(difficultySelect.options).forEach((opt) => {
    opt.textContent = i18n.t(`diff.${opt.value}`);
  });
  Array.from(imageSelect.options).forEach((opt) => {
    opt.textContent = i18n.t(`img.${opt.value}`);
  });
}

function showLoading(show: boolean) {
  loadingOverlay.style.display = show ? "flex" : "none";
}

function showOverlay(won: boolean) {
  gameOverlay.style.display = "flex";
  if (won) {
    overlayTitle.textContent = i18n.t("game.youWin");
    overlayTitle.classList.add("win");
    overlayStats.textContent = `${i18n.t("game.time")}: ${game.getPlayTime()}s`;
  }
}

async function startNewGame() {
  const diff = difficultySelect.value as Difficulty;
  const imgKey = imageSelect.value as keyof typeof IMAGE_SOURCES;
  const imgSrc = IMAGE_SOURCES[imgKey];

  showLoading(true);
  gameOverlay.style.display = "none";

  try {
    game = new JigsawGame(canvas, diff);
    await game.loadImage(imgSrc);

    game.setOnStateChange((state) => {
      // Update UI stats if needed
      if (state.status === "playing") {
        // pieceCounter.textContent = ...
      }
    });

    game.setOnGameEnd((won) => {
      stopTimer();
      showOverlay(won);
    });

    game.start();
    startTimer();

    // Resize once to establish correct logical size
    // game.resizeCanvas(); // Already called in constructor
  } catch (err) {
    console.error(err);
    alert("Failed to load image");
  } finally {
    showLoading(false);
  }
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (game) {
      const t = game.getPlayTime();
      const mins = Math.floor(t / 60)
        .toString()
        .padStart(2, "0");
      const secs = (t % 60).toString().padStart(2, "0");
      timeCounter.textContent = `${mins}:${secs}`;
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

function handleInput(e: MouseEvent | TouchEvent, type: "down" | "move" | "up") {
  if (!game) return;

  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Touch end
      game.handleUp();
      return;
    }
  } else if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else {
    return;
  }

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (type === "down") game.handleDown(x, y);
  else if (type === "move") game.handleMove(x, y);
  else if (type === "up") game.handleUp();
}

// Event Listeners
startBtn.addEventListener("click", startNewGame);
playAgainBtn.addEventListener("click", startNewGame);

canvas.addEventListener("mousedown", (e) => handleInput(e, "down"));
window.addEventListener("mousemove", (e) => handleInput(e, "move")); // Window allows dragging outside canvas temporarily? No, standard logic.
window.addEventListener("mouseup", (e) => handleInput(e, "up"));

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    handleInput(e, "down");
  },
  { passive: false }
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    handleInput(e, "move");
  },
  { passive: false }
);
window.addEventListener("touchend", (e) => handleInput(e, "up"));

helpBtn.addEventListener("click", () => (helpModal.style.display = "flex"));
modalClose.addEventListener("click", () => (helpModal.style.display = "none"));

// Init
initI18n();
// Auto start
// startNewGame(); // Better let user click start
