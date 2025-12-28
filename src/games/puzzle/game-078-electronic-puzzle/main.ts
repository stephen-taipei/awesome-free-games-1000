/**
 * Electronic Puzzle Main Entry
 * Game #078 - WebGPU Enhanced
 */
import { ElectronicGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  playRotate(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  playConnection(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 600;

    osc2.type = "sine";
    osc2.frequency.value = 900;

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain).connect(ctx.destination);
    osc2.connect(gain);
    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.15);
  }

  playPowerOn(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  playCircuitComplete(): void {
    const ctx = this.getCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  playVictory(): void {
    const ctx = this.getCtx();
    const melody = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.12 },
      { freq: 783.99, time: 0.24 },
      { freq: 1046.5, time: 0.36 },
      { freq: 783.99, time: 0.48 },
      { freq: 1046.5, time: 0.6 },
      { freq: 1318.5, time: 0.8 },
    ];

    melody.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + time;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  playReset(): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const powerDisplay = document.getElementById("power-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: ElectronicGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();
  if (!success) {
    webgpuCanvas.style.display = "none";
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
  game = new ElectronicGame(canvas);
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
    powerDisplay.textContent = state.powered ? i18n.t("game.on") : i18n.t("game.off");
    powerDisplay.style.color = state.powered ? "#00ff88" : "#e94560";

    // Handle WebGPU events
    if (state.event) {
      switch (state.event) {
        case "rotate":
          audio.playRotate();
          renderer?.emitRotate(state.x ?? 0, state.y ?? 0);
          break;
        case "connection":
          audio.playConnection();
          renderer?.emitConnection(state.x ?? 0, state.y ?? 0);
          break;
        case "powerOn":
          audio.playPowerOn();
          renderer?.emitPowerOn(state.x ?? 0, state.y ?? 0);
          break;
        case "circuitComplete":
          audio.playCircuitComplete();
          renderer?.emitCircuitComplete(state.x ?? 0, state.y ?? 0);
          break;
        case "victory":
          audio.playVictory();
          renderer?.emitVictory();
          break;
        case "levelStart":
          renderer?.emitLevelStart();
          break;
        case "reset":
          audio.playReset();
          renderer?.emitReset();
          break;
      }
    }

    // Update powered state for background shader
    renderer?.setPowered(state.powered);

    if (state.status === "won") {
      showWin(state.level, state.maxLevel);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
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
      overlayMsg.textContent = "All circuits completed!";
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
initWebGPU();
initGame();
