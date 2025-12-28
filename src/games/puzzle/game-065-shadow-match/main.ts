/**
 * Shadow Match Main Entry
 * Noir / Shadow Art / Silhouette Theme
 * Game #065
 */
import { ShadowMatchGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const shadowZone = document.getElementById("shadow-zone") as HTMLElement;
const objectsZone = document.getElementById("objects-zone") as HTMLElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: ShadowMatchGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Noir / Mysterious Sounds
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

  // Mysterious chime
  private playChime(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Bell-like with reverb feel
    const harmonics = [1, 2, 3, 4, 6];
    const decays = [1, 0.5, 0.3, 0.2, 0.1];

    harmonics.forEach((h, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency * h, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * decays[i], now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * decays[i]);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Shadow whoosh
  private playWhoosh(direction: number = 1, volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const duration = 0.25;
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = direction > 0
        ? Math.sin(t * Math.PI)
        : Math.sin((1 - t) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = direction > 0 ? 400 : 600;
    filter.Q.value = 1;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  // Match reveal sound
  private playReveal(volume: number = 0.25) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Rising shimmer
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.2);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(600, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  // Wrong match thud
  private playThud(volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Pick up object
  playDragStart() {
    this.playWhoosh(1, 0.15);
    this.playChime(600, 0.2, 0.1);
  }

  // Correct match
  playMatch() {
    this.playReveal(0.25);
    this.playChime(880, 0.4, 0.2);
    setTimeout(() => {
      this.playChime(1100, 0.3, 0.15);
    }, 100);
  }

  // Wrong drop
  playWrongDrop() {
    this.playThud(0.15);
    this.playWhoosh(-1, 0.1);
  }

  // Victory fanfare
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const fanfare = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.12 },
      { freq: 783.99, time: 0.24 },
      { freq: 1046.50, time: 0.4 },
    ];

    fanfare.forEach(({ freq, time }) => {
      setTimeout(() => {
        this.playChime(freq, 0.5, 0.3);
      }, time * 1000);
    });

    // Final chord
    setTimeout(() => {
      [523.25, 659.25, 783.99, 1046.50].forEach(freq => {
        this.playChime(freq, 1.0, 0.2);
      });
    }, 600);
  }

  // Time warning
  playTimeWarning() {
    this.playChime(200, 0.3, 0.15);
  }

  // Game over
  playGameOver() {
    this.playChime(300, 0.5, 0.2);
    setTimeout(() => {
      this.playChime(200, 0.6, 0.2);
    }, 200);
  }

  // Start game
  playStart() {
    this.playChime(440, 0.4, 0.2);
    setTimeout(() => {
      this.playWhoosh(1, 0.15);
    }, 150);
  }

  // Reset
  playReset() {
    this.playWhoosh(-1, 0.15);
  }

  // Next level
  playNextLevel() {
    this.playChime(550, 0.3, 0.2);
    setTimeout(() => {
      this.playChime(750, 0.35, 0.2);
    }, 120);
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
  game = new ShadowMatchGame(shadowZone, objectsZone);

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    scoreDisplay.textContent = String(state.score);
    timeDisplay.textContent = String(state.time);

    // Handle events
    if (state.event === 'dragStart' && state.x !== undefined) {
      renderer?.emitDragStart(state.x, state.y);
      audio.playDragStart();
    }

    if (state.event === 'match' && state.x !== undefined) {
      renderer?.emitMatch(state.x, state.y);
      audio.playMatch();
    }

    if (state.event === 'wrongDrop' && state.x !== undefined) {
      renderer?.emitDropWrong(state.x, state.y);
      audio.playWrongDrop();
    }

    if (state.event === 'highlight' && state.x !== undefined) {
      renderer?.emitHighlight(state.x, state.y);
    }

    if (state.event === 'timerWarning') {
      renderer?.emitTimerWarning();
      audio.playTimeWarning();
    }

    if (state.status === "won") {
      showWin();
      renderer?.emitVictory();
      audio.playVictory();
    } else if (state.status === "failed") {
      showFail();
      audio.playGameOver();
    }
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${game.score}`;
    startBtn.textContent = i18n.t("game.nextLevel");

    startBtn.onclick = () => {
      game.nextLevel();
      overlay.style.display = "none";
      audio.playNextLevel();
      renderer?.emitLevelStart();
    };
  }, 500);
}

function showFail() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.timeUp");
    overlayMsg.textContent = `${i18n.t("game.score")}: ${game.score}`;
    startBtn.textContent = i18n.t("game.tryAgain");

    startBtn.onclick = () => {
      game.reset();
      overlay.style.display = "none";
      audio.playReset();
    };
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  audio.playStart();
  renderer?.emitLevelStart();
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
