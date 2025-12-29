/**
 * Tube Sort Main Entry
 * Game #084 - WebGPU Enhanced with Laboratory/Chemistry Theme
 */
import { TubeSortGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Synthesized laboratory liquid sounds
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
  }

  playSelect(colorIndex: number) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(350 + colorIndex * 50, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500 + colorIndex * 60, this.ctx.currentTime + 0.12);

    filter.type = "lowpass";
    filter.frequency.value = 1800;
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playPourStart(colorIndex: number) {
    this.init();
    if (!this.ctx) return;

    // Liquid starting to pour
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);

    filter.type = "bandpass";
    filter.frequency.value = 600;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playPourEnd(colorIndex: number) {
    this.init();
    if (!this.ctx) return;

    // Splash/bubbles at the end
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        const freq = 250 + Math.random() * 200 + colorIndex * 25;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.6, this.ctx.currentTime + 0.06);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      }, i * 35);
    }
  }

  playComplete(colorIndex: number) {
    this.init();
    if (!this.ctx) return;

    // Chemical reaction complete sound
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.28);
      }, i * 70);
    });
  }

  playUndo() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playVictory() {
    this.init();
    if (!this.ctx) return;

    const melody = [523, 659, 784, 659, 784, 1047];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;
        osc2.type = "triangle";
        osc2.frequency.value = freq * 0.5;

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.32);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc2.start();
        osc.stop(this.ctx.currentTime + 0.32);
        osc2.stop(this.ctx.currentTime + 0.32);
      }, i * 110);
    });
  }

  playLevelStart() {
    this.init();
    if (!this.ctx) return;

    // Lab equipment starting up
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = "sine";
        const freq = 200 + i * 80;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.1);

        filter.type = "bandpass";
        filter.frequency.value = 800;

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
      }, i * 50);
    }
  }

  playReset() {
    this.init();
    if (!this.ctx) return;

    // Equipment reset sound
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(500 - i * 80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
      }, i * 45);
    }
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const undoBtn = document.getElementById("undo-btn")!;

let game: TubeSortGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  if (!webgpuCanvas) return;

  const container = document.querySelector(".game-area") as HTMLElement;
  if (container) {
    webgpuCanvas.width = container.clientWidth;
    webgpuCanvas.height = container.clientHeight;
  }

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (!success) {
    console.log("WebGPU not available, continuing without effects");
    renderer = null;
  }

  window.addEventListener("resize", () => {
    if (renderer && container) {
      renderer.resize(container.clientWidth, container.clientHeight);
    }
  });
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
  game = new TubeSortGame(canvas);
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
    movesDisplay.textContent = state.moves.toString();
    undoBtn.style.opacity = state.canUndo ? "1" : "0.5";

    // Handle events
    if (state.event && renderer) {
      const colorIdx = state.eventColorIndex ?? 0;

      switch (state.event) {
        case "select":
          if (state.eventX !== undefined && state.eventY !== undefined) {
            renderer.emitSelect(state.eventX, state.eventY, colorIdx);
            audio.playSelect(colorIdx);
          }
          break;
        case "pourStart":
          if (state.eventX !== undefined && state.eventY !== undefined) {
            renderer.emitPourStart(state.eventX, state.eventY, colorIdx);
            audio.playPourStart(colorIdx);
          }
          break;
        case "pourEnd":
          if (state.eventX !== undefined && state.eventY !== undefined) {
            renderer.emitPourEnd(state.eventX, state.eventY, colorIdx);
            audio.playPourEnd(colorIdx);
          }
          break;
        case "complete":
          if (state.eventX !== undefined && state.eventY !== undefined) {
            renderer.emitComplete(state.eventX, state.eventY, colorIdx);
            audio.playComplete(colorIdx);
          }
          break;
        case "undo":
          renderer.emitUndo(canvas.width / 2, canvas.height / 2);
          audio.playUndo();
          break;
        case "victory":
          renderer.emitVictory(canvas.width / 2, canvas.height / 2);
          audio.playVictory();
          break;
        case "levelStart":
          renderer.emitLevelStart(canvas.width / 2, canvas.height / 2);
          audio.playLevelStart();
          break;
        case "reset":
          renderer.emitReset();
          audio.playReset();
          break;
      }
    }

    if (state.status === "won") {
      showWin(state.level, state.maxLevel);
    }
  });

  window.addEventListener("resize", () => game.resize());
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
undoBtn.addEventListener("click", () => {
  game.undo();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
