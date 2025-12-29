/**
 * Snake Main Entry
 * Game #151
 */
import { SnakeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const highDisplay = document.getElementById("high-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

// Mobile controls
const btnUp = document.getElementById("btn-up")!;
const btnDown = document.getElementById("btn-down")!;
const btnLeft = document.getElementById("btn-left")!;
const btnRight = document.getElementById("btn-right")!;

let game: SnakeGame;
let renderer: WebGPURenderer | null = null;
let ambientInterval: number | null = null;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.3,
    delay: number = 0
  ) {
    this.init();
    if (!this.ctx) return;

    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playMove() {
    // Soft slither sound
    this.playTone(150, 0.05, "sine", 0.02);
  }

  playEat() {
    // Satisfying crunch
    this.playTone(400, 0.1, "sine", 0.08);
    this.playTone(500, 0.08, "sine", 0.06, 0.03);
    this.playTone(600, 0.06, "sine", 0.05, 0.06);
    // Bass thump
    this.playTone(80, 0.15, "triangle", 0.08);
  }

  playGrow() {
    // Growing sound
    this.playTone(200, 0.12, "triangle", 0.04);
    this.playTone(250, 0.1, "sine", 0.035, 0.04);
    this.playTone(300, 0.08, "sine", 0.03, 0.08);
  }

  playGameOver() {
    // Descending tones
    this.playTone(400, 0.2, "sawtooth", 0.06);
    this.playTone(300, 0.2, "sawtooth", 0.05, 0.1);
    this.playTone(200, 0.3, "sawtooth", 0.04, 0.2);
    this.playTone(100, 0.4, "triangle", 0.05, 0.3);
  }

  playStart() {
    // Exciting start
    this.playTone(200, 0.12, "sine", 0.05);
    this.playTone(300, 0.1, "sine", 0.045, 0.06);
    this.playTone(400, 0.08, "sine", 0.04, 0.12);
    this.playTone(500, 0.1, "sine", 0.05, 0.18);
  }
}

const audio = new AudioSystem();

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-Hant")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.includes("zh")) {
    i18n.setLocale("zh-CN");
  } else if (browserLang.includes("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.includes("ko")) {
    i18n.setLocale("ko");
  } else {
    i18n.setLocale("en");
  }

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

async function initWebGPU() {
  if (webgpuCanvas) {
    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (success) {
      ambientInterval = window.setInterval(() => {
        renderer?.emitAmbient();
      }, 200);
    } else {
      renderer = null;
    }
  }
}

function initGame() {
  game = new SnakeGame(canvas);
  game.resize();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        e.preventDefault();
        game.setDirection("up");
        break;
      case "ArrowDown":
      case "s":
      case "S":
        e.preventDefault();
        game.setDirection("down");
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        game.setDirection("left");
        break;
      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        game.setDirection("right");
        break;
    }
  });

  // Mobile controls
  btnUp.addEventListener("click", () => game.setDirection("up"));
  btnDown.addEventListener("click", () => game.setDirection("down"));
  btnLeft.addEventListener("click", () => game.setDirection("left"));
  btnRight.addEventListener("click", () => game.setDirection("right"));

  // Touch swipe controls
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) game.setDirection("right");
      else if (dx < -30) game.setDirection("left");
    } else {
      if (dy > 30) game.setDirection("down");
      else if (dy < -30) game.setDirection("up");
    }
  });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    highDisplay.textContent = state.highScore.toString();

    // Update WebGPU renderer
    if (renderer) {
      renderer.setSnakeLength(state.snakeLength || 3);

      if (state.snakeMove) {
        const nx = state.snakeMove.x / canvas.clientWidth;
        const ny = 1 - state.snakeMove.y / canvas.clientHeight;
        renderer.emitSnakeMove(nx, ny);
        audio.playMove();
      }

      if (state.foodEat) {
        const nx = state.foodEat.x / canvas.clientWidth;
        const ny = 1 - state.foodEat.y / canvas.clientHeight;
        renderer.emitFoodEat(nx, ny);
        audio.playEat();
        audio.playGrow();
      }

      if (state.scaleShimmer) {
        const nx = state.scaleShimmer.x / canvas.clientWidth;
        const ny = 1 - state.scaleShimmer.y / canvas.clientHeight;
        renderer.emitScaleShimmer(nx, ny);
      }
    }

    if (state.status === "over") {
      if (renderer && state.gameOver) {
        const nx = state.gameOver.x / canvas.clientWidth;
        const ny = 1 - state.gameOver.y / canvas.clientHeight;
        const snakePositions = state.gameOver.snakePositions?.map((p: any) => ({
          x: p.x / canvas.clientWidth,
          y: 1 - p.y / canvas.clientHeight,
        })) || [];
        renderer.emitGameOver(nx, ny, snakePositions);
      }
      audio.playGameOver();
      showGameOver(state.score);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
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

function startGame() {
  overlay.style.display = "none";
  game.start();
  renderer?.emitGameStart();
  audio.playStart();
}

startBtn.addEventListener("click", startGame);

// Init
initI18n();
initWebGPU();
initGame();
