/**
 * Origami Puzzle Main Entry
 * Japanese Washi Theme
 * Game #033
 */
import { OrigamiGame } from "./game";
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

  playFold(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Paper fold - soft crisp sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    // Paper crinkle
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = 'triangle';
    noise.frequency.setValueAtTime(2000 + Math.random() * 500, now);
    noiseGain.gain.setValueAtTime(0.02, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.06);
  }

  playUnfold(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Paper unfold - reverse crease
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playVictory(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Japanese wind chime (furin) sound
    [1318, 1174, 987, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.1, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.55);
    });

    // Sustained resonance
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'triangle';
    bell.frequency.setValueAtTime(523, now + 0.5);
    bellGain.gain.setValueAtTime(0.08, now + 0.5);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    bell.connect(bellGain).connect(ctx.destination);
    bell.start(now + 0.5);
    bell.stop(now + 1.5);
  }

  playStart(): void {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Gentle koto-like pluck
    [392, 523, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const targetIcon = document.getElementById("target-icon")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: OrigamiGame;
let targetCanvas: HTMLCanvasElement;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

// State tracking
let previousFolds: boolean[] = [];

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

  // Render loop
  function renderLoop() {
    if (renderer) {
      renderer.render();
    }
    requestAnimationFrame(renderLoop);
  }
  renderLoop();
}

function initGame() {
  game = new OrigamiGame(canvas);

  // Setup target canvas
  targetCanvas = document.createElement("canvas");
  targetCanvas.width = 60;
  targetCanvas.height = 60;
  targetIcon.appendChild(targetCanvas);

  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Determine which quadrant was clicked
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    let foldIdx = -1;
    if (x < cx && y < cy) foldIdx = 0;
    else if (x >= cx && y < cy) foldIdx = 1;
    else if (x >= cx && y >= cy) foldIdx = 2;
    else if (x < cx && y >= cy) foldIdx = 3;

    // Check if fold state changed
    const wasFolded = game.folds[foldIdx];

    game.handleInput(x, y);

    // Play sound and emit particles
    if (game.folds[foldIdx] !== wasFolded) {
      if (game.folds[foldIdx]) {
        audio.playFold();
      } else {
        audio.playUnfold();
      }

      // Emit fold particles
      if (renderer) {
        const gameArea = document.querySelector('.game-area');
        if (gameArea) {
          const areaRect = gameArea.getBoundingClientRect();
          const canvasRect = canvas.getBoundingClientRect();

          const px = (canvasRect.left - areaRect.left + x) / areaRect.width;
          const py = (canvasRect.top - areaRect.top + y) / areaRect.height;

          renderer.emitFold(px, py);
        }
      }
    }
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = state.level.toString();

    // Update target preview
    if (state.targetFolds) {
      const ctx = targetCanvas.getContext("2d")!;
      game.drawTarget(ctx, 60, 60);
    }

    if (state.win) {
      audio.playVictory();
      if (renderer) {
        renderer.triggerVictory();
      }
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function startGame() {
  overlay.style.display = "none";
  previousFolds = [];
  audio.playStart();
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
