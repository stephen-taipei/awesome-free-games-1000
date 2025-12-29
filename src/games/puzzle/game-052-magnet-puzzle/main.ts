/**
 * Magnet Puzzle Main Entry
 * Plasma Physics Lab / Electromagnetic Field Theme
 * Game #052
 */
import { MagnetPuzzleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Plasma Physics Lab Sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Magnet activation - electromagnetic pulse
  playActivate(polarity: 'N' | 'S'): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Base frequency differs by polarity
    const baseFreq = polarity === 'N' ? 200 : 150;

    // Electromagnetic hum
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);

    // High frequency crackle
    const crackle = ctx.createOscillator();
    const crackleGain = ctx.createGain();
    crackle.type = 'square';
    crackle.frequency.value = 2000 + Math.random() * 500;
    crackleGain.gain.setValueAtTime(0.03, now);
    crackleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    crackle.connect(crackleGain);
    crackleGain.connect(ctx.destination);
    crackle.start(now);
    crackle.stop(now + 0.1);
  }

  // Attraction effect - harmonic convergence
  playAttract(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Descending harmonics (coming together)
    const notes = [600, 500, 400, 350];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.15);
    });

    // Soft connection tone
    const connect = ctx.createOscillator();
    const connectGain = ctx.createGain();
    connect.type = 'triangle';
    connect.frequency.value = 300;
    connectGain.gain.setValueAtTime(0.08, now + 0.2);
    connectGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    connect.connect(connectGain);
    connectGain.connect(ctx.destination);
    connect.start(now + 0.2);
    connect.stop(now + 0.4);
  }

  // Repulsion effect - energy burst
  playRepel(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Ascending harmonics (pushing apart)
    const notes = [200, 300, 400, 500];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.08, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.03 + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 0.1);
    });

    // Repulsion burst noise
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 3);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.1);
  }

  // Piece moved
  playMove(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Goal reached - containment success
  playGoal(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Success chord
    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.3);
    });

    // Containment lock tone
    const lock = ctx.createOscillator();
    const lockGain = ctx.createGain();
    lock.type = 'triangle';
    lock.frequency.value = 1000;
    lockGain.gain.setValueAtTime(0.05, now + 0.2);
    lockGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    lock.connect(lockGain);
    lockGain.connect(ctx.destination);
    lock.start(now + 0.2);
    lock.stop(now + 0.35);
  }

  // Victory - field stabilization complete
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Victory fanfare with electromagnetic theme
    const melody = [523, 659, 784, 659, 784, 1047]; // C5, E5, G5, E5, G5, C6
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.12;
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 1.005; // Slight detune for plasma effect

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

    // Energy discharge cascade
    for (let i = 0; i < 8; i++) {
      const spark = ctx.createOscillator();
      const sparkGain = ctx.createGain();

      spark.type = 'square';
      spark.frequency.value = 1500 + i * 200;

      sparkGain.gain.setValueAtTime(0.02, now + 0.5 + i * 0.06);
      sparkGain.gain.exponentialRampToValueAtTime(0.01, now + 0.55 + i * 0.06);

      spark.connect(sparkGain);
      sparkGain.connect(ctx.destination);

      spark.start(now + 0.5 + i * 0.06);
      spark.stop(now + 0.6 + i * 0.06);
    }

    // Low power hum stabilization
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.value = 60;
    bassGain.gain.setValueAtTime(0.15, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 1.0);
  }

  // Start game - lab power on
  playStart(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Power up sequence
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);

    // System online chime
    const chime = [523, 659, 784];
    chime.forEach((freq, i) => {
      const tone = ctx.createOscillator();
      const toneGain = ctx.createGain();

      tone.type = 'sine';
      tone.frequency.value = freq;

      toneGain.gain.setValueAtTime(0.08, now + 0.3 + i * 0.1);
      toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4 + i * 0.1 + 0.15);

      tone.connect(toneGain);
      toneGain.connect(ctx.destination);

      tone.start(now + 0.3 + i * 0.1);
      tone.stop(now + 0.5 + i * 0.1);
    });
  }

  // Reset - field recalibration
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Descending power down
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);

    // Recalibration beeps
    for (let i = 0; i < 3; i++) {
      const beep = ctx.createOscillator();
      const beepGain = ctx.createGain();
      beep.type = 'sine';
      beep.frequency.value = 800;
      beepGain.gain.setValueAtTime(0.05, now + 0.35 + i * 0.1);
      beepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.38 + i * 0.1);
      beep.connect(beepGain);
      beepGain.connect(ctx.destination);
      beep.start(now + 0.35 + i * 0.1);
      beep.stop(now + 0.4 + i * 0.1);
    }
  }

  // Next level - power surge
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

    // Power surge effect
    const surge = ctx.createOscillator();
    const surgeGain = ctx.createGain();
    surge.type = 'sawtooth';
    surge.frequency.setValueAtTime(100, now + 0.3);
    surge.frequency.exponentialRampToValueAtTime(300, now + 0.5);
    surgeGain.gain.setValueAtTime(0.06, now + 0.3);
    surgeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    surge.connect(surgeGain);
    surgeGain.connect(ctx.destination);
    surge.start(now + 0.3);
    surge.stop(now + 0.5);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: MagnetPuzzleGame;
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
  game = new MagnetPuzzleGame(canvas);
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

    // Get click info for effects
    const clickInfo = game.getClickInfo(x, y);
    if (clickInfo) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;

      if (clickInfo.type === 'magnet') {
        audio.playActivate(clickInfo.polarity);
        if (renderer) {
          renderer.emitActivate(nx, ny, clickInfo.polarity);
        }
      }
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

    const clickInfo = game.getClickInfo(x, y);
    if (clickInfo) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;

      if (clickInfo.type === 'magnet') {
        audio.playActivate(clickInfo.polarity);
        if (renderer) {
          renderer.emitActivate(nx, ny, clickInfo.polarity);
        }
      }
    }

    game.handleClick(x, y);
  });

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) {
      movesDisplay.textContent = String(state.moves);
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.event === 'attract') {
      audio.playAttract();
      if (renderer && state.x !== undefined && state.y !== undefined) {
        renderer.emitAttract(state.x / canvas.width, state.y / canvas.height);
      }
    }
    if (state.event === 'repel') {
      audio.playRepel();
      if (renderer && state.x !== undefined && state.y !== undefined) {
        renderer.emitRepel(state.x / canvas.width, state.y / canvas.height);
      }
    }
    if (state.event === 'move') {
      audio.playMove();
    }
    if (state.event === 'goal') {
      audio.playGoal();
      if (renderer && state.x !== undefined && state.y !== undefined) {
        renderer.emitGoal(state.x / canvas.width, state.y / canvas.height);
      }
    }
    if (state.status === "won") {
      audio.playVictory();
      if (renderer) {
        renderer.emitVictory(0.5, 0.5);
      }
      showWin(state.hasNextLevel, state.moves);
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

function showWin(hasNextLevel: boolean, moves: number) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = `${i18n.t("game.moves")}: ${moves}`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        audio.playNextLevel();
        game.nextLevel();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = `${i18n.t("game.moves")}: ${moves}`;
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
  movesDisplay.textContent = "0";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
});

// Init
initI18n();
initGame();
