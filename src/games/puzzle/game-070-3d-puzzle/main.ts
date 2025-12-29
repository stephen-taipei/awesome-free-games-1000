/**
 * 3D Puzzle Main Entry
 * Game #070 - Holographic / Geometric / Futuristic Theme
 */
import { Puzzle3DGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// ─────────────────────────────────────────────────────────────
// Audio System - Holographic / Geometric Sounds
// ─────────────────────────────────────────────────────────────
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private ensureContext(): boolean {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return false;
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return true;
  }

  // Block selection - holographic ping
  playSelect(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // High-pitched holographic ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.1);

    filter.type = "highpass";
    filter.frequency.value = 800;

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);

    // Shimmer overtone
    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(3600, now);
    shimmerGain.gain.setValueAtTime(0.1, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.masterGain);
    shimmer.start(now);
    shimmer.stop(now + 0.15);
  }

  // Block rotation - geometric whoosh
  playRotate(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);

    // Add swoosh noise
    const noise = this.ctx.createBufferSource();
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 2000;
    noiseFilter.Q.value = 2;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
  }

  // Block placed - assembly confirmation
  playPlace(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Satisfying click-lock sound
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = "square";
    click.frequency.value = 150;
    clickGain.gain.setValueAtTime(0.4, now);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    click.connect(clickGain);
    clickGain.connect(this.masterGain);
    click.start(now);
    click.stop(now + 0.05);

    // Ascending confirmation tones
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    });
  }

  // Level complete - victory fanfare
  playVictory(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Triumphant chord progression
    const chords = [
      [523, 659, 784],
      [587, 740, 880],
      [659, 784, 988],
      [784, 988, 1175],
    ];

    chords.forEach((chord, ci) => {
      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.value = freq;

        filter.type = "lowpass";
        filter.frequency.value = 3000;

        gain.gain.setValueAtTime(0, now + ci * 0.2);
        gain.gain.linearRampToValueAtTime(0.25, now + ci * 0.2 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + ci * 0.2 + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + ci * 0.2);
        osc.stop(now + ci * 0.2 + 0.4);
      });
    });

    // Shimmer finish
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const shimmer = this.ctx.createOscillator();
      const shimmerGain = this.ctx.createGain();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(2000, this.ctx.currentTime);
      shimmer.frequency.exponentialRampToValueAtTime(4000, this.ctx.currentTime + 0.3);
      shimmerGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(this.masterGain);
      shimmer.start();
      shimmer.stop(this.ctx.currentTime + 0.3);
    }, 800);
  }

  // Game complete - ultimate celebration
  playGameComplete(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Sweeping arpeggio
    const notes = [523, 659, 784, 988, 1175, 1318, 1568, 1976];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.05, now + i * 0.1 + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });

    // Final chord
    setTimeout(() => {
      this.playVictory();
    }, 1000);
  }

  // Scene rotation - ambient whoosh
  playSceneRotate(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.value = 80;

    filter.type = "lowpass";
    filter.frequency.value = 200;

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Reset - digital rewind
  playReset(): void {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }
}

// ─────────────────────────────────────────────────────────────
// DOM Elements
// ─────────────────────────────────────────────────────────────
const container = document.getElementById("puzzle-container")!;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const piecesDisplay = document.getElementById("pieces-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: Puzzle3DGame;
let renderer: WebGPURenderer;
let audio: AudioSystem;
let animationId: number;

// ─────────────────────────────────────────────────────────────
// Internationalization
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// WebGPU Setup
// ─────────────────────────────────────────────────────────────
async function initWebGPU() {
  const canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  if (!canvas) return;

  renderer = new WebGPURenderer();
  const success = await renderer.initialize(canvas);

  if (success) {
    function renderLoop() {
      renderer.render();
      animationId = requestAnimationFrame(renderLoop);
    }
    renderLoop();
  }
}

// ─────────────────────────────────────────────────────────────
// Game Setup
// ─────────────────────────────────────────────────────────────
function initGame() {
  audio = new AudioSystem();
  game = new Puzzle3DGame(container);

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    piecesDisplay.textContent = state.pieces.toString();

    // Handle events
    if (state.event) {
      const x = state.x ?? container.clientWidth / 2;
      const y = state.y ?? container.clientHeight / 2;

      switch (state.event) {
        case "blockSelect":
          audio.playSelect();
          renderer?.emitBlockSelect(x, y);
          break;
        case "blockRotate":
          audio.playRotate();
          renderer?.emitBlockRotate(x, y);
          break;
        case "blockPlace":
          audio.playPlace();
          renderer?.emitBlockPlace(x, y);
          break;
        case "sceneRotate":
          audio.playSceneRotate();
          renderer?.emitSceneRotate(x, y);
          break;
      }
    }

    if (state.status === "won") {
      showWin();
    } else if (state.status === "complete") {
      showComplete();
    }
  });
}

function showWin() {
  audio.playVictory();
  renderer?.emitVictory();

  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.hint");
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 500);
}

function showComplete() {
  audio.playGameComplete();
  renderer?.emitGameComplete();

  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.start");
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    startBtn.onclick = () => {
      game.restart();
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
}

// ─────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────
startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  renderer?.emitReset();
  game.reset();
});
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  renderer?.emitLevelStart();
  game.nextLevel();
});

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────
initI18n();
initGame();
initWebGPU();
