/**
 * Scale Balance Main Entry
 * Game #118
 */
import { ScaleBalanceGame } from "./game";
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

// Audio System - Synthesized brass/physics sounds
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

  // Weight pickup - metallic ping
  playWeightPickup() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    [880, 1320, 1760].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, "sine", { attack: 0.005, decay: 0.05, sustain: 0.2 });
      }, i * 20);
    });
  }

  // Weight placed - brass thud
  playWeightPlaced(value: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const baseFreq = 120 - value * 15;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = baseFreq;
    osc2.type = "sine";
    osc2.frequency.value = baseFreq * 2;

    filter.type = "lowpass";
    filter.frequency.value = 300;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(filter);
    filter.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  // Drag trail - soft slide
  playDrag() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 200 + Math.random() * 100;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Scale balanced - harmonic chime
  playBalanced() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const freqs = [523, 659, 784]; // C-E-G chord

    freqs.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, "sine", { attack: 0.02, decay: 0.1, sustain: 0.4 });
      }, i * 60);
    });
  }

  // Scale tilting - off-balance wobble
  playTilt(direction: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    const baseFreq = direction > 0 ? 180 : 150;
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, this.ctx.currentTime + 0.15);

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Reset - scatter sound
  playReset() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "triangle";
        osc.frequency.value = 200 + Math.random() * 300;

        const now = this.ctx!.currentTime;
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + 0.1);
      }, i * 40);
    }
  }

  // Victory - triumphant fanfare
  playWin() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const melody = [
      { freq: 523, time: 0, dur: 0.15 },
      { freq: 659, time: 0.15, dur: 0.15 },
      { freq: 784, time: 0.3, dur: 0.15 },
      { freq: 1047, time: 0.45, dur: 0.4 },
    ];

    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.freq, note.dur, "sine", { attack: 0.02, decay: 0.05, sustain: 0.6 });
        this.playTone(note.freq * 2, note.dur * 0.8, "sine", { attack: 0.02, decay: 0.05, sustain: 0.3 });
      }, note.time * 1000);
    });
  }

  // Level start - scale activation
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    [392, 440, 494].forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", { attack: 0.02, decay: 0.08, sustain: 0.4 });
      }, i * 100);
    });
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const statusDisplay = document.getElementById("status-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: ScaleBalanceGame;
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
  game = new ScaleBalanceGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    // Weight pickup event
    if (state.weightPickup) {
      audio.playWeightPickup();
      renderer?.emitWeightPickup(state.weightPickup.x, state.weightPickup.y);
    }

    // Weight placed event
    if (state.weightPlaced) {
      audio.playWeightPlaced(state.weightPlaced.value);
      renderer?.emitWeightPlaced(
        state.weightPlaced.x,
        state.weightPlaced.y,
        state.weightPlaced.value
      );
    }

    // Drag trail event
    if (state.dragTrail) {
      renderer?.emitDragTrail(state.dragTrail.x, state.dragTrail.y);
    }

    // Scale balanced event
    if (state.scaleBalanced) {
      audio.playBalanced();
      renderer?.emitBalanced(state.scaleBalanced.pivotX, state.scaleBalanced.pivotY);
    }

    // Scale tilt event
    if (state.scaleTilt) {
      audio.playTilt(state.scaleTilt.direction);
      renderer?.emitTilt(
        state.scaleTilt.pivotX,
        state.scaleTilt.pivotY,
        state.scaleTilt.direction
      );
    }

    // Update status display
    if (state.balanced !== undefined) {
      statusDisplay.textContent = state.balanced
        ? i18n.t("game.balanced")
        : `${i18n.t("game.left")}: ${state.leftTorque} | ${i18n.t("game.right")}: ${state.rightTorque}`;
      statusDisplay.style.color = state.balanced ? "#2ecc71" : "#e74c3c";
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
}

function showWin() {
  audio.playWin();
  renderer?.emitVictory();

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

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
  statusDisplay.textContent = "---";
  statusDisplay.style.color = "#f39c12";

  audio.playLevelStart();
  renderer?.emitLevelStart();
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  statusDisplay.textContent = "---";
  statusDisplay.style.color = "#f39c12";

  audio.playLevelStart();
  renderer?.emitLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  statusDisplay.textContent = "---";
  statusDisplay.style.color = "#f39c12";

  audio.playReset();
  renderer?.emitReset();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
