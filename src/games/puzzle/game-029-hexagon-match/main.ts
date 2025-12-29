/**
 * Hexagon Match Main Entry
 * Crystalline Honeycomb Theme
 * Game #029
 */
import { HexGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playPlace(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Crystal placement sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1200, now);
    gain2.gain.setValueAtTime(0.1, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.15);
  }

  playClear(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Ascending crystalline chime
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.15, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.35);
    });

    // Resonance
    const res = ctx.createOscillator();
    const resGain = ctx.createGain();
    res.type = 'triangle';
    res.frequency.setValueAtTime(392, now);
    resGain.gain.setValueAtTime(0.1, now);
    resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    res.connect(resGain).connect(ctx.destination);
    res.start(now);
    res.stop(now + 0.5);
  }

  playDrag(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Soft hover sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playInvalid(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Low thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playGameOver(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Descending tones
    [400, 300, 200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.15, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.35);
    });
  }

  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Honeycomb awakening
    [262, 330, 392, 523].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: HexGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// State tracking
let previousScore = 0;
let wasGameOver = false;
let isDragging = false;

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

async function initWebGPU() {
  const webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.id = 'webgpu-canvas';
  webgpuCanvas.className = 'webgpu-overlay';

  const gameArea = document.querySelector('.game-area');
  if (gameArea) {
    gameArea.appendChild(webgpuCanvas);

    const resizeCanvas = () => {
      const rect = gameArea.getBoundingClientRect();
      webgpuCanvas.width = rect.width;
      webgpuCanvas.height = rect.height;
      webgpuCanvas.style.width = rect.width + 'px';
      webgpuCanvas.style.height = rect.height + 'px';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (!success) {
      renderer = null;
      webgpuCanvas.remove();
    }
  }
}

function initGame() {
  game = new HexGame(canvas);
  game.resize();

  // Mouse Inputs with effects
  canvas.addEventListener("mousedown", (e) => {
    handleInput("down", e);
    isDragging = true;
    audio.playDrag();
  });
  window.addEventListener("mousemove", (e) => {
    handleInput("move", e);
    if (isDragging && renderer) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      renderer.emitDragTrail(x, y);
    }
  });
  window.addEventListener("mouseup", (e) => {
    handleInput("up", e);
    isDragging = false;
  });

  // Touch
  canvas.addEventListener("touchstart", (e) => {
    handleTouch("down", e);
    isDragging = true;
    audio.playDrag();
  }, { passive: false });
  window.addEventListener("touchmove", (e) => {
    handleTouch("move", e);
    if (isDragging && renderer) {
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / rect.width;
      const y = (touch.clientY - rect.top) / rect.height;
      renderer.emitDragTrail(x, y);
    }
  }, { passive: false });
  window.addEventListener("touchend", (e) => {
    handleTouch("up", e);
    isDragging = false;
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();

    // Detect score increase (placement or clear)
    if (state.score > previousScore) {
      const scoreDiff = state.score - previousScore;

      if (scoreDiff > 100) {
        // Line clear (bonus points)
        audio.playClear();
        if (renderer) {
          renderer.emitClear(0.5, 0.35);
        }
      } else if (scoreDiff > 0) {
        // Regular placement
        audio.playPlace();
        if (renderer) {
          renderer.emitPlace(0.5, 0.35, '#f1c40f');
        }
      }

      previousScore = state.score;
    }

    if (state.status === "gameover" && !wasGameOver) {
      wasGameOver = true;
      audio.playGameOver();
      if (renderer) {
        renderer.emitGameOver(0.5, 0.35);
      }
      showGameOver();
    }
  });

  window.addEventListener("resize", () => game.resize());

  // WebGPU render loop
  function renderLoop() {
    if (renderer) {
      renderer.render();
    }
    requestAnimationFrame(renderLoop);
  }
  renderLoop();
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  game.handleInput(type, x, y);
}

function showGameOver() {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${
    scoreDisplay.textContent
  }`;
  startBtn.textContent = i18n.t("game.start");

  startBtn.onclick = () => {
    startGame();
  };
}

function startGame() {
  overlay.style.display = "none";
  previousScore = 0;
  wasGameOver = false;
  audio.playStart();
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  previousScore = 0;
  wasGameOver = false;
  startBtn.onclick = startGame;
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
