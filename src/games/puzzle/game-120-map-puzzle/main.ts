/**
 * Map Puzzle Main Entry
 * Game #120
 */
import { MapPuzzleGame } from "./game";
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

// Audio System - Synthesized cartography sounds
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

  // Piece picked up - parchment rustle
  playPiecePickup() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Paper rustling noise
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 1;

    gain.gain.value = 0.2;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start();

    // Soft tone
    this.playTone(350, 0.08, "triangle", { attack: 0.01, decay: 0.03, sustain: 0.2 });
  }

  // Piece placed - satisfying click with discovery chime
  playPiecePlaced() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Click
    this.playTone(300, 0.05, "square", { attack: 0.002, decay: 0.02, sustain: 0.1 });

    // Discovery chime
    setTimeout(() => {
      [523, 659, 784].forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.15, "sine", { attack: 0.01, decay: 0.05, sustain: 0.4 });
        }, i * 50);
      });
    }, 30);
  }

  // Dragging - subtle slide sound
  playDrag() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = 120 + Math.random() * 30;

    filter.type = "lowpass";
    filter.frequency.value = 300;

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Reset - pages shuffling
  playReset() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playTone(250 - i * 20, 0.08, "triangle", { attack: 0.01, decay: 0.03, sustain: 0.15 });
      }, i * 40);
    }
  }

  // Victory - majestic discovery fanfare
  playWin() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const melody = [
      { freq: 392, time: 0, dur: 0.15 },
      { freq: 494, time: 0.12, dur: 0.15 },
      { freq: 587, time: 0.24, dur: 0.15 },
      { freq: 784, time: 0.36, dur: 0.5 },
    ];

    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.freq, note.dur, "sine", { attack: 0.02, decay: 0.05, sustain: 0.6 });
        this.playTone(note.freq * 1.5, note.dur * 0.7, "sine", { attack: 0.02, decay: 0.05, sustain: 0.25 });
      }, note.time * 1000);
    });

    // Triumphant chord
    setTimeout(() => {
      [523, 659, 784, 1047].forEach((freq) => {
        this.playTone(freq, 0.8, "sine", { attack: 0.05, decay: 0.2, sustain: 0.4 });
      });
    }, 600);
  }

  // Level start - compass activation
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Compass needle sound
    this.playTone(600, 0.1, "sine", { attack: 0.01, decay: 0.05, sustain: 0.3 });

    setTimeout(() => {
      [330, 392, 494, 587].forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.12, "sine", { attack: 0.02, decay: 0.05, sustain: 0.3 });
        }, i * 60);
      });
    }, 100);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const piecesDisplay = document.getElementById("pieces-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: MapPuzzleGame;
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
  game = new MapPuzzleGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.pieces !== undefined) {
      piecesDisplay.textContent = state.pieces;

      // Update map progress for background shader
      const match = state.pieces.match(/(\d+)\/(\d+)/);
      if (match && renderer) {
        const progress = parseInt(match[1]) / parseInt(match[2]);
        renderer.setMapProgress(progress);
      }
    }

    // Piece pickup event
    if (state.piecePickup) {
      audio.playPiecePickup();
      renderer?.emitPiecePickup(
        state.piecePickup.x,
        state.piecePickup.y,
        state.piecePickup.landType
      );
    }

    // Piece placed event
    if (state.piecePlaced) {
      audio.playPiecePlaced();
      renderer?.emitPiecePlaced(
        state.piecePlaced.x,
        state.piecePlaced.y,
        state.piecePlaced.landType
      );
    }

    // Drag trail event
    if (state.dragTrail) {
      audio.playDrag();
      renderer?.emitDragTrail(state.dragTrail.x, state.dragTrail.y);
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
  }, 150);
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
  piecesDisplay.textContent = game.getPiecesPlaced();

  audio.playLevelStart();
  renderer?.emitLevelStart();
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  piecesDisplay.textContent = game.getPiecesPlaced();

  audio.playLevelStart();
  renderer?.emitLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  piecesDisplay.textContent = game.getPiecesPlaced();

  audio.playReset();
  renderer?.emitReset();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
