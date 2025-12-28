/**
 * Chain Puzzle Main Entry
 * Game #093 - WebGPU Enhanced
 * Chain / Metal / Industrial Theme
 */
import { ChainPuzzleGame, GameState } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

// Audio System with metal/chain sounds
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

  private playNoise(duration: number, volume: number = 0.1): void {
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noise.start();
    noise.stop(this.audioContext.currentTime + duration);
  }

  // Chain link rotation - metallic clank
  playRotation(): void {
    // Metal clank
    this.playTone(180, 0.08, "square", 0.15);
    this.playTone(120, 0.1, "sawtooth", 0.1);
    // Metal scrape
    this.playNoise(0.08, 0.05);
    setTimeout(() => {
      this.playTone(220, 0.06, "triangle", 0.1);
    }, 40);
  }

  // Unlock success - chain breaking free
  playUnlock(): void {
    // Release sound
    this.playTone(440, 0.15, "sine", 0.2);
    this.playTone(554, 0.12, "sine", 0.15);
    setTimeout(() => {
      this.playTone(659, 0.2, "sine", 0.2);
    }, 80);
    // Chain rattle
    this.playNoise(0.1, 0.08);
  }

  // Still locked - resistance sound
  playLocked(): void {
    this.playTone(150, 0.1, "square", 0.12);
    this.playTone(130, 0.08, "sawtooth", 0.08);
  }

  // Victory - all chains broken
  playVictory(): void {
    // Triumphant chain breaking
    [392, 494, 587, 659, 784].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "sine", 0.18);
      }, i * 80);
    });

    setTimeout(() => {
      // Final chord
      [523, 659, 784].forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.4, "sine", 0.15);
        }, i * 20);
      });
      // Chain rattle finale
      this.playNoise(0.15, 0.1);
    }, 450);
  }

  // Level start - chains assembling
  playLevelStart(): void {
    [220, 262, 330, 392].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, "triangle", 0.12);
        this.playNoise(0.03, 0.03);
      }, i * 70);
    });
  }

  // Reset - chains resetting
  playReset(): void {
    [330, 262, 196].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.1, "square", 0.1);
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
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
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

let game: ChainPuzzleGame;
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
  game = new ChainPuzzleGame(canvas);
  game.resize();

  // Click handler
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    game.handleClick(
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY
    );
  });

  // Touch handler
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    game.handleClick(
      (touch.clientX - rect.left) * scaleX,
      (touch.clientY - rect.top) * scaleY
    );
  });

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

    switch (state.event) {
      case "rotate":
        audio.playRotation();
        if (state.linkX !== undefined && state.linkY !== undefined) {
          renderer?.emitRotation(state.linkX, state.linkY, state.linkRotation ?? 0);
        }
        break;
      case "unlock":
        audio.playUnlock();
        if (state.linkX !== undefined && state.linkY !== undefined) {
          renderer?.emitUnlock(state.linkX, state.linkY);
        }
        break;
      case "locked":
        audio.playLocked();
        if (state.linkX !== undefined && state.linkY !== undefined) {
          renderer?.emitLocked(state.linkX, state.linkY);
        }
        break;
      case "victory":
        audio.playVictory();
        renderer?.emitVictory();
        showWin();
        break;
      case "levelStart":
        audio.playLevelStart();
        renderer?.emitLevelStart(canvas.width / 2, canvas.height / 2);
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
