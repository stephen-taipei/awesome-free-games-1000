/**
 * Magic Circle Main Entry
 * Arcane Mystical / Ancient Magic Theme
 * Game #062
 */
import { MagicCircleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: MagicCircleGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Arcane Mystical Sounds
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

  // Mystical chime for magical interactions
  private playMysticalChime(baseFreq: number, duration: number, volume: number = 0.3) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Ethereal harmonics
    const harmonics = [1, 1.5, 2, 3, 4];
    const decays = [1, 0.6, 0.4, 0.25, 0.15];

    harmonics.forEach((h, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * h, now);

      filter.type = 'highpass';
      filter.frequency.value = 200;
      filter.Q.value = 1;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * decays[i], now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * decays[i]);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Arcane energy hum
  private playArcaneHum(frequency: number, duration: number, volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, now);
    osc1.frequency.exponentialRampToValueAtTime(frequency * 1.1, now + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 1.5, now);
    osc2.frequency.exponentialRampToValueAtTime(frequency * 1.3, now + duration);

    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  // Portal whoosh effect
  private playPortalWhoosh(volume: number = 0.25) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Noise-based whoosh
    const bufferSize = this.audioContext.sampleRate * 0.5;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.5);
    filter.Q.value = 2;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  // Ring rotation sound
  playRotation() {
    this.playArcaneHum(150, 0.4, 0.2);
    this.playMysticalChime(400, 0.3, 0.15);
  }

  // Ring click
  playClick() {
    this.playMysticalChime(600, 0.2, 0.2);
  }

  // Rune activation
  playRuneActivate() {
    this.playMysticalChime(800, 0.4, 0.25);
    setTimeout(() => {
      this.playArcaneHum(300, 0.3, 0.15);
    }, 100);
  }

  // Ring alignment
  playAlignment() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playMysticalChime(freq, 0.4, 0.25);
      }, i * 80);
    });
  }

  // Circle complete
  playCircleComplete() {
    this.playPortalWhoosh(0.3);
    setTimeout(() => {
      this.playMysticalChime(523.25, 0.6, 0.3);
    }, 200);
  }

  // Victory fanfare
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const fanfare = [
      { freq: 523.25, time: 0 },      // C5
      { freq: 659.25, time: 0.15 },   // E5
      { freq: 783.99, time: 0.30 },   // G5
      { freq: 1046.50, time: 0.45 },  // C6
    ];

    fanfare.forEach(({ freq, time }) => {
      setTimeout(() => {
        this.playMysticalChime(freq, 0.6, 0.3);
      }, time * 1000);
    });

    // Mystical chord
    setTimeout(() => {
      this.playPortalWhoosh(0.35);
      [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
        this.playMysticalChime(freq, 1.2, 0.2);
      });
    }, 700);
  }

  // Game start
  playStart() {
    this.playPortalWhoosh(0.25);
    setTimeout(() => {
      this.playMysticalChime(400, 0.4, 0.25);
    }, 200);
    setTimeout(() => {
      this.playMysticalChime(500, 0.3, 0.2);
    }, 350);
  }

  // Reset
  playReset() {
    this.playArcaneHum(200, 0.3, 0.2);
  }

  // Next level
  playNextLevel() {
    this.playMysticalChime(500, 0.3, 0.25);
    setTimeout(() => {
      this.playMysticalChime(700, 0.4, 0.25);
    }, 150);
    setTimeout(() => {
      this.playPortalWhoosh(0.2);
    }, 300);
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
  game = new MagicCircleGame(canvas);

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    movesDisplay.textContent = String(state.moves);

    // Handle events
    if (state.event === 'click' && state.x !== undefined) {
      renderer?.emitRingClick(state.x, state.y);
      audio.playClick();
    }

    if (state.event === 'rotation' && state.x !== undefined) {
      renderer?.emitRotation(state.x, state.y);
      audio.playRotation();
    }

    if (state.event === 'runeActivate' && state.x !== undefined) {
      renderer?.emitRuneActivate(state.x, state.y);
      audio.playRuneActivate();
    }

    if (state.event === 'alignment' && state.x !== undefined) {
      renderer?.emitAlignment(state.x, state.y);
      audio.playAlignment();
    }

    if (state.event === 'circleComplete' && state.x !== undefined) {
      renderer?.emitCircleComplete(state.x, state.y);
      audio.playCircleComplete();
    }

    if (state.status === "won") {
      showWin();
      renderer?.emitVictory();
      audio.playVictory();
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
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${game.moves}`;
    startBtn.textContent = i18n.t("game.nextLevel");

    startBtn.onclick = () => {
      game.nextLevel();
      overlay.style.display = "none";
      audio.playNextLevel();
    };
  }, 800);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  audio.playStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  audio.playReset();
});

// Init
initI18n();
initGame();
initWebGPU();
