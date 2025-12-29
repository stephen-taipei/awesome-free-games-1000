/**
 * Color Sort Main Entry
 * Game #083 - WebGPU Enhanced with Bubbly/Liquid/Glass Theme
 */
import { ColorSortGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Synthesized bubbly liquid sounds
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
    osc.frequency.setValueAtTime(400 + colorIndex * 60, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600 + colorIndex * 80, this.ctx.currentTime + 0.1);

    filter.type = "lowpass";
    filter.frequency.value = 2000;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playPour(colorIndex: number) {
    this.init();
    if (!this.ctx) return;

    // Liquid pouring sound with bubbles
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = "sine";
        const baseFreq = 300 + Math.random() * 200 + colorIndex * 30;
        osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.08);

        filter.type = "bandpass";
        filter.frequency.value = 800;
        filter.Q.value = 8;

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
      }, i * 40);
    }
  }

  playComplete(colorIndex: number) {
    this.init();
    if (!this.ctx) return;

    // Satisfying completion sound
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
      }, i * 80);
    });
  }

  playUndo() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
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
        const filter = this.ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.value = freq;
        osc2.type = "sine";
        osc2.frequency.value = freq * 1.5;

        filter.type = "lowpass";
        filter.frequency.value = 3000;

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc2.start();
        osc.stop(this.ctx.currentTime + 0.35);
        osc2.stop(this.ctx.currentTime + 0.35);
      }, i * 120);
    });
  }

  playLevelStart() {
    this.init();
    if (!this.ctx) return;

    // Bubble rising sound
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        const freq = 200 + i * 100 + Math.random() * 50;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.8, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
      }, i * 60);
    }
  }

  playReset() {
    this.init();
    if (!this.ctx) return;

    // Liquid swirl reset sound
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(600 - i * 100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
      }, i * 50);
    }
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const tubesContainer = document.getElementById("tubes-container")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const undoBtn = document.getElementById("undo-btn")!;

let game: ColorSortGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  const canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  if (!canvas) return;

  const container = document.querySelector(".game-area") as HTMLElement;
  if (container) {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }

  renderer = new WebGPURenderer(canvas);
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

function getTubePosition(index: number): { x: number; y: number } {
  const tubeEl = tubesContainer.children[index] as HTMLElement;
  if (!tubeEl) return { x: 0, y: 0 };
  const rect = tubeEl.getBoundingClientRect();
  const containerRect = tubesContainer.getBoundingClientRect();
  return {
    x: rect.left - containerRect.left + rect.width / 2 + tubesContainer.offsetLeft,
    y: rect.top - containerRect.top + rect.height / 2 + tubesContainer.offsetTop,
  };
}

function getColorIndex(color: string): number {
  const colors = [
    "#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6",
    "#e67e22", "#1abc9c", "#e91e63", "#00bcd4", "#795548"
  ];
  return colors.indexOf(color);
}

function initGame() {
  game = new ColorSortGame();

  game.setOnStateChange((state) => {
    levelDisplay.textContent = state.level.toString();
    movesDisplay.textContent = state.moves.toString();
    undoBtn.style.opacity = state.canUndo ? "1" : "0.5";

    // Handle events
    if (state.event && renderer) {
      const pos = state.eventX !== undefined && state.eventY !== undefined
        ? { x: state.eventX, y: state.eventY }
        : getTubePosition(state.eventTubeIndex || 0);
      const colorIdx = state.eventColorIndex ?? 0;

      switch (state.event) {
        case "select":
          renderer.emitSelect(pos.x, pos.y, colorIdx);
          audio.playSelect(colorIdx);
          break;
        case "pour":
          renderer.emitPour(pos.x, pos.y, colorIdx);
          audio.playPour(colorIdx);
          break;
        case "complete":
          renderer.emitComplete(pos.x, pos.y, colorIdx);
          audio.playComplete(colorIdx);
          break;
        case "undo":
          renderer.emitUndo(pos.x, pos.y);
          audio.playUndo();
          break;
        case "victory":
          const center = { x: tubesContainer.offsetWidth / 2, y: tubesContainer.offsetHeight / 2 };
          renderer.emitVictory(center.x + tubesContainer.offsetLeft, center.y + tubesContainer.offsetTop);
          audio.playVictory();
          break;
        case "levelStart":
          renderer.emitLevelStart(pos.x, pos.y);
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

  game.setOnRender(() => {
    renderTubes();
  });
}

function renderTubes() {
  tubesContainer.innerHTML = "";
  const tubes = game.getTubes();
  const selectedIndex = game.getSelectedTubeIndex();

  tubes.forEach((tube, index) => {
    const tubeEl = document.createElement("div");
    tubeEl.className = "tube" + (index === selectedIndex ? " selected" : "");
    tubeEl.dataset.index = index.toString();

    // Check if tube is complete
    if (tube.balls.length === tube.capacity) {
      const firstColor = tube.balls[0];
      if (tube.balls.every(b => b === firstColor)) {
        tubeEl.classList.add("complete");
      }
    }

    // Render balls from bottom to top
    tube.balls.forEach((color, ballIndex) => {
      const ballEl = document.createElement("div");
      ballEl.className = "ball";
      ballEl.style.backgroundColor = color;
      tubeEl.appendChild(ballEl);
    });

    tubeEl.addEventListener("click", () => {
      game.selectTube(index);
    });

    tubesContainer.appendChild(tubeEl);
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
undoBtn.addEventListener("click", () => {
  game.undo();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
