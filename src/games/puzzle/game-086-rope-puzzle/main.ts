/**
 * Rope Puzzle Main Entry
 * Game #086
 * Neon / String / Glow Theme
 */
import { RopePuzzleGame } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

// Simple i18n implementation
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

// Audio System - Neon/String Sounds
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playGrab(colorIndex: number) {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Soft neon hum when grabbing
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 800 + colorIndex * 100;

    osc.type = "sine";
    osc.frequency.value = 220 + colorIndex * 40;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playDrag() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Soft whoosh while dragging
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.value = 600;
    filter.Q.value = 2;

    osc.type = "triangle";
    osc.frequency.value = 200 + Math.random() * 100;

    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playRelease(colorIndex: number) {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Soft release sound
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400 + colorIndex * 50, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    osc2.type = "triangle";
    osc2.frequency.value = 600 + colorIndex * 30;

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.2);
    osc2.stop(now + 0.15);
  }

  playUntangle() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Satisfying untangle chime
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  playVictory() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Triumphant neon fanfare
    const notes = [523, 659, 784, 880, 1047];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.value = 2500;

      osc.type = "sine";
      osc.frequency.value = freq;
      osc2.type = "triangle";
      osc2.frequency.value = freq * 1.5;

      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc2.start(startTime);
      osc.stop(startTime + 0.5);
      osc2.stop(startTime + 0.5);
    });
  }

  playLevelStart() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Neon power-up sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  playReset() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Soft reset whoosh
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = now + i * 0.1;
      osc.type = "sine";
      osc.frequency.setValueAtTime(300 - i * 50, startTime);
      osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.15);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: RopePuzzleGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();
  if (!success) {
    console.warn("WebGPU not available, continuing without effects");
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
  game = new RopePuzzleGame(canvas);
  game.resize();

  // Mouse inputs
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", (e) => handleInput("up", e));

  // Touch inputs
  canvas.addEventListener("touchstart", (e) => handleTouch("down", e), {
    passive: false,
  });
  window.addEventListener("touchmove", (e) => handleTouch("move", e), {
    passive: false,
  });
  window.addEventListener("touchend", (e) => handleTouch("up", e), {
    passive: false,
  });

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) {
      movesDisplay.textContent = state.moves.toString();
    }

    // Handle events for audio and visual effects
    if (state.event) {
      const cx = webgpuCanvas.width / 2;
      const cy = webgpuCanvas.height / 2;
      const eventX = state.eventX ?? cx;
      const eventY = state.eventY ?? cy;
      const colorIndex = state.eventColorIndex ?? 0;

      switch (state.event) {
        case "grab":
          audio.playGrab(colorIndex);
          renderer?.emitGrab(eventX, eventY, colorIndex);
          break;
        case "drag":
          audio.playDrag();
          renderer?.emitDrag(eventX, eventY, colorIndex);
          break;
        case "release":
          audio.playRelease(colorIndex);
          renderer?.emitRelease(eventX, eventY, colorIndex);
          break;
        case "untangle":
          audio.playUntangle();
          renderer?.emitUntangle(eventX, eventY, colorIndex);
          break;
        case "victory":
          audio.playVictory();
          renderer?.emitVictory(cx, cy);
          break;
        case "levelStart":
          audio.playLevelStart();
          renderer?.emitLevelStart(cx, cy);
          break;
        case "reset":
          audio.playReset();
          renderer?.emitReset();
          break;
      }
    }

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer) {
      const rect = webgpuCanvas.parentElement!.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    }
  });
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  game.handleInput(type, x, y);
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

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  levelDisplay.textContent = game.getLevel().toString();
  movesDisplay.textContent = "0";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
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
initWebGPU().then(() => {
  initGame();
  if (renderer) {
    const rect = webgpuCanvas.parentElement!.getBoundingClientRect();
    renderer.resize(rect.width, rect.height);
  }
});
