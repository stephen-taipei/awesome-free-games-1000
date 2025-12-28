/**
 * Solar System Puzzle Main Entry
 * Space / Cosmos Theme
 * Game #125
 */
import { SolarSystemGame } from "./game";
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

// Audio System - Cosmic Space Sounds
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

  // Planet click - orbital shift sound
  playPlanetClick() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 800;
    filter.Q.value = 2;

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Planet aligned - cosmic harmony sound
  playAlignment() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const notes = [440, 554, 659]; // A4, C#5, E5 (A major chord)

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + i * 0.05 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + i * 0.05 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + i * 0.05);
      osc.stop(this.ctx!.currentTime + i * 0.05 + 0.45);
    });
  }

  // Win - celestial fanfare
  playWin() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const melody = [
      { freq: 523, time: 0, dur: 0.15 },    // C5
      { freq: 659, time: 0.12, dur: 0.15 }, // E5
      { freq: 784, time: 0.24, dur: 0.15 }, // G5
      { freq: 1047, time: 0.36, dur: 0.3 }, // C6
      { freq: 784, time: 0.55, dur: 0.15 }, // G5
      { freq: 1047, time: 0.65, dur: 0.4 }, // C6
    ];

    melody.forEach(({ freq, time, dur }) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.25, this.ctx!.currentTime + time + 0.02);
      gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + time + dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + time);
      osc.stop(this.ctx!.currentTime + time + dur + 0.05);
    });

    // Add ethereal pad
    const pad = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    const padFilter = this.ctx.createBiquadFilter();

    padFilter.type = "lowpass";
    padFilter.frequency.value = 1000;

    pad.type = "triangle";
    pad.frequency.value = 262; // C4

    padGain.gain.setValueAtTime(0, this.ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.2);
    padGain.gain.setValueAtTime(0.1, this.ctx.currentTime + 0.8);
    padGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);

    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(this.masterGain);

    pad.start();
    pad.stop(this.ctx.currentTime + 1.2);
  }

  // Level start - cosmic awakening
  playLevelStart() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    // Low rumble
    const rumble = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    const rumbleFilter = this.ctx.createBiquadFilter();

    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 150;

    rumble.type = "sawtooth";
    rumble.frequency.value = 50;

    rumbleGain.gain.setValueAtTime(0, this.ctx.currentTime);
    rumbleGain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.2);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);

    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);

    rumble.start();
    rumble.stop(this.ctx.currentTime + 0.6);

    // Rising tone
    const rise = this.ctx.createOscillator();
    const riseGain = this.ctx.createGain();

    rise.type = "sine";
    rise.frequency.setValueAtTime(200, this.ctx.currentTime);
    rise.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.5);

    riseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    riseGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
    riseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    rise.connect(riseGain);
    riseGain.connect(this.masterGain);

    rise.start();
    rise.stop(this.ctx.currentTime + 0.5);
  }

  // Reset - cosmic reset
  playReset() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const planetsDisplay = document.getElementById("planets-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: SolarSystemGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  if (webgpuCanvas) {
    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (success) {
      console.log("WebGPU initialized for Solar System");
      // Emit ambient particles periodically
      setInterval(() => {
        renderer?.emitAmbient();
      }, 200);
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
  game = new SolarSystemGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    if (state.aligned !== undefined && state.total !== undefined) {
      planetsDisplay.textContent = `${state.aligned}/${state.total}`;
    }

    // Sun position for WebGPU
    if (state.sunPosition) {
      renderer?.setSunPosition(state.sunPosition.x, state.sunPosition.y);
    }

    // Planet clicked
    if (state.planetClick) {
      renderer?.emitPlanetClick(
        state.planetClick.x,
        state.planetClick.y,
        state.planetClick.color
      );
      audio.playPlanetClick();
    }

    // Planet aligned
    if (state.alignment) {
      renderer?.emitAlignment(state.alignment.x, state.alignment.y);
      audio.playAlignment();
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

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
  planetsDisplay.textContent = `${game.getAligned()}/${game.getTotal()}`;
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
  planetsDisplay.textContent = `${game.getAligned()}/${game.getTotal()}`;
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  planetsDisplay.textContent = `${game.getAligned()}/${game.getTotal()}`;
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initGame();
initWebGPU();
