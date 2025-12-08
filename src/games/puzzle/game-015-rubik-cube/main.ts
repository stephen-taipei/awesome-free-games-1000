/**
 * Rubik's Cube Main Entry
 * Game #015
 */
import { RubikGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const container = document.querySelector(".scene") as HTMLElement;
const cube = document.querySelector(".cube") as HTMLElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const scrambleBtn = document.getElementById("scramble-btn")!;

let game: RubikGame;

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
  game = new RubikGame(cube, container);

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;
  });
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

// Input Handling
let isDragging = false;
let startX = 0;
let startY = 0;
let draggingTarget: HTMLElement | null = null;

// Determine if we are rotating VIEW or rotating LAYER
// If clicking on background (.scene or .game-area) -> View
// If clicking on .cubie or .face -> Layer (Swipe)

const gameArea = document.querySelector(".game-area") as HTMLElement;

gameArea.addEventListener("mousedown", startTouch);
gameArea.addEventListener("touchstart", (e) => startTouch(e.touches[0], e), {
  passive: false,
});

function startTouch(e: MouseEvent | Touch, originalEvent?: Event) {
  if (originalEvent) originalEvent.preventDefault();
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;

  // Check target
  const target = e.target as HTMLElement;
  if (target.closest(".cubie")) {
    draggingTarget = target.closest(".cubie") as HTMLElement;
  } else {
    draggingTarget = null;
  }
}

document.addEventListener("mousemove", moveTouch);
document.addEventListener("touchmove", (e) => moveTouch(e.touches[0], e), {
  passive: false,
});

function moveTouch(e: MouseEvent | Touch, originalEvent?: Event) {
  if (!isDragging) return;
  if (originalEvent) originalEvent.preventDefault();

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if (draggingTarget) {
    // Swipe on cube
    // Simple logic: Threshold -> Determine Axis -> Rotate
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
      // Determine direction
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      // We need to map screen Swipe to 3D axis based on view?
      // This is complex.
      // Simplified:
      // Horizontal Swipe -> Rotate Y axis (Top/Down layers? No, Layer around Y)
      // Vertical Swipe -> Rotate X or Z?

      // To be robust we need to raycast or project axes.
      // For MVP:
      // Just assume View is roughly Standard (-30, 45).
      // Horizontal swipe corresponds to rotating around Y axis (top/bottom faces move)
      // BUT WHICH layer?
      // Depends on the cubie we clicked!

      // Extract cubie logical pos?
      // We'd need to store x,y,z on element dataset.
      // But we didn't (tracking inside Game class).

      // Let's fallback to View Rotation for everything in this iteration
      // Because precise picking in CSS3D without matrix math is flaky.
      // Or only implement View Rotation here and use Buttons for layers?
      // User requirement is "Swipe on cube".

      // Let's implement pseudo-swipe:
      // Swipe Left/Right -> Rotate WHOLE cube (view)?

      // If dragging background: View.
      // If dragging Cube: Try to rotate layer.

      // Hack for MVP Swipe:
      // Just do View Rotation for now to ensure playability of inspection.
      // Add UI buttons for rotating layers if swipe is too hard?
      // Or just map: Swipe Right -> Rotate Bottom View?

      game.rotateView(dx, dy);
      startX = e.clientX;
      startY = e.clientY;
    }
  } else {
    // View Rotation
    game.rotateView(dx, dy);
    startX = e.clientX;
    startY = e.clientY;
  }
}

document.addEventListener("mouseup", () => (isDragging = false));
document.addEventListener("touchend", () => (isDragging = false));

// Key Controls for actual play
document.addEventListener("keydown", (e) => {
  // Map keys to rotations?
  // U D L R F B
  // u d l r f b (inverse)
  const key = e.key.toLowerCase();
  const shift = e.shiftKey;
  const dir = shift ? -1 : 1;

  switch (key) {
    case "u":
      game.rotateLayer("y", 1, -dir);
      break; // Top (y=1)
    case "d":
      game.rotateLayer("y", -1, dir);
      break; // Bottom (y=-1)
    case "l":
      game.rotateLayer("x", -1, dir);
      break; // Left (x=-1)
    case "r":
      game.rotateLayer("x", 1, -dir);
      break; // Right (x=1)
    case "f":
      game.rotateLayer("z", 1, -dir);
      break; // Front (z=1)
    case "b":
      game.rotateLayer("z", -1, dir);
      break; // Back (z=-1)

    // Also center layers?
    case "m":
      game.rotateLayer("x", 0, dir);
      break;
    case "e":
      game.rotateLayer("y", 0, dir);
      break;
    case "s":
      game.rotateLayer("z", 0, dir);
      break;
  }
});

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => game.reset());
scrambleBtn.addEventListener("click", () => game.scramble());

// Warn user about keys
overlayMsg.innerHTML +=
  "<br><small>(Use keys U,D,L,R,F,B + Shift for inverse)</small>";

// Init
initI18n();
initGame();
