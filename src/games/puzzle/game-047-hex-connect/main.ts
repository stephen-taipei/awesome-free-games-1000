/**
 * Hex Connect Main Entry
 * Crystal Honeycomb / Prismatic Gem Theme
 * Game #047
 */
import { HexConnectGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Crystal/Gem sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Hex rotation - crystalline click
  playRotate(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Crystal click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);

    // Harmonic shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = 2400;
    shimmerGain.gain.setValueAtTime(0.04, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now);
    shimmer.stop(now + 0.15);
  }

  // Connection made - chime
  playConnect(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [880, 1108]; // A5, C#6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  // Victory fanfare - prismatic
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Ascending crystal melody
    const notes = [523, 659, 784, 988, 1319]; // C5, E5, G5, B5, E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.12;
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.6);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc2.start(now + delay);
      osc.stop(now + delay + 0.6);
      osc2.stop(now + delay + 0.6);
    });

    // Crystal shimmer
    for (let i = 0; i < 6; i++) {
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();

      shimmer.type = 'sine';
      shimmer.frequency.value = 2000 + i * 200;

      shimmerGain.gain.setValueAtTime(0.03, now + 0.5 + i * 0.1);
      shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8 + i * 0.1);

      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      shimmer.start(now + 0.5 + i * 0.1);
      shimmer.stop(now + 0.8 + i * 0.1);
    }
  }

  // Reset sound
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Start/next level
  playStart(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [523, 784]; // C5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  // Hover sound (subtle)
  playHover(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 1500;

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: HexConnectGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

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

async function initGame() {
  game = new HexConnectGame(canvas);
  game.resize();

  // Initialize WebGPU
  if (bgCanvas) {
    renderer = new WebGPURenderer(bgCanvas);
    const success = await renderer.initialize();
    if (success) {
      requestAnimationFrame(function renderLoop() {
        renderer?.render();
        requestAnimationFrame(renderLoop);
      });
    }
  }

  // Mouse click
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find if clicking on a hex
    const clickedHex = findClickedHex(x, y);
    if (clickedHex) {
      audio.playRotate();

      const nx = clickedHex.x / canvas.width;
      const ny = clickedHex.y / canvas.height;

      if (renderer) {
        renderer.emitRotate(nx, ny);
      }
    }

    game.handleClick(x, y);
  });

  // Touch
  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Find if clicking on a hex
    const clickedHex = findClickedHex(x, y);
    if (clickedHex) {
      audio.playRotate();

      const nx = clickedHex.x / canvas.width;
      const ny = clickedHex.y / canvas.height;

      if (renderer) {
        renderer.emitRotate(nx, ny);
      }
    }

    game.handleClick(x, y);
  });

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) {
      movesDisplay.textContent = String(state.moves);
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      audio.playVictory();
      if (renderer) {
        renderer.emitVictory(0.5, 0.5);
      }
      showWin(state.hasNextLevel, state.moves);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    resizeBgCanvas();
  });

  resizeBgCanvas();
}

function resizeBgCanvas() {
  if (bgCanvas && bgCanvas.parentElement) {
    const rect = bgCanvas.parentElement.getBoundingClientRect();
    bgCanvas.width = rect.width;
    bgCanvas.height = rect.height;
  }
}

function findClickedHex(x: number, y: number): { x: number; y: number } | null {
  // Access game cells to find clicked hex
  if (!game.cells) return null;

  for (const row of game.cells) {
    for (const cell of row) {
      const dist = Math.hypot(x - cell.x, y - cell.y);
      if (dist < game.hexSize) {
        return { x: cell.x, y: cell.y };
      }
    }
  }
  return null;
}

function showWin(hasNextLevel: boolean, moves: number) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = `${i18n.t("game.moves")}: ${moves}`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        audio.playStart();
        game.nextLevel();
        levelDisplay.textContent = String(game.getTotalLevels());
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = `${i18n.t("game.moves")}: ${moves}`;
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        levelDisplay.textContent = "1";
        audio.playStart();
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  movesDisplay.textContent = "0";
  game.start();
}

startBtn.addEventListener("click", () => {
  audio.playStart();
  startGame();
});

resetBtn.addEventListener("click", () => {
  audio.playReset();
  movesDisplay.textContent = "0";
  game.reset();
});

// Init
initI18n();
initGame();
