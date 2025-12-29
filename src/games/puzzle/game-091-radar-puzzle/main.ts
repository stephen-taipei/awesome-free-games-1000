/**
 * Radar Puzzle Main Entry
 * Game #091 - WebGPU Enhanced
 * Radar / Sonar / Military Theme
 */
import { RadarPuzzleGame, GameState } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

// Audio System with radar/sonar sounds
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
      this.initialized = true;
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.3,
    attack: number = 0.02,
    release: number = 0.1
  ): void {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private playPing(baseFreq: number, count: number = 1): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playTone(baseFreq, 0.15, "sine", 0.25, 0.01, 0.1);
        this.playTone(baseFreq * 1.5, 0.1, "sine", 0.1, 0.01, 0.08);
      }, i * 80);
    }
  }

  // Radar sweep sound - subtle whoosh
  playSweep(): void {
    this.playTone(150, 0.3, "sine", 0.08, 0.1, 0.15);
  }

  // Target visible - sonar ping
  playTargetVisible(): void {
    this.playPing(880, 1);
  }

  // Target found - confirmation ping
  playTargetFound(): void {
    this.playPing(1047, 2);
    setTimeout(() => {
      this.playTone(1319, 0.2, "sine", 0.2);
    }, 150);
  }

  // Miss click
  playMiss(): void {
    this.playTone(220, 0.15, "triangle", 0.15);
  }

  // Victory - sonar celebration
  playVictory(): void {
    const celebrationFreqs = [523, 659, 784, 1047, 1319];
    celebrationFreqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", 0.2);
      }, i * 100);
    });
    setTimeout(() => {
      [523, 784, 1047].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 0.4, "sine", 0.15), i * 20);
      });
    }, 550);
  }

  // Level start - radar online
  playLevelStart(): void {
    [262, 330, 392, 523].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", 0.18);
      }, i * 100);
    });
  }

  // Reset - radar recalibrating
  playReset(): void {
    [440, 330, 262].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.12, "triangle", 0.15);
      }, i * 60);
    });
  }
}

const i18n = {
  locale: "en" as Locale,
  translations: {} as Record<string, Record<string, string>>,

  loadTranslations(locale: Locale, trans: Record<string, string>) {
    this.translations[locale] = trans;
  },

  setLocale(locale: Locale) {
    this.locale = locale;
  },

  getLocale(): Locale {
    return this.locale;
  },

  t(key: string): string {
    return this.translations[this.locale]?.[key] || key;
  },
};

// Elements
const gameArea = document.querySelector(".game-area") as HTMLElement;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const foundDisplay = document.getElementById("found-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: RadarPuzzleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU(): Promise<void> {
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (!success) {
    console.warn("WebGPU not available, using fallback");
    webgpuCanvas.style.display = "none";
  } else {
    resizeWebGPU();
  }
}

function resizeWebGPU(): void {
  if (!renderer || !webgpuCanvas || !gameArea) return;
  const rect = gameArea.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width, rect.height));
  renderer.resize(size, size);
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
  game = new RadarPuzzleGame(canvas);
  game.resize();

  // Click handler
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleClick(e.clientX - rect.left, e.clientY - rect.top);
  });

  // Touch handler
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    game.handleClick(touch.clientX - rect.left, touch.clientY - rect.top);
  });

  game.setOnStateChange((state: GameState) => {
    if (state.found !== undefined) {
      foundDisplay.textContent = state.found;
    }
    if (state.time !== undefined) {
      timeDisplay.textContent = state.time;
    }

    if (!state.event) {
      if (state.status === "won") {
        showWin();
      }
      return;
    }

    const x = state.x ?? canvas.width / 2;
    const y = state.y ?? canvas.height / 2;

    switch (state.event) {
      case "sweep":
        audio.playSweep();
        renderer?.emitSweep(x, y);
        break;
      case "targetVisible":
        audio.playTargetVisible();
        renderer?.emitTargetVisible(x, y);
        break;
      case "targetFound":
        audio.playTargetFound();
        renderer?.emitTargetFound(x, y);
        break;
      case "miss":
        audio.playMiss();
        renderer?.emitMiss(x, y);
        break;
      case "victory":
        audio.playVictory();
        renderer?.emitVictory();
        showWin();
        break;
      case "levelStart":
        audio.playLevelStart();
        renderer?.emitLevelStart(x, y);
        break;
      case "reset":
        audio.playReset();
        renderer?.emitReset();
        break;
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    resizeWebGPU();
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.time")}: ${Math.floor(game.getElapsedTime() / 1000)}s`;

    if (game.hasMoreLevels()) {
      nextBtn.style.display = "inline-block";
      startBtn.textContent = i18n.t("game.reset");
    } else {
      nextBtn.style.display = "none";
      overlayTitle.textContent = i18n.t("game.complete");
      startBtn.textContent = i18n.t("game.start");
    }
  }, 500);
}

async function startGame() {
  await audio.init();
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
