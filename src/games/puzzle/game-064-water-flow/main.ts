/**
 * Water Flow Main Entry
 * Aquatic / Underwater Plumbing Theme
 * Game #064
 */
import { WaterFlowGame } from "./game";
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
const flowBtn = document.getElementById("flow-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: WaterFlowGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Aquatic Water Sounds
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

  // Water droplet sound
  private playDroplet(frequency: number, duration: number, volume: number = 0.3) {
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
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Water flow sound (continuous)
  private playWaterFlow(duration: number, volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate water noise
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.sin(t * Math.PI);
      const noise = (Math.random() * 2 - 1);
      const wave = Math.sin(t * 100) * 0.3;
      data[i] = (noise * 0.5 + wave) * envelope * 0.5;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 1;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  // Bubble pop sound
  private playBubble(frequency: number, volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + 0.05);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Splash sound
  private playSplash(volume: number = 0.25) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const duration = 0.3;
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 8);
      const noise = Math.random() * 2 - 1;
      data[i] = noise * envelope;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  // Pipe rotation click
  private playPipeClick(volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Success chime (underwater bells)
  private playSuccessChime(volume: number = 0.25) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playDroplet(freq, 0.5, volume);
      }, i * 120);
    });
  }

  // Pipe rotation
  playPipeRotate() {
    this.playPipeClick(0.2);
    this.playDroplet(400, 0.15, 0.1);
  }

  // Flow starts
  playFlowStart() {
    this.playWaterFlow(0.5, 0.2);
    this.playBubble(600, 0.15);
  }

  // Water fills a pipe
  playWaterFill() {
    this.playWaterFlow(0.2, 0.12);
    this.playBubble(500 + Math.random() * 200, 0.1);
  }

  // Water reaches target
  playReachTarget() {
    this.playSplash(0.3);
    this.playSuccessChime(0.25);
  }

  // Flow fails
  playFlowFail() {
    this.playSplash(0.2);
    this.playDroplet(200, 0.3, 0.2);
  }

  // Victory fanfare
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const fanfare = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.15 },
      { freq: 783.99, time: 0.3 },
      { freq: 1046.50, time: 0.45 },
    ];

    fanfare.forEach(({ freq, time }) => {
      setTimeout(() => {
        this.playDroplet(freq, 0.5, 0.3);
      }, time * 1000);
    });

    // Final splash
    setTimeout(() => {
      this.playSplash(0.4);
      [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
        this.playDroplet(freq, 0.8, 0.2);
      });
    }, 700);
  }

  // Game start
  playStart() {
    this.playBubble(400, 0.2);
    setTimeout(() => {
      this.playBubble(500, 0.2);
    }, 100);
    setTimeout(() => {
      this.playBubble(600, 0.2);
    }, 200);
  }

  // Reset
  playReset() {
    this.playSplash(0.15);
  }

  // Next level
  playNextLevel() {
    this.playBubble(500, 0.2);
    setTimeout(() => {
      this.playBubble(700, 0.25);
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
  game = new WaterFlowGame(canvas);

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    movesDisplay.textContent = String(state.moves);

    // Handle events
    if (state.event === 'pipeRotate' && state.x !== undefined) {
      renderer?.emitPipeRotate(state.x, state.y);
      audio.playPipeRotate();
    }

    if (state.event === 'flowStart' && state.x !== undefined) {
      renderer?.emitFlowStart(state.x, state.y);
      audio.playFlowStart();
    }

    if (state.event === 'waterFill' && state.x !== undefined) {
      renderer?.emitWaterFill(state.x, state.y);
      audio.playWaterFill();
    }

    if (state.event === 'reachTarget' && state.x !== undefined) {
      renderer?.emitReachTarget(state.x, state.y);
      audio.playReachTarget();
    }

    if (state.event === 'flowFail' && state.x !== undefined) {
      renderer?.emitFlowFail(state.x, state.y);
      audio.playFlowFail();
    }

    if (state.status === "won") {
      showWin();
      renderer?.emitVictory();
      audio.playVictory();
    } else if (state.status === "failed") {
      showFail();
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
      audio.playReset();
    };
  }, 800);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  audio.playStart();
  renderer?.emitLevelStart();
}

startBtn.addEventListener("click", startGame);
flowBtn.addEventListener("click", () => {
  game.startFlow();
});
resetBtn.addEventListener("click", () => {
  game.reset();
  audio.playReset();
});

// Init
initI18n();
initGame();
initWebGPU();
