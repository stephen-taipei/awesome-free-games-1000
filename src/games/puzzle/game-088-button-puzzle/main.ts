/**
 * Button Puzzle Main Entry
 * Game #088 - WebGPU Enhanced
 */
import { ButtonPuzzleGame } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

// Audio System with Arcade Theme
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn("Audio init failed:", e);
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = "sine", attack = 0.01, decay = 0.1): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + decay);
  }

  playButtonFlash(buttonIndex: number): void {
    // Each button has a unique arcade tone
    const notes = [262, 294, 330, 370, 415, 466, 523, 587, 659];
    const freq = notes[buttonIndex % notes.length];
    this.playTone(freq, 0.3, "square", 0.01, 0.15);
    this.playTone(freq * 2, 0.2, "sine", 0.02, 0.1);
  }

  playSequenceShow(buttonIndex: number): void {
    // Softer tone for showing sequence
    const notes = [262, 294, 330, 370, 415, 466, 523, 587, 659];
    const freq = notes[buttonIndex % notes.length];
    this.playTone(freq, 0.4, "sine", 0.02, 0.2);
  }

  playCorrect(): void {
    // Arcade positive feedback
    this.playTone(523, 0.1, "square", 0.01, 0.05);
    setTimeout(() => this.playTone(659, 0.15, "sine", 0.01, 0.1), 80);
  }

  playWrong(): void {
    // Arcade buzzer
    this.playTone(110, 0.3, "sawtooth", 0.01, 0.15);
    this.playTone(100, 0.25, "square", 0.02, 0.15);
    setTimeout(() => this.playTone(90, 0.3, "sawtooth", 0.01, 0.15), 150);
  }

  playVictory(): void {
    // Arcade victory fanfare
    const melody = [
      { freq: 523, delay: 0 },    // C5
      { freq: 587, delay: 80 },   // D5
      { freq: 659, delay: 160 },  // E5
      { freq: 784, delay: 240 },  // G5
      { freq: 880, delay: 360 },  // A5
      { freq: 1047, delay: 480 }, // C6
    ];
    melody.forEach(({ freq, delay }) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "square", 0.01, 0.15);
        this.playTone(freq * 0.5, 0.2, "sine", 0.02, 0.1);
      }, delay);
    });
  }

  playLevelStart(): void {
    // Arcade startup jingle
    this.playTone(330, 0.15, "square", 0.01, 0.1);
    setTimeout(() => this.playTone(440, 0.15, "square", 0.01, 0.1), 100);
    setTimeout(() => this.playTone(523, 0.2, "sine", 0.02, 0.15), 200);
  }

  playReset(): void {
    // Reset swoosh
    this.playTone(440, 0.1, "triangle", 0.01, 0.05);
    setTimeout(() => this.playTone(330, 0.1, "triangle", 0.01, 0.05), 60);
    setTimeout(() => this.playTone(262, 0.15, "triangle", 0.01, 0.1), 120);
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
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const gridContainer = document.getElementById("button-grid") as HTMLElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const sequenceDisplay = document.getElementById("sequence-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: ButtonPuzzleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

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

async function initWebGPU() {
  if (!webgpuCanvas) return;
  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();
  if (!success) {
    console.warn("WebGPU not available, using fallback");
    renderer = null;
  }
}

function initGame() {
  game = new ButtonPuzzleGame(gridContainer);

  game.setOnStateChange((state: any) => {
    // Handle events for WebGPU and Audio
    if (state.event) {
      const { event, x, y, buttonIndex, colorIndex } = state;
      switch (event) {
        case "buttonFlash":
          audio.playButtonFlash(buttonIndex);
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitButtonFlash(x, y, colorIndex);
          }
          break;
        case "sequenceShow":
          audio.playSequenceShow(buttonIndex);
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitSequenceShow(x, y, colorIndex);
          }
          break;
        case "correct":
          audio.playCorrect();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitCorrect(x, y, colorIndex);
          }
          break;
        case "wrong":
          audio.playWrong();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitWrong(x, y);
          }
          break;
        case "victory":
          audio.playVictory();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitVictory(x, y);
          }
          break;
        case "levelStart":
          audio.playLevelStart();
          if (renderer && x !== undefined && y !== undefined) {
            renderer.emitLevelStart(x, y);
          }
          break;
        case "reset":
          audio.playReset();
          if (renderer) {
            renderer.emitReset();
          }
          break;
      }
    }

    if (state.sequence !== undefined) {
      sequenceDisplay.textContent = state.sequence;
    }

    if (state.status === "showing") {
      // Show watching message
    } else if (state.status === "playing") {
      // Show your turn message
    } else if (state.status === "wrong") {
      // Show wrong message briefly
    } else if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => {
    if (renderer && webgpuCanvas) {
      const rect = webgpuCanvas.parentElement?.getBoundingClientRect();
      if (rect) {
        renderer.resize(rect.width, rect.height);
      }
    }
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.level")} ${game.getLevel()} ${i18n.t("game.complete") ? "" : ""}`;

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

async function nextLevel() {
  await audio.init();
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", async () => {
  await audio.init();
  game.reset();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
