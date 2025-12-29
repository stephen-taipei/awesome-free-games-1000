/**
 * Layer Stack Main Entry
 * Game #090 - WebGPU Enhanced
 * Holographic / Translucent / Layered Theme
 */
import { LayerStackGame, GameState } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

// Audio System with holographic/layered sounds
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

  private playChord(frequencies: number[], duration: number, volume: number = 0.15): void {
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, duration, "sine", volume);
      }, i * 15);
    });
  }

  // Layer move - holographic shift sound
  playLayerMove(layerIndex: number = 0): void {
    const baseFreqs = [330, 392, 440, 494, 523, 587]; // E4, G4, A4, B4, C5, D5
    const freq = baseFreqs[layerIndex % baseFreqs.length];
    this.playTone(freq, 0.15, "sine", 0.2, 0.02, 0.08);
    this.playTone(freq * 1.5, 0.1, "triangle", 0.1, 0.01, 0.06);
  }

  // Correct placement - glass chime
  playCorrect(layerIndex: number = 0): void {
    const baseFreq = 523 + layerIndex * 50;
    this.playTone(baseFreq, 0.2, "sine", 0.25);
    setTimeout(() => {
      this.playTone(baseFreq * 1.25, 0.15, "sine", 0.15);
    }, 80);
  }

  // Victory - holographic celebration
  playVictory(): void {
    const celebrationFreqs = [523, 659, 784, 880, 1047];
    celebrationFreqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "sine", 0.2);
        this.playTone(freq * 0.5, 0.2, "triangle", 0.1);
      }, i * 100);
    });
    setTimeout(() => {
      this.playChord([523, 659, 784, 1047], 0.6, 0.15);
    }, 550);
  }

  // Level start - layers appearing
  playLevelStart(): void {
    const appearFreqs = [262, 330, 392, 440, 523];
    appearFreqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", 0.18);
      }, i * 80);
    });
  }

  // Reset - shuffle sound
  playReset(): void {
    [440, 392, 349, 330, 294].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.1, "triangle", 0.15);
      }, i * 50);
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
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const layerContainer = document.getElementById("layer-container") as HTMLElement;
const targetLayers = document.getElementById("target-layers") as HTMLElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: LayerStackGame;
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
  renderer.resize(Math.floor(rect.width), Math.floor(rect.height));
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

function getLayerScreenPosition(layerIndex: number): { x: number; y: number } {
  const layers = layerContainer.querySelectorAll(".layer");
  if (layers[layerIndex]) {
    const rect = (layers[layerIndex] as HTMLElement).getBoundingClientRect();
    const containerRect = gameArea.getBoundingClientRect();
    return {
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top + rect.height / 2,
    };
  }
  return { x: gameArea.clientWidth / 2, y: gameArea.clientHeight / 2 };
}

function initGame() {
  game = new LayerStackGame(layerContainer, targetLayers);

  game.setOnStateChange((state: GameState) => {
    if (state.moves !== undefined) {
      movesDisplay.textContent = state.moves.toString();
    }

    if (!state.event) {
      if (state.status === "won") {
        showWin();
      }
      return;
    }

    const pos = state.layerIndex !== undefined
      ? getLayerScreenPosition(state.layerIndex)
      : { x: gameArea.clientWidth / 2, y: gameArea.clientHeight / 2 };

    switch (state.event) {
      case "layerMove":
        audio.playLayerMove(state.layerIndex ?? 0);
        renderer?.emitLayerMove(pos.x, pos.y, state.layerIndex);
        break;
      case "correct":
        audio.playCorrect(state.layerIndex ?? 0);
        renderer?.emitCorrect(pos.x, pos.y, state.layerIndex);
        break;
      case "victory":
        audio.playVictory();
        renderer?.emitVictory();
        showWin();
        break;
      case "levelStart":
        audio.playLevelStart();
        renderer?.emitLevelStart(pos.x, pos.y);
        break;
      case "reset":
        audio.playReset();
        renderer?.emitReset();
        break;
    }
  });

  window.addEventListener("resize", resizeWebGPU);
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${game.getMoves()}`;

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
  movesDisplay.textContent = "0";
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  movesDisplay.textContent = "0";
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
