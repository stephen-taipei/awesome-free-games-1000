/**
 * Paper Plane Puzzle Main Entry
 * Origami Workshop / Japanese Zen Garden Theme
 * Game #053
 */
import { PaperPlaneGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Japanese Zen Garden Sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Paper fold sound - crisp and satisfying
  playFold(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Paper crinkle using filtered noise
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.exp(-i / bufferSize * 4);
      data[i] = (Math.random() * 2 - 1) * 0.3 * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.15);

    // Soft crease tone
    const crease = ctx.createOscillator();
    const creaseGain = ctx.createGain();
    crease.type = 'sine';
    crease.frequency.setValueAtTime(800, now);
    crease.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    creaseGain.gain.setValueAtTime(0.08, now);
    creaseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    crease.connect(creaseGain);
    creaseGain.connect(ctx.destination);
    crease.start(now);
    crease.stop(now + 0.1);
  }

  // Undo sound - reverse fold
  playUndo(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Ascending tone (unfold feeling)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);

    // Soft paper rustle
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1 * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.08;
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  // Correct fold in sequence
  playCorrect(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Gentle wind chime
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.08, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  // Wrong sequence
  playWrong(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Soft descending tone
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

  // Victory - paper plane takes flight
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Wind whoosh for launch
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const envelope = Math.sin(t * Math.PI / 0.5);
      data[i] = (Math.random() * 2 - 1) * 0.1 * envelope;
    }

    const wind = ctx.createBufferSource();
    wind.buffer = buffer;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(500, now);
    windFilter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.15, now);
    windGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);

    wind.start(now);
    wind.stop(now + 0.5);

    // Japanese wind chime melody
    const chime = [784, 880, 1047, 880, 1047, 1319]; // G5, A5, C6, A5, C6, E6
    chime.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = 0.2 + i * 0.12;
      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });

    // Gentle bell resonance
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'triangle';
    bell.frequency.value = 2000;
    bellGain.gain.setValueAtTime(0.04, now + 0.5);
    bellGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now + 0.5);
    bell.stop(now + 1.0);
  }

  // Start game - shoji door slide
  playStart(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Soft sliding sound
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * 0.08 * Math.sin(t * Math.PI);
    }

    const slide = ctx.createBufferSource();
    slide.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    slide.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    slide.start(now);
    slide.stop(now + 0.3);

    // Gentle tone
    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();
    tone.type = 'sine';
    tone.frequency.value = 392; // G4
    toneGain.gain.setValueAtTime(0.06, now + 0.2);
    toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    tone.connect(toneGain);
    toneGain.connect(ctx.destination);
    tone.start(now + 0.2);
    tone.stop(now + 0.4);
  }

  // Reset - soft reset
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Paper shuffle
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15 * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.2);

    // Soft chime
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    oscGain.gain.setValueAtTime(0.05, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now + 0.1);
    osc.stop(now + 0.25);
  }

  // Next level
  playNextLevel(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Ascending chime
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.08, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.25);
    });
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const foldsDisplay = document.getElementById("folds-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const undoBtn = document.getElementById("undo-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: PaperPlaneGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

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
  game = new PaperPlaneGame(canvas);
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

    audio.playFold();
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitFold(nx, ny);
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

    audio.playFold();
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitFold(nx, ny);
    }

    game.handleClick(x, y);
  });

  game.setOnStateChange((state: any) => {
    if (state.folds !== undefined) {
      foldsDisplay.textContent = state.folds;
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      audio.playVictory();
      if (renderer) {
        renderer.emitVictory(0.5, 0.4);
        renderer.emitLaunch(0.5, 0.4);
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
      overlayMsg.textContent = i18n.t("game.launch");
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        audio.playNextLevel();
        game.nextLevel();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = i18n.t("game.launch");
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        levelDisplay.textContent = "1";
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playStart();
  game.start();
}

startBtn.addEventListener("click", startGame);
undoBtn.addEventListener("click", () => {
  audio.playUndo();
  if (renderer) {
    renderer.emitUndo(0.5, 0.5);
  }
  game.undo();
});
resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
});

// Init
initI18n();
initGame();
