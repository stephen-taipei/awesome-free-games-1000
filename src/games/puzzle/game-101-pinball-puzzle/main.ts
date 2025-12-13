/**
 * Pinball Puzzle Main Entry
 * Game #101
 */
import { PinballGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const scoreDisplay = document.getElementById("score-display")!;
const ballsDisplay = document.getElementById("balls-display")!;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const launchBtn = document.getElementById("launch-btn")!;
const leftFlipperBtn = document.getElementById("left-flipper")!;
const rightFlipperBtn = document.getElementById("right-flipper")!;

let game: PinballGame;

function initI18n(): void {
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

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame(): void {
  resizeCanvas();

  game = new PinballGame(canvas.width, canvas.height);

  game.onStateChange = (state: GameState) => {
    render(state);
    updateUI(state);

    if (state.status === "won") {
      setTimeout(() => showWinOverlay(), 500);
    } else if (state.status === "lost") {
      setTimeout(() => showLostOverlay(), 500);
    }
  };

  window.addEventListener("resize", () => {
    resizeCanvas();
    game.resize(canvas.width, canvas.height);
  });

  // Keyboard controls
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("keyup", handleKeyup);

  // Button controls
  leftFlipperBtn.addEventListener("mousedown", () => {
    game.setFlipper("left", true);
    leftFlipperBtn.classList.add("active");
  });
  leftFlipperBtn.addEventListener("mouseup", () => {
    game.setFlipper("left", false);
    leftFlipperBtn.classList.remove("active");
  });
  leftFlipperBtn.addEventListener("mouseleave", () => {
    game.setFlipper("left", false);
    leftFlipperBtn.classList.remove("active");
  });

  rightFlipperBtn.addEventListener("mousedown", () => {
    game.setFlipper("right", true);
    rightFlipperBtn.classList.add("active");
  });
  rightFlipperBtn.addEventListener("mouseup", () => {
    game.setFlipper("right", false);
    rightFlipperBtn.classList.remove("active");
  });
  rightFlipperBtn.addEventListener("mouseleave", () => {
    game.setFlipper("right", false);
    rightFlipperBtn.classList.remove("active");
  });

  // Touch support
  leftFlipperBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.setFlipper("left", true);
    leftFlipperBtn.classList.add("active");
  });
  leftFlipperBtn.addEventListener("touchend", () => {
    game.setFlipper("left", false);
    leftFlipperBtn.classList.remove("active");
  });

  rightFlipperBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.setFlipper("right", true);
    rightFlipperBtn.classList.add("active");
  });
  rightFlipperBtn.addEventListener("touchend", () => {
    game.setFlipper("right", false);
    rightFlipperBtn.classList.remove("active");
  });
}

function resizeCanvas(): void {
  const container = canvas.parentElement!;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 500;
}

function handleKeydown(e: KeyboardEvent): void {
  switch (e.key.toLowerCase()) {
    case "a":
    case "z":
    case "arrowleft":
      game.setFlipper("left", true);
      leftFlipperBtn.classList.add("active");
      break;
    case "l":
    case "/":
    case "arrowright":
      game.setFlipper("right", true);
      rightFlipperBtn.classList.add("active");
      break;
    case " ":
      e.preventDefault();
      game.launch();
      break;
  }
}

function handleKeyup(e: KeyboardEvent): void {
  switch (e.key.toLowerCase()) {
    case "a":
    case "z":
    case "arrowleft":
      game.setFlipper("left", false);
      leftFlipperBtn.classList.remove("active");
      break;
    case "l":
    case "/":
    case "arrowright":
      game.setFlipper("right", false);
      rightFlipperBtn.classList.remove("active");
      break;
  }
}

function render(state: GameState): void {
  const { width, height, ball, targets, bumpers, flippers } = state;

  // Clear
  ctx.fillStyle = "rgba(45, 27, 78, 0.3)";
  ctx.fillRect(0, 0, width, height);

  // Draw launch lane
  ctx.fillStyle = "#1a0a30";
  ctx.fillRect(width - 50, 0, 50, height);
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(width - 50, 0, 50, height);

  // Draw targets
  targets.forEach((target) => {
    ctx.beginPath();
    ctx.arc(target.pos.x, target.pos.y, target.radius, 0, Math.PI * 2);

    if (target.hit) {
      ctx.fillStyle = "rgba(255, 217, 61, 0.3)";
      ctx.strokeStyle = "#666";
    } else {
      ctx.fillStyle = "#ffd93d";
      ctx.strokeStyle = "#ffeb3b";
      ctx.shadowColor = "#ffd93d";
      ctx.shadowBlur = 15;
    }

    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Points text
    if (!target.hit) {
      ctx.fillStyle = "#333";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(target.points.toString(), target.pos.x, target.pos.y);
    }
  });

  // Draw bumpers
  bumpers.forEach((bumper) => {
    ctx.beginPath();
    ctx.arc(bumper.pos.x, bumper.pos.y, bumper.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#6bcb77";
    ctx.strokeStyle = "#9fe2a5";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#6bcb77";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Draw flippers
  flippers.forEach((flipper) => {
    const endX = flipper.pos.x + Math.cos(flipper.angle) * flipper.length;
    const endY = flipper.pos.y + Math.sin(flipper.angle) * flipper.length;

    ctx.beginPath();
    ctx.moveTo(flipper.pos.x, flipper.pos.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Pivot
    ctx.beginPath();
    ctx.arc(flipper.pos.x, flipper.pos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#cc5555";
    ctx.fill();
  });

  // Draw ball
  if (ball.active || state.status === "waiting") {
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(
      ball.pos.x - 3,
      ball.pos.y - 3,
      0,
      ball.pos.x,
      ball.pos.y,
      ball.radius
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, "#c0c0c0");
    gradient.addColorStop(1, "#808080");

    ctx.fillStyle = gradient;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Draw drain zone
  ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
  ctx.fillRect(50, height - 20, width - 100, 20);
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  scoreDisplay.textContent = state.score.toString();
  ballsDisplay.textContent = state.balls.toString();
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = `${i18n.t("game.complete")} - ${i18n.t("game.score")}: ${state.score}`;
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.score")}: ${state.score}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
    };
  }
}

function showLostOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameOver");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${game.getState().score}`;
  startBtn.textContent = i18n.t("game.tryAgain");
  startBtn.onclick = () => startGame(game.getState().level);
}

function startGame(level: number = 1): void {
  overlay.style.display = "none";
  game.start(level);
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => game.reset());
launchBtn.addEventListener("click", () => game.launch());

// Initialize
initI18n();
initGame();
