/**
 * Elevator Puzzle Main Entry
 * Modern Building / Urban Elevator Theme
 * Game #063
 */
import { ElevatorGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const deliveredDisplay = document.getElementById("delivered-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: ElevatorGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Modern Elevator Sounds
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

  // Elevator ding bell
  private playDing(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Bell-like tone with harmonics
    const harmonics = [1, 2, 3, 4.5];
    const decays = [1, 0.5, 0.3, 0.15];

    harmonics.forEach((h, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency * h, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * decays[i], now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * decays[i]);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Motor hum for elevator movement
  private playMotorHum(duration: number, direction: number, volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(60, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, now);

    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.1);
    gain.gain.setValueAtTime(volume, now + duration - 0.2);
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

  // Button click
  private playButtonClick(volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Door sliding sound
  private playDoorSlide(opening: boolean, volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const duration = 0.4;

    // Noise-based sliding
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = opening
        ? Math.sin(t * Math.PI)
        : Math.sin((1 - t) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  // Chime for success
  private playSuccessChime(volume: number = 0.25) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playDing(freq, 0.4, volume);
      }, i * 100);
    });
  }

  // Floor button press
  playButtonPress() {
    this.playButtonClick(0.2);
  }

  // Elevator starts moving
  playElevatorStart(direction: number) {
    this.playMotorHum(0.3, direction, 0.15);
  }

  // Elevator moving
  playElevatorMove(duration: number, direction: number) {
    this.playMotorHum(duration, direction, 0.1);
  }

  // Elevator arrives at floor
  playArrival() {
    this.playDing(880, 0.5, 0.25);
    setTimeout(() => {
      this.playDoorSlide(true, 0.12);
    }, 200);
  }

  // Passenger picked up
  playPickup() {
    this.playDing(660, 0.3, 0.15);
  }

  // Passenger delivered
  playDelivered() {
    this.playSuccessChime(0.2);
  }

  // Victory fanfare
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const fanfare = [
      { freq: 523.25, time: 0 },      // C5
      { freq: 659.25, time: 0.12 },   // E5
      { freq: 783.99, time: 0.24 },   // G5
      { freq: 1046.50, time: 0.36 },  // C6
    ];

    fanfare.forEach(({ freq, time }) => {
      setTimeout(() => {
        this.playDing(freq, 0.5, 0.3);
      }, time * 1000);
    });

    // Final chord
    setTimeout(() => {
      [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
        this.playDing(freq, 1.0, 0.2);
      });
    }, 600);
  }

  // Game start
  playStart() {
    this.playDing(440, 0.4, 0.2);
    setTimeout(() => {
      this.playDoorSlide(true, 0.15);
    }, 200);
  }

  // Reset
  playReset() {
    this.playButtonClick(0.15);
  }

  // Next level
  playNextLevel() {
    this.playDing(550, 0.3, 0.2);
    setTimeout(() => {
      this.playDing(700, 0.35, 0.2);
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
  game = new ElevatorGame(canvas);

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    movesDisplay.textContent = String(state.moves);
    deliveredDisplay.textContent = state.delivered;

    // Handle events
    if (state.event === 'buttonPress' && state.x !== undefined) {
      renderer?.emitButtonPress(state.x, state.y);
      audio.playButtonPress();
    }

    if (state.event === 'elevatorStart' && state.x !== undefined) {
      renderer?.emitElevatorStart(state.x, state.y);
      audio.playElevatorStart(state.direction || 1);
    }

    if (state.event === 'elevatorMove' && state.x !== undefined) {
      renderer?.emitElevatorMove(state.x, state.y);
    }

    if (state.event === 'arrival' && state.x !== undefined) {
      renderer?.emitArrival(state.x, state.y);
      audio.playArrival();
    }

    if (state.event === 'pickup' && state.x !== undefined) {
      renderer?.emitPickup(state.x, state.y);
      audio.playPickup();
    }

    if (state.event === 'delivered' && state.x !== undefined) {
      renderer?.emitDelivered(state.x, state.y);
      audio.playDelivered();
    }

    if (state.event === 'doorOpen' && state.x !== undefined) {
      renderer?.emitDoorOpen(state.x, state.y);
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

  // Keyboard
  window.addEventListener("keydown", (e) => {
    game.handleKey(e.key);
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
  }, 500);
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
