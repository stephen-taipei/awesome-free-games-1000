/**
 * Domino Chain Main Entry
 * Wooden Board Game / Classic Domino Theme
 * Game #061
 */
import { DominoGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const dominoesDisplay = document.getElementById("dominoes-display")!;
const fallenDisplay = document.getElementById("fallen-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const pushBtn = document.getElementById("push-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: DominoGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Wooden Board Game Sounds
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  private ensureContext() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Wooden clack sound for domino placement and collision
  private playWoodClack(frequency: number, duration: number, volume: number = 0.35) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Wood resonance with harmonics
    const harmonics = [1, 2.3, 3.7, 5.1];
    const decays = [1, 0.5, 0.3, 0.15];

    harmonics.forEach((h, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency * h, now);
      osc.frequency.exponentialRampToValueAtTime(frequency * h * 0.8, now + duration);

      filter.type = 'bandpass';
      filter.frequency.value = frequency * h;
      filter.Q.value = 8;

      gain.gain.setValueAtTime(volume * decays[i], now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * decays[i]);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Soft thud for domino falling
  private playThud(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + duration);

    filter.type = 'lowpass';
    filter.frequency.value = 400;

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Click for UI interactions
  private playClick(frequency: number, volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.7, now + 0.05);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Domino placed
  playPlace() {
    this.playWoodClack(800, 0.15, 0.25);
  }

  // Domino falling
  playFall() {
    this.playThud(150, 0.2, 0.3);
    setTimeout(() => {
      this.playWoodClack(600, 0.1, 0.2);
    }, 50);
  }

  // Chain collision
  playCollision() {
    const freq = 500 + Math.random() * 200;
    this.playWoodClack(freq, 0.12, 0.25);
  }

  // Push first domino
  playPush() {
    this.playWoodClack(400, 0.2, 0.35);
    setTimeout(() => {
      this.playThud(200, 0.25, 0.25);
    }, 100);
  }

  // Target hit
  playTargetHit() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Pleasant chime
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.5);
    });
  }

  // Victory fanfare
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const fanfare = [
      { freq: 392.00, time: 0 },      // G4
      { freq: 493.88, time: 0.12 },   // B4
      { freq: 587.33, time: 0.24 },   // D5
      { freq: 783.99, time: 0.36 },   // G5
    ];

    fanfare.forEach(({ freq, time }) => {
      setTimeout(() => {
        this.playWoodClack(freq, 0.4, 0.3);
      }, time * 1000);
    });

    // Final chord
    setTimeout(() => {
      [392, 493.88, 587.33, 783.99].forEach(freq => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, this.audioContext!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext!.currentTime + 1);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start();
        osc.stop(this.audioContext!.currentTime + 1);
      });
    }, 500);
  }

  // Failure sound
  playFail() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Game start
  playStart() {
    this.playWoodClack(400, 0.3, 0.25);
    setTimeout(() => {
      this.playClick(800, 0.2);
    }, 150);
  }

  // Reset
  playReset() {
    this.playClick(500, 0.2);
  }

  // Next level
  playNextLevel() {
    this.playWoodClack(600, 0.25, 0.3);
    setTimeout(() => {
      this.playWoodClack(800, 0.2, 0.25);
    }, 150);
  }
}

const audio = new AudioSystem();

// Initialize WebGPU
async function initWebGPU() {
  renderer = new WebGPURenderer();
  const webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.id = 'webgpu-canvas';
  webgpuCanvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  `;

  const gameArea = document.querySelector('.game-area');
  if (gameArea) {
    gameArea.insertBefore(webgpuCanvas, gameArea.firstChild);
  }

  const success = await renderer.initialize(webgpuCanvas);
  if (success) {
    function animate() {
      renderer?.render();
      requestAnimationFrame(animate);
    }
    animate();
  }
  return success;
}

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

function initGame() {
  game = new DominoGame(canvas);

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    dominoesDisplay.textContent = state.dominoes;
    fallenDisplay.textContent = String(state.fallen);

    // Handle events
    if (state.event === 'place' && state.x !== undefined) {
      renderer?.emitPlace(state.x, state.y);
      audio.playPlace();
    }

    if (state.event === 'fall' && state.x !== undefined) {
      renderer?.emitFall(state.x, state.y);
      audio.playFall();
    }

    if (state.event === 'collision' && state.x !== undefined) {
      renderer?.emitCollision(state.x, state.y);
      audio.playCollision();
    }

    if (state.event === 'push' && state.x !== undefined) {
      renderer?.emitPush(state.x, state.y);
      audio.playPush();
    }

    if (state.event === 'targetHit' && state.x !== undefined) {
      renderer?.emitTargetHit(state.x, state.y);
      audio.playTargetHit();
    }

    if (state.event === 'chainWave' && state.x !== undefined) {
      renderer?.emitChainWave(state.x, state.y);
    }

    if (state.status === "won") {
      showWin();
      renderer?.emitVictory();
      audio.playVictory();
    } else if (state.status === "failed") {
      showFail();
      if (state.x !== undefined) {
        renderer?.emitFail(state.x, state.y);
      }
      audio.playFail();
    }
  });

  // Mouse click
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.handleClick(x, y);
  });

  window.addEventListener("resize", () => {
    game.resize();
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.fallen")}: ${game.fallenCount}`;
    startBtn.textContent = i18n.t("game.nextLevel");

    startBtn.onclick = () => {
      game.nextLevel();
      overlay.style.display = "none";
      audio.playNextLevel();
    };
  }, 500);
}

function showFail() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.fail");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.tryAgain");

    startBtn.onclick = () => {
      game.reset();
      overlay.style.display = "none";
    };
  }, 800);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  audio.playStart();
}

startBtn.addEventListener("click", startGame);
pushBtn.addEventListener("click", () => {
  game.push();
});
resetBtn.addEventListener("click", () => {
  game.reset();
  audio.playReset();
});

// Init
initI18n();
initGame();
initWebGPU();
