/**
 * Domino Puzzle Main Entry
 * Luxury Casino / Monte Carlo Theme
 * Game #051
 */
import { DominoPuzzleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Luxury Casino Sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Click/select domino - chip click
  playSelect(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Chip click sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);

    // Secondary tap
    const tap = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tap.type = 'triangle';
    tap.frequency.value = 1200;
    tapGain.gain.setValueAtTime(0.05, now);
    tapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    tap.connect(tapGain);
    tapGain.connect(ctx.destination);
    tap.start(now);
    tap.stop(now + 0.03);
  }

  // Deselect
  playDeselect(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Match found - casino win chime
  playMatch(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Ascending win chime
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.25);
    });

    // Bell shimmer
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'triangle';
    bell.frequency.value = 2093;
    bellGain.gain.setValueAtTime(0.05, now + 0.15);
    bellGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now + 0.15);
    bell.stop(now + 0.4);
  }

  // No match - soft negative
  playNoMatch(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Victory - casino jackpot celebration
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Fanfare melody
    const melody = [523, 659, 784, 659, 784, 1047]; // C5, E5, G5, E5, G5, C6
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.12;
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc2.type = 'triangle';
      osc2.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc2.start(now + delay);
      osc.stop(now + delay + 0.4);
      osc2.stop(now + delay + 0.4);
    });

    // Coin shower effect
    for (let i = 0; i < 10; i++) {
      const coin = ctx.createOscillator();
      const coinGain = ctx.createGain();

      coin.type = 'sine';
      coin.frequency.value = 1500 + i * 100;

      coinGain.gain.setValueAtTime(0.03, now + 0.5 + i * 0.05);
      coinGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6 + i * 0.05);

      coin.connect(coinGain);
      coinGain.connect(ctx.destination);

      coin.start(now + 0.5 + i * 0.05);
      coin.stop(now + 0.7 + i * 0.05);
    }

    // Low bass hit
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.value = 80;
    bassGain.gain.setValueAtTime(0.15, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 0.3);
  }

  // Start game
  playStart(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [392, 494, 587]; // G4, B4, D5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  // Reset - shuffle sound
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Shuffle noise
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1 * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.3);

    // Tap sounds
    for (let i = 0; i < 5; i++) {
      const tap = ctx.createOscillator();
      const tapGain = ctx.createGain();
      tap.type = 'sine';
      tap.frequency.value = 600 + i * 50;
      tapGain.gain.setValueAtTime(0.04, now + i * 0.05);
      tapGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.03);
      tap.connect(tapGain);
      tapGain.connect(ctx.destination);
      tap.start(now + i * 0.05);
      tap.stop(now + i * 0.05 + 0.03);
    }
  }

  // Next level
  playNextLevel(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const remainingDisplay = document.getElementById("remaining-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: DominoPuzzleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

let lastRemaining = 0;

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
  game = new DominoPuzzleGame(canvas);
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

  // Mouse click
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    audio.playSelect();
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitSelect(nx, ny);
    }

    game.handleClick(x, y);
  });

  // Touch
  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    audio.playSelect();
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitSelect(nx, ny);
    }

    game.handleClick(x, y);
  });

  game.setOnStateChange((state: any) => {
    if (state.remaining !== undefined) {
      // Check if a match was made
      if (state.remaining < lastRemaining && lastRemaining - state.remaining === 2) {
        audio.playMatch();
        if (renderer) {
          renderer.emitMatch(0.5, 0.5);
        }
      }
      lastRemaining = state.remaining;
      remainingDisplay.textContent = String(state.remaining);
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

function showWin(hasNextLevel: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        audio.playNextLevel();
        lastRemaining = 0;
        game.nextLevel();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        levelDisplay.textContent = "1";
        lastRemaining = 0;
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playStart();
  lastRemaining = 0;
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  lastRemaining = 0;
  game.reset();
});

// Init
initI18n();
initGame();
