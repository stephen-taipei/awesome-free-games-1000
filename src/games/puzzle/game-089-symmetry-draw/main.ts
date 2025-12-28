/**
 * Symmetry Draw Main Entry
 * Game #089 - WebGPU Enhanced
 * Kaleidoscope / Rainbow / Prismatic Theme
 */
import { SymmetryDrawGame, SymmetryMode, GameState } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

// Audio System with prismatic/rainbow sounds
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
      }, i * 20);
    });
  }

  // Drawing sound - prismatic harmonics based on color
  playDraw(colorIndex: number = 0): void {
    const baseFreqs = [523, 587, 659, 698, 784, 880]; // C5, D5, E5, F5, G5, A5
    const freq = baseFreqs[colorIndex % baseFreqs.length];
    this.playTone(freq, 0.08, "sine", 0.15, 0.01, 0.04);
  }

  // Start drawing - rainbow shimmer
  playDrawStart(): void {
    this.playChord([392, 523, 659], 0.3, 0.12); // G4, C5, E5
  }

  // End drawing - soft release
  playDrawEnd(): void {
    this.playTone(392, 0.2, "sine", 0.1, 0.01, 0.15);
    setTimeout(() => {
      this.playTone(523, 0.15, "sine", 0.08);
    }, 50);
  }

  // Mode change - prismatic shift
  playModeChange(modeIndex: number): void {
    const modeFreqs = [
      [392, 494, 587], // Vertical
      [440, 523, 659], // Horizontal
      [349, 440, 523, 659], // Quad
      [392, 494, 587, 740, 880], // Radial
    ];
    const freqs = modeFreqs[modeIndex % modeFreqs.length];
    freqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, "triangle", 0.2);
      }, i * 60);
    });
  }

  // Clear canvas - descending shimmer
  playClear(): void {
    [880, 784, 698, 587, 523, 440].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.1, "sine", 0.15);
      }, i * 40);
    });
  }

  // Save artwork - celebration
  playSave(): void {
    const celebrationFreqs = [523, 659, 784, 1047];
    celebrationFreqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", 0.2);
      }, i * 80);
    });
    setTimeout(() => {
      this.playChord([523, 659, 784, 1047], 0.5, 0.15);
    }, 350);
  }

  // Level/session start - kaleidoscope opening
  playLevelStart(): void {
    const openingFreqs = [262, 330, 392, 523, 659, 784];
    openingFreqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "sine", 0.18);
      }, i * 70);
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
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const modeDisplay = document.getElementById("mode-display")!;

const overlay = document.getElementById("game-overlay")!;
const startBtn = document.getElementById("start-btn")!;
const modeBtn = document.getElementById("mode-btn")!;
const clearBtn = document.getElementById("clear-btn")!;
const saveBtn = document.getElementById("save-btn")!;
const brushSizeInput = document.getElementById("brush-size") as HTMLInputElement;

const colorButtons = document.querySelectorAll(".color-btn");

let game: SymmetryDrawGame;
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
  if (!renderer || !webgpuCanvas) return;
  const container = webgpuCanvas.parentElement;
  if (container) {
    const rect = container.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));
    renderer.resize(size, size);
  }
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
    updateModeDisplay();
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function updateModeDisplay() {
  const mode = game.getMode();
  const modeNames: Record<SymmetryMode, string> = {
    vertical: i18n.t("game.vertical"),
    horizontal: i18n.t("game.horizontal"),
    quad: i18n.t("game.quad"),
    radial: i18n.t("game.radial"),
  };
  modeDisplay.textContent = modeNames[mode];
}

function getModeIndex(mode: SymmetryMode): number {
  const modes: SymmetryMode[] = ["vertical", "horizontal", "quad", "radial"];
  return modes.indexOf(mode);
}

function initGame() {
  game = new SymmetryDrawGame(canvas);
  game.resize();

  // Mouse inputs
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleInput("down", e.clientX - rect.left, e.clientY - rect.top);
  });

  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleInput("move", e.clientX - rect.left, e.clientY - rect.top);
  });

  window.addEventListener("mouseup", () => {
    game.handleInput("up", 0, 0);
  });

  // Touch inputs
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      game.handleInput("down", touch.clientX - rect.left, touch.clientY - rect.top);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      game.handleInput("move", touch.clientX - rect.left, touch.clientY - rect.top);
    },
    { passive: false }
  );

  window.addEventListener("touchend", () => {
    game.handleInput("up", 0, 0);
  });

  // State change handler with WebGPU + Audio integration
  game.setOnStateChange((state: GameState) => {
    if (state.mode !== undefined) {
      updateModeDisplay();
    }

    if (!state.event) return;

    const x = state.x ?? canvas.width / 2;
    const y = state.y ?? canvas.height / 2;

    switch (state.event) {
      case "draw":
        audio.playDraw(state.colorIndex ?? 0);
        renderer?.emitDraw(x, y, state.colorIndex);
        break;
      case "drawStart":
        audio.playDrawStart();
        renderer?.emitStart(x, y);
        break;
      case "drawEnd":
        audio.playDrawEnd();
        renderer?.emitEnd(x, y);
        break;
      case "modeChange":
        audio.playModeChange(getModeIndex(state.mode!));
        renderer?.emitModeChange(x, y);
        break;
      case "clear":
        audio.playClear();
        renderer?.emitClear();
        break;
      case "save":
        audio.playSave();
        renderer?.emitSave();
        break;
      case "levelStart":
        audio.playLevelStart();
        renderer?.emitLevelStart(x, y);
        break;
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    resizeWebGPU();
  });

  // Color buttons with index tracking
  colorButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      colorButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const color = (btn as HTMLElement).dataset.color;
      if (color) game.setColor(color, index);
    });
  });

  // Brush size
  brushSizeInput.addEventListener("input", () => {
    game.setBrushSize(parseInt(brushSizeInput.value));
  });
}

async function startGame() {
  await audio.init();
  overlay.style.display = "none";
  game.start();
  updateModeDisplay();
}

startBtn.addEventListener("click", startGame);

modeBtn.addEventListener("click", () => {
  game.nextMode();
});

clearBtn.addEventListener("click", () => {
  game.clear();
});

saveBtn.addEventListener("click", () => {
  game.save();
});

// Init
initI18n();
initGame();
initWebGPU();
