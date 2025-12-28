/**
 * Screw Puzzle Main Entry
 * Game #085
 * Workshop / Industrial / Metallic Theme
 */
import { ScrewPuzzleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Industrial/Metallic Sounds
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playClick(colorIndex: number) {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Metallic click sound
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.value = 2000 + colorIndex * 200;
    filter.Q.value = 8;

    osc.type = "square";
    osc.frequency.value = 800 + colorIndex * 100;
    osc2.type = "sawtooth";
    osc2.frequency.value = 1200 + colorIndex * 80;

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialDecayTo?.(0.01, now + 0.08) ||
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.08);
    osc2.stop(now + 0.08);
  }

  playRotateStart(colorIndex: number) {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Mechanical engage sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 600;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200 + colorIndex * 30, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playRotating() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Continuous rotation clicks
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = 80 + Math.random() * 40;

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  playRemove(colorIndex: number) {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Screw release sound - metallic pop
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "highpass";
    filter.frequency.value = 1000;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(600 + colorIndex * 80, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1200 + colorIndex * 100, now);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.2);
    osc2.stop(now + 0.15);
  }

  playBlocked() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Error buzz - mechanical jam
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.value = 300;
    filter.Q.value = 5;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.setValueAtTime(120, now + 0.05);
    osc.frequency.setValueAtTime(100, now + 0.1);
    osc.frequency.setValueAtTime(120, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playVictory() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Triumphant industrial fanfare
    const notes = [523, 659, 784, 1047];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.value = 3000;

      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc2.type = "square";
      osc2.frequency.value = freq * 0.5;

      const startTime = now + i * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc2.start(startTime);
      osc.stop(startTime + 0.4);
      osc2.stop(startTime + 0.4);
    });
  }

  playLevelStart() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Workshop startup - machine powering on
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(1500, now + 0.4);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.3);
    osc.frequency.linearRampToValueAtTime(100, now + 0.5);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  playReset() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Mechanical reset - parts falling back
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = now + i * 0.08;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(400 - i * 60, startTime);
      osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.1);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.12);
    }
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const screwsDisplay = document.getElementById("screws-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: ScrewPuzzleGame;
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
  game = new ScrewPuzzleGame(canvas);
  game.resize();

  // Mouse input
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);
  });

  // Touch input
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);
  });

  game.setOnStateChange((state) => {
    levelDisplay.textContent = state.level.toString();
    screwsDisplay.textContent = `${state.screwsRemoved}/${state.totalScrews}`;

    // Handle events for audio and visual effects
    if (state.event) {
      const cx = webgpuCanvas.width / 2;
      const cy = webgpuCanvas.height / 2;
      const eventX = state.eventX ?? cx;
      const eventY = state.eventY ?? cy;
      const colorIndex = state.eventColorIndex ?? 0;

      switch (state.event) {
        case "click":
          audio.playClick(colorIndex);
          renderer?.emitClick(eventX, eventY, colorIndex);
          break;
        case "rotateStart":
          audio.playRotateStart(colorIndex);
          renderer?.emitRotateStart(eventX, eventY, colorIndex);
          break;
        case "rotating":
          audio.playRotating();
          renderer?.emitRotating(eventX, eventY, state.eventProgress ?? 0, colorIndex);
          break;
        case "remove":
          audio.playRemove(colorIndex);
          renderer?.emitRemove(eventX, eventY, colorIndex);
          break;
        case "blocked":
          audio.playBlocked();
          renderer?.emitBlocked(eventX, eventY);
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
      showWin(state.level, state.maxLevel);
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

function showWin(level: number, maxLevel: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");

    if (level < maxLevel) {
      overlayMsg.textContent = `Level ${level} completed!`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
      };
    } else {
      overlayMsg.textContent = "All levels completed!";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
  if (renderer) {
    const rect = webgpuCanvas.parentElement!.getBoundingClientRect();
    renderer.resize(rect.width, rect.height);
  }
});
