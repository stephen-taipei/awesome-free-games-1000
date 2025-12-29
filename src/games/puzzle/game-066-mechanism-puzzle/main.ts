/**
 * Mechanism Puzzle Main Entry
 * Steampunk / Clockwork / Industrial Brass Theme
 * Game #066
 */
import { MechanismGame } from "./game";
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
const nextBtn = document.getElementById("next-btn")!;

let game: MechanismGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Steampunk / Industrial Sounds
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

  // Mechanical click
  private playMechanicalClick(volume: number = 0.25) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Sharp click with metallic overtones
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Gear grinding
  private playGearGrind(duration: number = 0.3, volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Create grinding noise
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const grind = Math.sin(t * 200) * (Math.random() * 0.5 + 0.5);
      const envelope = Math.sin(t * Math.PI);
      data[i] = grind * envelope * 0.3;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 3;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  // Steam hiss
  private playSteamHiss(duration: number = 0.4, volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.pow(1 - t, 0.5);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  // Metal clank
  private playMetalClank(pitch: number = 1, volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Multiple harmonics for metallic sound
    const frequencies = [200, 350, 520, 710].map(f => f * pitch);

    frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + 0.15);

      const amplitude = volume / (i + 1);
      gain.gain.setValueAtTime(amplitude, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 - i * 0.02);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  // Spring boing
  private playSpringBoing(volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.4);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Weight thud
  private playWeightThud(volume: number = 0.25) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);

    // Impact noise
    this.playMetalClank(0.5, volume * 0.5);
  }

  // Pulley creak
  private playPulleyCreak(volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.1);
    osc.frequency.linearRampToValueAtTime(140, now + 0.2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 10;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Door open creak
  private playDoorOpen(volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Long creaking sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.3);
    osc.frequency.linearRampToValueAtTime(120, now + 0.5);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.1);
    gain.gain.linearRampToValueAtTime(volume, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 5;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  // Victory fanfare
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Triumphant brass-like fanfare
    const notes = [
      { freq: 261.63, time: 0, dur: 0.15 },
      { freq: 329.63, time: 0.1, dur: 0.15 },
      { freq: 392.00, time: 0.2, dur: 0.15 },
      { freq: 523.25, time: 0.35, dur: 0.4 },
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.2, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      const filter = this.audioContext!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.1);
    });

    // Steam burst celebration
    setTimeout(() => this.playSteamHiss(0.6, 0.15), 400);
  }

  // Public methods for game events
  playLeverPull() {
    this.playMechanicalClick(0.3);
    this.playMetalClank(1.2, 0.15);
  }

  playButtonPress() {
    this.playMechanicalClick(0.25);
    this.playSteamHiss(0.2, 0.1);
  }

  playGearActivate() {
    this.playGearGrind(0.4, 0.15);
    this.playMetalClank(0.8, 0.1);
  }

  playPulleyActivate() {
    this.playPulleyCreak(0.15);
    this.playMetalClank(1.5, 0.1);
  }

  playWeightDrop() {
    this.playWeightThud(0.25);
    this.playSteamHiss(0.3, 0.1);
  }

  playPlatformMove() {
    this.playGearGrind(0.3, 0.1);
    this.playMetalClank(0.6, 0.1);
  }

  playSpringActivate() {
    this.playSpringBoing(0.2);
    this.playSteamHiss(0.2, 0.08);
  }

  playRopeActivate() {
    this.playPulleyCreak(0.1);
  }

  playDoorActivate() {
    this.playDoorOpen(0.2);
    this.playSteamHiss(0.4, 0.1);
  }

  playStart() {
    this.playSteamHiss(0.3, 0.15);
    this.playMechanicalClick(0.2);
  }

  playReset() {
    this.playMetalClank(0.7, 0.15);
  }

  playNextLevel() {
    this.playMechanicalClick(0.25);
    this.playSteamHiss(0.2, 0.1);
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
    z-index: 0;
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

function initGame() {
  game = new MechanismGame(canvas);
  game.resize();

  // Mouse click
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);
  });

  // Touch
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    movesDisplay.textContent = state.moves.toString();

    // Handle mechanism activation events
    if (state.event && state.x !== undefined) {
      const x = state.x;
      const y = state.y;

      switch (state.event) {
        case 'leverPull':
          renderer?.emitLeverPull(x, y);
          audio.playLeverPull();
          break;
        case 'buttonPress':
          renderer?.emitButtonPress(x, y);
          audio.playButtonPress();
          break;
        case 'gearActivate':
          renderer?.emitGearRotate(x, y);
          audio.playGearActivate();
          break;
        case 'pulleyActivate':
          renderer?.emitPulleyMove(x, y);
          audio.playPulleyActivate();
          break;
        case 'weightDrop':
          renderer?.emitWeightDrop(x, y);
          audio.playWeightDrop();
          break;
        case 'platformMove':
          renderer?.emitPlatformMove(x, y);
          audio.playPlatformMove();
          break;
        case 'springActivate':
          renderer?.emitSpringRelease(x, y);
          audio.playSpringActivate();
          break;
        case 'ropeActivate':
          renderer?.emitRopeTension(x, y);
          audio.playRopeActivate();
          break;
        case 'doorOpen':
          renderer?.emitDoorOpen(x, y);
          audio.playDoorActivate();
          break;
        case 'mechanismClick':
          renderer?.emitMechanismClick(x, y);
          break;
      }
    }

    if (state.status === "won") {
      showWin();
      renderer?.emitVictory();
      audio.playVictory();
    } else if (state.status === "complete") {
      showComplete();
      renderer?.emitVictory();
      audio.playVictory();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.hint");
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 800);
}

function showComplete() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${game.getTotalLevels()}`;
    startBtn.textContent = i18n.t("game.start");
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    startBtn.onclick = () => {
      game.restart();
      startGame();
    };
  }, 800);
}

function startGame() {
  overlay.style.display = "none";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
  audio.playStart();
  renderer?.emitLevelStart();
}

startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  game.reset();
  audio.playReset();
});

nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
  audio.playNextLevel();
  renderer?.emitLevelStart();
});

// Init
initI18n();
initGame();
initWebGPU();
