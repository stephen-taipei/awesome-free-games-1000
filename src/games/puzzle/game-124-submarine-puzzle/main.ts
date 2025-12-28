/**
 * Submarine Puzzle Main Entry
 * Underwater Ocean / Deep Sea Theme
 * Game #124
 */
import { SubmarineGame } from "./game";
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

// Audio System - Underwater Ocean Sounds
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.log("Audio not available");
    }
  }

  private ensureContext() {
    if (this.ctx?.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Submarine depth change sound - water swoosh
  playDepthChange(direction: number) {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 400;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(direction > 0 ? 80 : 120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      direction > 0 ? 120 : 80,
      this.ctx.currentTime + 0.2
    );

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // Submarine trail bubbles
  playSubmarineTrail() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.value = 800 + Math.random() * 400;
    filter.Q.value = 2;

    osc.type = "sine";
    osc.frequency.value = 200 + Math.random() * 100;

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Oxygen collected - refreshing bubble sound
  playOxygenCollect() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const duration = 0.4;

    // Rising bubbles
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      const startFreq = 400 + i * 100;
      osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime + i * 0.05);
      osc.frequency.exponentialRampToValueAtTime(
        startFreq * 1.5,
        this.ctx.currentTime + i * 0.05 + 0.1
      );

      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.05 + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(this.ctx.currentTime + i * 0.05);
      osc.stop(this.ctx.currentTime + i * 0.05 + 0.2);
    }
  }

  // Star collected - magical underwater shimmer
  playStarCollect() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + i * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + i * 0.08);
      osc.stop(this.ctx!.currentTime + i * 0.08 + 0.35);
    });
  }

  // Collision - impact with reverb
  playCollision() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    // Impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 200;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);

    // Debris noise
    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 300;
    noiseFilter.Q.value = 1;

    noise.type = "triangle";
    noise.frequency.value = 50;

    noiseGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.3);
  }

  // Win sound - triumphant underwater fanfare
  playWin() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const melody = [
      { freq: 392, time: 0, dur: 0.2 },     // G4
      { freq: 440, time: 0.15, dur: 0.2 },  // A4
      { freq: 523, time: 0.3, dur: 0.2 },   // C5
      { freq: 659, time: 0.45, dur: 0.4 },  // E5
      { freq: 784, time: 0.7, dur: 0.5 },   // G5
    ];

    melody.forEach(({ freq, time, dur }) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.25, this.ctx!.currentTime + time + 0.03);
      gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + time + dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + time);
      osc.stop(this.ctx!.currentTime + time + dur + 0.05);
    });
  }

  // Level start - submarine engine startup
  playLevelStart() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    // Engine rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 150;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(40, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.9);

    // Bubble release
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => this.playSubmarineTrail(), i * 50);
      }
    }, 300);
  }

  // Reset sound - water rushing
  playReset() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.4);

    osc.type = "sawtooth";
    osc.frequency.value = 100;

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const depthDisplay = document.getElementById("depth-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

const upBtn = document.getElementById("up-btn")!;
const downBtn = document.getElementById("down-btn")!;

let game: SubmarineGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  if (webgpuCanvas) {
    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (success) {
      console.log("WebGPU initialized for Submarine Puzzle");
      // Emit ambient particles periodically
      setInterval(() => {
        renderer?.emitAmbient();
      }, 150);
    }
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
  game = new SubmarineGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.depth !== undefined) {
      depthDisplay.textContent = `${state.depth}m`;
      renderer?.setSubmarineDepth(state.depth);
    }

    if (state.scrollX !== undefined) {
      renderer?.setScrollX(state.scrollX);
    }

    // Submarine trail particles
    if (state.submarineTrail) {
      renderer?.emitSubmarineTrail(state.submarineTrail.x, state.submarineTrail.y);
      audio.playSubmarineTrail();
    }

    // Depth change
    if (state.depthChange) {
      renderer?.emitDepthChange(
        state.depthChange.x,
        state.depthChange.y,
        state.depthChange.direction
      );
      audio.playDepthChange(state.depthChange.direction);
    }

    // Oxygen collected
    if (state.oxygenCollect) {
      renderer?.emitOxygenCollect(state.oxygenCollect.x, state.oxygenCollect.y);
      audio.playOxygenCollect();
    }

    // Star collected
    if (state.starCollect) {
      renderer?.emitStarCollect(state.starCollect.x, state.starCollect.y);
      audio.playStarCollect();
    }

    // Collision
    if (state.collision) {
      renderer?.emitCollision(state.collision.x, state.collision.y);
      audio.playCollision();
    }

    // Reset
    if (state.reset) {
      renderer?.emitReset();
      audio.playReset();
    }

    if (state.status === "won") {
      renderer?.emitVictory();
      audio.playWin();
      showWin();
    } else if (state.status === "lost") {
      showLost();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
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

function showLost() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = "Game Over";
    overlayMsg.textContent = i18n.t("game.reset");
    nextBtn.style.display = "none";
    startBtn.textContent = i18n.t("game.start");
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
  depthDisplay.textContent = `${game.getDepth()}m`;
  renderer?.emitLevelStart(80, game.getDepth());
  audio.playLevelStart();
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  depthDisplay.textContent = `${game.getDepth()}m`;
  renderer?.emitLevelStart(80, game.getDepth());
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  depthDisplay.textContent = `${game.getDepth()}m`;
});
nextBtn.addEventListener("click", nextLevel);

// Control buttons
upBtn.addEventListener("click", () => game.moveUp());
downBtn.addEventListener("click", () => game.moveDown());

// Keyboard controls
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    game.moveUp();
  } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
    game.moveDown();
  }
});

// Init
initI18n();
initGame();
initWebGPU();
