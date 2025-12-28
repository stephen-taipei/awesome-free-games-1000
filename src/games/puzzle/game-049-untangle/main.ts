/**
 * Untangle Main Entry
 * Constellation / Star Map Theme
 * Game #049
 */
import { UntangleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Celestial sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Node grab - star activation
  playGrab(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    // Harmonic shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = 1800;
    shimmerGain.gain.setValueAtTime(0.03, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now);
    shimmer.stop(now + 0.1);
  }

  // Node release - gentle chime
  playRelease(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Move sound - subtle whoosh
  playMove(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // White noise burst
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.05);
  }

  // Crossing resolved - celestial chime
  playResolve(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [659, 784, 988]; // E5, G5, B5 - major chord
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.03 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 0.25);
    });
  }

  // Victory - constellation complete fanfare
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Ascending celestial melody
    const notes = [523, 659, 784, 988, 1319]; // C5, E5, G5, B5, E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.12;
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc2.start(now + delay);
      osc.stop(now + delay + 0.5);
      osc2.stop(now + delay + 0.5);
    });

    // Ethereal shimmer
    for (let i = 0; i < 8; i++) {
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();

      shimmer.type = 'sine';
      shimmer.frequency.value = 1500 + i * 200;

      shimmerGain.gain.setValueAtTime(0.03, now + 0.4 + i * 0.08);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6 + i * 0.08);

      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      shimmer.start(now + 0.4 + i * 0.08);
      shimmer.stop(now + 0.6 + i * 0.08);
    }
  }

  // Start game / new level
  playStart(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [392, 523, 659]; // G4, C5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  // Reset
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const crossingsDisplay = document.getElementById("crossings-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: UntangleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

let lastCrossings = 0;
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

async function initGame() {
  game = new UntangleGame(canvas);
  game.resize();

  // Initialize WebGPU
  if (bgCanvas) {
    renderer = new WebGPURenderer(bgCanvas);
    const success = await renderer.initialize();
    if (success) {
      resizeBgCanvas();
      requestAnimationFrame(function renderLoop() {
        renderer?.render();
        requestAnimationFrame(renderLoop);
      });
    }
  }

  // Mouse events
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", (e) => handleInput("up", e));

  // Touch events
  canvas.addEventListener("touchstart", (e) => handleTouch("down", e), { passive: false });
  window.addEventListener("touchmove", (e) => handleTouch("move", e), { passive: false });
  window.addEventListener("touchend", (e) => handleTouch("up", e), { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.crossings !== undefined) {
      // Check if crossings decreased (resolved some)
      if (state.crossings < lastCrossings && renderer) {
        audio.playResolve();
        // Emit nova effects
        renderer.emitNova(0.5, 0.5);
      }
      lastCrossings = state.crossings;
      crossingsDisplay.textContent = String(state.crossings);
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      audio.playVictory();
      if (renderer) {
        renderer.emitVictory(0.5, 0.5);
      }
      showWin(state.hasNextLevel);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    resizeBgCanvas();
  });
}

function resizeBgCanvas() {
  if (bgCanvas && bgCanvas.parentElement) {
    const rect = bgCanvas.parentElement.getBoundingClientRect();
    bgCanvas.width = rect.width;
    bgCanvas.height = rect.height;
  }
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (type === "down") {
    isDragging = true;
    audio.playGrab();
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitSpark(nx, ny);
    }
  } else if (type === "move" && isDragging) {
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitTrail(nx, ny);
    }
  } else if (type === "up" && isDragging) {
    isDragging = false;
    audio.playRelease();
  }

  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (type === "down") {
    isDragging = true;
    audio.playGrab();
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitSpark(nx, ny);
    }
  } else if (type === "move" && isDragging) {
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitTrail(nx, ny);
    }
  } else if (type === "up" && isDragging) {
    isDragging = false;
    audio.playRelease();
  }

  game.handleInput(type, x, y);
}

function showWin(hasNextLevel: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        audio.playStart();
        lastCrossings = 0;
        game.nextLevel();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        levelDisplay.textContent = "1";
        lastCrossings = 0;
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playStart();
  lastCrossings = 0;
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  lastCrossings = 0;
  game.reset();
});

// Init
initI18n();
initGame();
