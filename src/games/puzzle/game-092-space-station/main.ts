/**
 * Space Station Main Entry
 * Game #092 - WebGPU Enhanced
 * Space Station / Nebula / Cosmic Theme
 */
import { SpaceStationGame, GameState } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

// Audio System with space station sounds
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

  private playChord(frequencies: number[], duration: number, stagger: number = 0): void {
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, duration, "sine", 0.15);
      }, i * stagger);
    });
  }

  // Module rotation - mechanical servo sound
  playRotation(): void {
    this.playTone(220, 0.15, "sawtooth", 0.1);
    setTimeout(() => {
      this.playTone(330, 0.1, "square", 0.08);
    }, 50);
    this.playTone(150, 0.2, "triangle", 0.1);
  }

  // Successful dock - connection confirmation
  playDock(): void {
    this.playChord([523, 659, 784], 0.3, 30);
    setTimeout(() => {
      this.playTone(1047, 0.2, "sine", 0.2);
    }, 150);
  }

  // Undock/misalign - warning tone
  playUndock(): void {
    this.playTone(220, 0.1, "square", 0.12);
    setTimeout(() => {
      this.playTone(165, 0.15, "square", 0.1);
    }, 80);
  }

  // Victory - space station fully assembled
  playVictory(): void {
    const victoryFreqs = [392, 494, 587, 784, 988];
    victoryFreqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, "sine", 0.18);
      }, i * 100);
    });
    setTimeout(() => {
      this.playChord([523, 659, 784, 1047], 0.5, 20);
    }, 600);
  }

  // Level start - station powering up
  playLevelStart(): void {
    [196, 262, 330, 392].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", 0.15);
      }, i * 80);
    });
    // Power-up hum
    this.playTone(110, 0.5, "triangle", 0.08);
  }

  // Reset - systems recalibrating
  playReset(): void {
    [392, 294, 220].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.1, "triangle", 0.12);
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
const dockedDisplay = document.getElementById("docked-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: SpaceStationGame;
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
  game = new SpaceStationGame(canvas);
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
    if (state.docked !== undefined) {
      dockedDisplay.textContent = state.docked;
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
        if (state.moduleX !== undefined && state.moduleY !== undefined) {
          renderer?.emitRotation(state.moduleX, state.moduleY, state.moduleSize);
        }
        break;
      case "dock":
        audio.playDock();
        if (state.moduleX !== undefined && state.moduleY !== undefined &&
            state.stationX !== undefined && state.stationY !== undefined) {
          renderer?.emitDocking(state.moduleX, state.moduleY, state.stationX, state.stationY);
        }
        break;
      case "undock":
        audio.playUndock();
        if (state.moduleX !== undefined && state.moduleY !== undefined) {
          renderer?.emitUndock(state.moduleX, state.moduleY);
        }
        break;
      case "victory":
        audio.playVictory();
        renderer?.emitVictory();
        showWin();
        break;
      case "levelStart":
        audio.playLevelStart();
        if (state.stationX !== undefined && state.stationY !== undefined) {
          renderer?.emitLevelStart(state.stationX, state.stationY);
        }
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
    overlayMsg.textContent = `${i18n.t("game.level")} ${game.getLevel()}`;

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
