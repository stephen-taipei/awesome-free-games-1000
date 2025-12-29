/**
 * Constellation Main Entry
 * Celestial Night Sky / Observatory Astronomy Theme
 * Game #059
 */
import { ConstellationGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const constellationDisplay = document.getElementById("constellation-display")!;
const linesDisplay = document.getElementById("lines-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const hintBtn = document.getElementById("hint-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: ConstellationGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Celestial Synthesized Sounds
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

  // Celestial chime for star selection
  private playCelestialChime(frequency: number, duration: number, volume: number = 0.4) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Main tone with harmonics
    const harmonics = [1, 2, 3, 5];
    const amplitudes = [1, 0.5, 0.3, 0.15];

    harmonics.forEach((h, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency * h, now);
      osc.frequency.exponentialRampToValueAtTime(frequency * h * 1.02, now + duration * 0.1);
      osc.frequency.exponentialRampToValueAtTime(frequency * h, now + duration);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * amplitudes[i], now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Ethereal swoosh for connections
  private playEtherealSwoosh(startFreq: number, endFreq: number, duration: number, volume: number = 0.3) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // White noise filtered for swoosh
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    filter.Q.value = 5;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + duration * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);

    // Add tonal element
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq / 2, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq / 2, now + duration);
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(volume * 0.5, now + duration * 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  // Cosmic hum for ambient effects
  private playCosmicHum(frequency: number, duration: number, volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = frequency;
    osc2.frequency.value = frequency * 1.005; // Slight detune for beating

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + duration * 0.3);
    gain.gain.linearRampToValueAtTime(volume * 0.7, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  // Star selected
  playStarSelect() {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const note = notes[Math.floor(Math.random() * notes.length)];
    this.playCelestialChime(note, 0.6, 0.35);
  }

  // Stars connected
  playConnect() {
    this.playEtherealSwoosh(400, 800, 0.4, 0.3);
    setTimeout(() => {
      this.playCelestialChime(659.25, 0.5, 0.25);
    }, 100);
  }

  // Line drawn
  playLine() {
    this.playCelestialChime(440, 0.3, 0.2);
  }

  // Hint revealed
  playHint() {
    this.playCosmicHum(220, 1.2, 0.15);
    this.playCelestialChime(349.23, 0.8, 0.2); // F4
  }

  // Constellation complete
  playComplete() {
    const arpeggio = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    arpeggio.forEach((freq, i) => {
      setTimeout(() => {
        this.playCelestialChime(freq, 0.8, 0.3);
      }, i * 150);
    });

    setTimeout(() => {
      this.playCosmicHum(130.81, 1.5, 0.2); // C3
    }, 400);
  }

  // Victory fanfare
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Ascending celestial fanfare
    const fanfare = [
      { freq: 523.25, time: 0 },      // C5
      { freq: 659.25, time: 0.15 },   // E5
      { freq: 783.99, time: 0.3 },    // G5
      { freq: 1046.5, time: 0.45 },   // C6
      { freq: 1318.5, time: 0.6 },    // E6
      { freq: 1567.98, time: 0.75 },  // G6
    ];

    fanfare.forEach(({ freq, time }) => {
      setTimeout(() => {
        this.playCelestialChime(freq, 1.0, 0.35);
      }, time * 1000);
    });

    // Final cosmic chord
    setTimeout(() => {
      this.playCosmicHum(130.81, 2.0, 0.25);
      this.playCosmicHum(196.00, 2.0, 0.2);
      this.playCosmicHum(261.63, 2.0, 0.15);
    }, 900);
  }

  // Game start
  playStart() {
    this.playCosmicHum(110, 1.0, 0.2);
    setTimeout(() => {
      this.playCelestialChime(329.63, 0.5, 0.3); // E4
    }, 200);
  }

  // Reset
  playReset() {
    this.playEtherealSwoosh(600, 200, 0.3, 0.2);
  }

  // Next level
  playNextLevel() {
    this.playEtherealSwoosh(300, 700, 0.5, 0.25);
    setTimeout(() => {
      this.playCelestialChime(523.25, 0.6, 0.3);
    }, 300);
  }

  // Error/invalid
  playError() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Shooting star
  playShootingStar() {
    this.playEtherealSwoosh(1200, 400, 0.6, 0.2);
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

    // Random shooting stars
    setInterval(() => {
      if (renderer && Math.random() < 0.3) {
        const x = Math.random() * webgpuCanvas.width * 0.5;
        const y = Math.random() * webgpuCanvas.height * 0.3;
        renderer.emitShootingStar(x, y);
        if (Math.random() < 0.3) {
          audio.playShootingStar();
        }
      }
    }, 4000);
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
    updateConstellationName();
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function updateConstellationName() {
  if (game) {
    constellationDisplay.textContent = i18n.t(game.getConstellationName());
  }
}

function initGame() {
  game = new ConstellationGame(canvas);

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    constellationDisplay.textContent = i18n.t(state.constellation);
    linesDisplay.textContent = state.lines;

    // Handle game events
    if (state.event === 'starSelect' && state.x !== undefined) {
      renderer?.emitStarSelect(state.x, state.y);
      audio.playStarSelect();
    }

    if (state.event === 'connect' && state.x !== undefined) {
      renderer?.emitConnect(state.x, state.y);
      audio.playConnect();
    }

    if (state.event === 'line' && state.x1 !== undefined) {
      renderer?.emitLine(state.x1, state.y1, state.x2, state.y2);
      audio.playLine();
    }

    if (state.event === 'hint' && state.x !== undefined) {
      renderer?.emitHint(state.x, state.y);
      audio.playHint();
    }

    if (state.event === 'complete' && state.x !== undefined) {
      renderer?.emitComplete(state.x, state.y);
      audio.playComplete();
    }

    if (state.event === 'error') {
      audio.playError();
    }

    if (state.status === "won") {
      showWin();
      renderer?.emitVictory();
      audio.playVictory();
    }
  });

  // Mouse events
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.handleMouseDown(x, y);
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.handleMouseMove(x, y);
  });

  window.addEventListener("mouseup", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    game.handleMouseUp(x, y);
  });

  // Touch events
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    game.handleMouseDown(x, y);
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    game.handleMouseMove(x, y);
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    game.handleMouseUp(x, y);
  });

  window.addEventListener("resize", () => {
    game.resize();
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t(game.getConstellationName());
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
hintBtn.addEventListener("click", () => {
  game.toggleHint();
});
resetBtn.addEventListener("click", () => {
  game.reset();
  audio.playReset();
});

// Init
initI18n();
initGame();
initWebGPU();
