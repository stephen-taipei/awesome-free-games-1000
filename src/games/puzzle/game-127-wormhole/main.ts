/**
 * Wormhole Main Entry
 * Space / Wormhole Theme
 * Game #127
 */
import { WormholeGame } from "./game";
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

// Audio System - Space / Wormhole Sounds
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

  // Player move - soft space step
  playMove() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 500;
    filter.Q.value = 2;

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Teleport through wormhole - swirling whoosh
  playTeleport() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    // Whoosh sound
    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(200, this.ctx.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(
      1500,
      this.ctx.currentTime + 0.2
    );
    noiseFilter.frequency.exponentialRampToValueAtTime(
      300,
      this.ctx.currentTime + 0.5
    );
    noiseFilter.Q.value = 3;

    noise.type = "sawtooth";
    noise.frequency.setValueAtTime(80, this.ctx.currentTime);
    noise.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.2);
    noise.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.5);

    noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);
    noiseGain.gain.setValueAtTime(0.3, this.ctx.currentTime + 0.3);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.5);

    // Sci-fi tone
    const tone = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();

    tone.type = "sine";
    tone.frequency.setValueAtTime(400, this.ctx.currentTime);
    tone.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.15);
    tone.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.4);

    toneGain.gain.setValueAtTime(0, this.ctx.currentTime);
    toneGain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.05);
    toneGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    tone.connect(toneGain);
    toneGain.connect(this.masterGain);

    tone.start();
    tone.stop(this.ctx.currentTime + 0.4);
  }

  // Goal reached - cosmic success
  playGoal() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(
        0.2,
        this.ctx!.currentTime + i * 0.1 + 0.03
      );
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.ctx!.currentTime + i * 0.1 + 0.3
      );

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + i * 0.1);
      osc.stop(this.ctx!.currentTime + i * 0.1 + 0.35);
    });
  }

  // Win - space fanfare
  playWin() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const melody = [
      { freq: 392, time: 0, dur: 0.15 }, // G4
      { freq: 494, time: 0.12, dur: 0.15 }, // B4
      { freq: 587, time: 0.24, dur: 0.15 }, // D5
      { freq: 784, time: 0.36, dur: 0.3 }, // G5
      { freq: 587, time: 0.55, dur: 0.1 }, // D5
      { freq: 784, time: 0.65, dur: 0.4 }, // G5
    ];

    melody.forEach(({ freq, time, dur }) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + time);
      gain.gain.linearRampToValueAtTime(
        0.2,
        this.ctx!.currentTime + time + 0.02
      );
      gain.gain.setValueAtTime(0.18, this.ctx!.currentTime + time + dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.ctx!.currentTime + time + dur
      );

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + time);
      osc.stop(this.ctx!.currentTime + time + dur + 0.05);
    });

    // Space pad
    const pad = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    const padFilter = this.ctx.createBiquadFilter();

    padFilter.type = "lowpass";
    padFilter.frequency.value = 600;

    pad.type = "triangle";
    pad.frequency.value = 196; // G3

    padGain.gain.setValueAtTime(0, this.ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.2);
    padGain.gain.setValueAtTime(0.08, this.ctx.currentTime + 0.8);
    padGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);

    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(this.masterGain);

    pad.start();
    pad.stop(this.ctx.currentTime + 1.2);
  }

  // Level start - space awakening
  playLevelStart() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    // Rising tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.4);

    osc.type = "sine";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // Reset
  playReset() {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById(
  "webgpu-canvas"
) as HTMLCanvasElement;
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

let game: WormholeGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  if (webgpuCanvas) {
    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (success) {
      console.log("WebGPU initialized for Wormhole");
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
  game = new WormholeGame(canvas);
  game.resize();

  const handlePointer = (
    e: MouseEvent | TouchEvent,
    type: "down" | "move" | "up"
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX =
      "touches" in e
        ? e.touches[0]?.clientX || e.changedTouches[0]?.clientX
        : e.clientX;
    const clientY =
      "touches" in e
        ? e.touches[0]?.clientY || e.changedTouches[0]?.clientY
        : e.clientY;
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    game.handleInput(type, x, y);
  };

  canvas.addEventListener("mousedown", (e) => handlePointer(e, "down"));
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      handlePointer(e, "down");
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(
        e.key
      )
    ) {
      e.preventDefault();
      game.handleKey(e.key);
    }
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level}/${state.totalLevels}`;
    movesDisplay.textContent = state.moves.toString();

    // Player position for WebGPU
    if (state.playerPos) {
      renderer?.setPlayerPosition(state.playerPos.x, state.playerPos.y);
    }

    // Player move event
    if (state.playerMove) {
      renderer?.emitPlayerMove(
        state.playerMove.fromX,
        state.playerMove.fromY,
        state.playerMove.toX,
        state.playerMove.toY
      );
      audio.playMove();
    }

    // Teleport event
    if (state.teleport) {
      renderer?.emitTeleport(
        state.teleport.fromX,
        state.teleport.fromY,
        state.teleport.toX,
        state.teleport.toY,
        state.teleport.color
      );
      audio.playTeleport();
    }

    // Wormhole idle
    if (state.wormholeIdle) {
      renderer?.emitWormholeIdle(
        state.wormholeIdle.x,
        state.wormholeIdle.y,
        state.wormholeIdle.color
      );
    }

    // Goal reached
    if (state.goalReached) {
      renderer?.emitGoalReached(state.goalReached.x, state.goalReached.y);
      audio.playGoal();
    }

    // Reset event
    if (state.reset) {
      renderer?.emitReset();
      audio.playReset();
    }

    if (state.status === "won") {
      renderer?.emitVictory();
      audio.playWin();
      showWin(state.level, state.totalLevels);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
}

function showWin(level: number, totalLevels: number) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (level >= totalLevels) {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = "";
      nextBtn.style.display = "none";
    } else {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = `${i18n.t("game.level")} ${level}`;
      nextBtn.style.display = "inline-block";
    }

    startBtn.style.display = "inline-block";
    startBtn.textContent = i18n.t("game.reset");
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  game.reset();
});

nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
  renderer?.emitLevelStart();
  audio.playLevelStart();
});

// Init
initI18n();
initGame();
initWebGPU();
