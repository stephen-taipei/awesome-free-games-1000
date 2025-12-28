/**
 * Breakout Main Entry
 * Game #153
 */
import { BreakoutGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const livesDisplay = document.getElementById("lives-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

let game: BreakoutGame;
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
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playBrickBreak(row: number) {
    // Higher pitch for higher rows
    const baseFreq = 300 + (5 - row) * 80;
    this.playTone(baseFreq, 0.1, "square", 0.05);
    this.playTone(baseFreq * 1.5, 0.08, "sine", 0.04, 0.02);
  }

  playPaddleHit() {
    this.playTone(200, 0.08, "triangle", 0.06);
    this.playTone(250, 0.06, "sine", 0.04, 0.02);
  }

  playWallBounce() {
    this.playTone(150, 0.05, "sine", 0.03);
  }

  playLifeLost() {
    // Descending tones
    this.playTone(400, 0.15, "sawtooth", 0.05);
    this.playTone(300, 0.15, "sawtooth", 0.04, 0.1);
    this.playTone(200, 0.2, "triangle", 0.04, 0.2);
  }

  playGameOver() {
    // Dramatic descend
    this.playTone(500, 0.2, "sawtooth", 0.06);
    this.playTone(400, 0.2, "sawtooth", 0.05, 0.15);
    this.playTone(300, 0.2, "sawtooth", 0.04, 0.3);
    this.playTone(200, 0.3, "sawtooth", 0.04, 0.45);
    this.playTone(100, 0.4, "triangle", 0.05, 0.6);
  }

  playVictory() {
    // Triumphant fanfare
    for (let i = 0; i < 10; i++) {
      this.playTone(300 + i * 60, 0.12, "sine", 0.05, i * 0.08);
    }
    this.playTone(900, 0.5, "sine", 0.08, 0.8);
  }

  playStart() {
    // Energetic start
    this.playTone(262, 0.1, "sine", 0.06);
    this.playTone(330, 0.1, "sine", 0.055, 0.08);
    this.playTone(392, 0.1, "sine", 0.05, 0.16);
    this.playTone(523, 0.15, "sine", 0.06, 0.24);
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
  game = new BreakoutGame(canvas);
  game.resize();

  // Mouse control
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    game.setPaddlePosition(x);
  });

  // Touch control
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    game.setPaddlePosition(x);
  });

  // Keyboard control
  document.addEventListener("keydown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const paddleSpeed = rect.width * 0.05;
    const paddle = game.paddleInfo;

    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      game.setPaddlePosition(paddle.x + paddle.width / 2 - paddleSpeed);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      game.setPaddlePosition(paddle.x + paddle.width / 2 + paddleSpeed);
    }
  });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    livesDisplay.textContent = state.lives.toString();

    // Update WebGPU renderer and play sounds
    if (renderer) {
      if (state.brickBreak) {
        const nx = state.brickBreak.x / canvas.clientWidth;
        const ny = 1 - state.brickBreak.y / canvas.clientHeight;
        renderer.emitBrickBreak(nx, ny, state.brickBreak.color, state.brickBreak.row);
        audio.playBrickBreak(state.brickBreak.row);
      }

      if (state.ballMove) {
        const nx = state.ballMove.x / canvas.clientWidth;
        const ny = 1 - state.ballMove.y / canvas.clientHeight;
        renderer.emitBallTrail(nx, ny);
      }

      if (state.paddleHit) {
        const nx = state.paddleHit.x / canvas.clientWidth;
        const ny = 1 - state.paddleHit.y / canvas.clientHeight;
        renderer.emitPaddleHit(nx, ny);
        audio.playPaddleHit();
      }

      if (state.wallBounce) {
        const nx = state.wallBounce.x / canvas.clientWidth;
        const ny = 1 - state.wallBounce.y / canvas.clientHeight;
        renderer.emitWallBounce(nx, ny);
        audio.playWallBounce();
      }

      if (state.lifeLost && state.status !== "over") {
        audio.playLifeLost();
      }
    }

    if (state.status === "over") {
      if (state.gameOver && renderer) {
        const nx = state.gameOver.x / canvas.clientWidth;
        const ny = 1 - state.gameOver.y / canvas.clientHeight;
        renderer.emitGameOver(nx, ny);
      }
      audio.playGameOver();
      showGameOver(state.score);
    } else if (state.status === "won") {
      if (state.victory) {
        renderer?.emitVictory();
        audio.playVictory();
      }
      showWin(state.score);
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

function showWin(score: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
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
