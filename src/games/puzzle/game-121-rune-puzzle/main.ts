/**
 * Rune Puzzle Main Entry
 * Game #121
 */
import { RunePuzzleGame } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

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

// Audio System - Synthesized mystical sounds
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    envelope?: { attack?: number; decay?: number; sustain?: number }
  ) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    const now = this.ctx.currentTime;
    const { attack = 0.01, decay = 0.1, sustain = 0.3 } = envelope || {};

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Rune rotation - mystical whoosh
  playRuneRotate() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Mystical sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);

    filter.type = "bandpass";
    filter.frequency.value = 500;
    filter.Q.value = 2;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);

    // Magic sparkle
    setTimeout(() => {
      this.playTone(800, 0.08, "sine", { attack: 0.01, decay: 0.03, sustain: 0.2 });
    }, 100);
  }

  // Rune aligned - magical chime
  playRuneAligned() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "sine", { attack: 0.02, decay: 0.08, sustain: 0.5 });
      }, i * 60);
    });
  }

  // Reset - energy dispersal
  playReset() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    [500, 400, 300, 200].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.1, "triangle", { attack: 0.01, decay: 0.04, sustain: 0.15 });
      }, i * 40);
    });
  }

  // Victory - epic magical victory
  playWin() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const melody = [
      { freq: 392, time: 0, dur: 0.2 },
      { freq: 494, time: 0.15, dur: 0.2 },
      { freq: 587, time: 0.3, dur: 0.2 },
      { freq: 784, time: 0.45, dur: 0.4 },
      { freq: 988, time: 0.7, dur: 0.6 },
    ];

    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.freq, note.dur, "sine", { attack: 0.02, decay: 0.1, sustain: 0.6 });
        this.playTone(note.freq * 1.5, note.dur * 0.6, "sine", { attack: 0.02, decay: 0.1, sustain: 0.25 });
      }, note.time * 1000);
    });

    // Ethereal pad
    setTimeout(() => {
      [392, 494, 587, 784].forEach((freq) => {
        this.playTone(freq, 1.5, "sine", { attack: 0.1, decay: 0.3, sustain: 0.3 });
      });
    }, 800);
  }

  // Level start - mystical awakening
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Deep resonance
    this.playTone(110, 0.5, "sine", { attack: 0.1, decay: 0.2, sustain: 0.3 });

    // Rising melody
    setTimeout(() => {
      [262, 330, 392, 494].forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.15, "sine", { attack: 0.02, decay: 0.06, sustain: 0.35 });
        }, i * 80);
      });
    }, 200);
  }
}

// Elements
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

let game: RunePuzzleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (!success) {
    console.log("WebGPU not available, continuing without effects");
    renderer = null;
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
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new RunePuzzleGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) {
      movesDisplay.textContent = state.moves.toString();
    }

    // Rune rotation event
    if (state.runeRotate) {
      audio.playRuneRotate();
      renderer?.emitRuneRotate(
        state.runeRotate.x,
        state.runeRotate.y,
        state.runeRotate.color
      );
    }

    // Rune aligned event
    if (state.runeAligned) {
      audio.playRuneAligned();
      renderer?.emitRuneAligned(state.runeAligned.x, state.runeAligned.y);
    }

    // All runes aligned
    if (state.allAligned !== undefined) {
      renderer?.setRunesAligned(state.allAligned);
    }

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      const rect = webgpuCanvas.parentElement?.getBoundingClientRect();
      if (rect) {
        renderer.resize(rect.width, rect.height);
      }
    }
  });

  // Ambient particle loop
  setInterval(() => {
    renderer?.emitAmbient();
  }, 120);
}

function showWin() {
  audio.playWin();
  renderer?.emitVictory();

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

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";

  audio.playLevelStart();
  renderer?.emitLevelStart();
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";

  audio.playLevelStart();
  renderer?.emitLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  movesDisplay.textContent = "0";

  audio.playReset();
  renderer?.emitReset();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
