/**
 * Room Escape Main Entry
 * Mystery Escape Room / Detective Noir Theme
 * Game #060
 */
import { RoomEscapeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const roomView = document.getElementById("room-view") as HTMLElement;
const inventoryEl = document.getElementById("inventory") as HTMLElement;
const messageBox = document.getElementById("message-box") as HTMLElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const roomDisplay = document.getElementById("room-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: RoomEscapeGame;
let renderer: WebGPURenderer | null = null;
let messageTimeout: number;

// Audio System - Mystery/Noir Synthesized Sounds
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

  // Suspenseful mystery tone
  private playMysteryTone(frequency: number, duration: number, volume: number = 0.3) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.95, now + duration);

    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Click/interaction sound
  private playClick(frequency: number, volume: number = 0.25) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + 0.08);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Metallic clunk for locks/doors
  private playMetallic(frequency: number, duration: number, volume: number = 0.35) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Metal resonance
    const harmonics = [1, 2.4, 4.5, 6.2];
    const decays = [1, 0.6, 0.4, 0.2];

    harmonics.forEach((h, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.value = frequency * h;

      filter.type = 'bandpass';
      filter.frequency.value = frequency * h;
      filter.Q.value = 15;

      gain.gain.setValueAtTime(volume * decays[i], now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * decays[i]);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Discovery chime
  private playDiscovery(baseFreq: number, duration: number, volume: number = 0.3) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const notes = [1, 1.25, 1.5]; // Major chord

    notes.forEach((mult, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = baseFreq * mult;

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(volume / (i + 1), now + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + i * 0.08);
      osc.stop(now + duration);
    });
  }

  // Object click
  playObjectClick() {
    this.playClick(800, 0.2);
    this.playMysteryTone(200, 0.15, 0.1);
  }

  // Item discovered
  playDiscover() {
    this.playDiscovery(523.25, 0.8, 0.35); // C5
  }

  // Item picked up
  playPickup() {
    this.playClick(1200, 0.25);
    setTimeout(() => {
      this.playMysteryTone(880, 0.3, 0.2);
    }, 50);
  }

  // Lock/safe opened
  playUnlock() {
    this.playMetallic(220, 0.4, 0.35);
    setTimeout(() => {
      this.playDiscovery(440, 0.6, 0.3);
    }, 200);
  }

  // Wrong code
  playError() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Door open
  playDoorOpen() {
    // Creak sound
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Low rumble
    const noise = this.audioContext.createOscillator();
    const noiseGain = this.audioContext.createGain();
    const noiseFilter = this.audioContext.createBiquadFilter();

    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(80, now);
    noise.frequency.linearRampToValueAtTime(120, now + 0.5);

    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 300;

    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.5);

    // Handle click
    this.playMetallic(350, 0.2, 0.25);
  }

  // Door closed/locked
  playDoorLocked() {
    this.playMetallic(180, 0.25, 0.3);
    this.playClick(400, 0.15);
  }

  // Use key
  playUseKey() {
    this.playMetallic(500, 0.3, 0.25);
    setTimeout(() => {
      this.playClick(800, 0.2);
    }, 150);
  }

  // Victory/escape
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    // Triumphant fanfare
    const fanfare = [
      { freq: 392.00, time: 0 },      // G4
      { freq: 493.88, time: 0.15 },   // B4
      { freq: 587.33, time: 0.3 },    // D5
      { freq: 783.99, time: 0.45 },   // G5
      { freq: 987.77, time: 0.6 },    // B5
      { freq: 1174.66, time: 0.75 },  // D6
    ];

    fanfare.forEach(({ freq, time }) => {
      setTimeout(() => {
        this.playDiscovery(freq, 1.0, 0.3);
      }, time * 1000);
    });

    // Door opening sound
    setTimeout(() => {
      this.playDoorOpen();
    }, 600);
  }

  // Game start
  playStart() {
    this.playMysteryTone(220, 0.8, 0.2);
    setTimeout(() => {
      this.playMysteryTone(165, 0.6, 0.15);
    }, 200);
  }

  // Reset
  playReset() {
    this.playClick(300, 0.2);
    this.playMysteryTone(150, 0.4, 0.15);
  }

  // Next room
  playNextRoom() {
    this.playDoorOpen();
    setTimeout(() => {
      this.playMysteryTone(330, 0.6, 0.25);
    }, 300);
  }

  // Ambient hint sound
  playHint() {
    this.playMysteryTone(440, 0.5, 0.15);
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
  game = new RoomEscapeGame(roomView, inventoryEl, messageBox);

  game.setOnStateChange((state: any) => {
    roomDisplay.textContent = String(state.level);

    // Handle events
    if (state.event === 'click' && state.x !== undefined) {
      renderer?.emitClick(state.x, state.y);
      audio.playObjectClick();
    }

    if (state.event === 'discover' && state.x !== undefined) {
      renderer?.emitDiscover(state.x, state.y);
      audio.playDiscover();
    }

    if (state.event === 'pickup' && state.x !== undefined) {
      renderer?.emitPickup(state.x, state.y);
      audio.playPickup();
    }

    if (state.event === 'unlock' && state.x !== undefined) {
      renderer?.emitUnlock(state.x, state.y);
      audio.playUnlock();
    }

    if (state.event === 'doorOpen' && state.x !== undefined) {
      renderer?.emitDoorOpen(state.x, state.y);
      audio.playDoorOpen();
    }

    if (state.event === 'useKey' && state.x !== undefined) {
      renderer?.emitUseItem(state.x, state.y);
      audio.playUseKey();
    }

    if (state.event === 'locked') {
      audio.playDoorLocked();
    }

    if (state.event === 'error' && state.x !== undefined) {
      renderer?.emitError(state.x, state.y);
      audio.playError();
    }

    if (state.event === 'mystery' && state.x !== undefined) {
      renderer?.emitMystery(state.x, state.y);
      audio.playHint();
    }

    if (state.status === "won") {
      showWin();
      renderer?.emitVictory();
      audio.playVictory();
    }
  });

  game.setOnMessage((key: string) => {
    showMessage(i18n.t(key));
  });
}

function showMessage(text: string) {
  messageBox.textContent = text;
  messageBox.classList.add("show");

  clearTimeout(messageTimeout);
  messageTimeout = window.setTimeout(() => {
    messageBox.classList.remove("show");
  }, 2500);
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.room")} ${game.level}`;
    startBtn.textContent = i18n.t("game.nextRoom");

    startBtn.onclick = () => {
      game.nextLevel();
      overlay.style.display = "none";
      audio.playNextRoom();
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
