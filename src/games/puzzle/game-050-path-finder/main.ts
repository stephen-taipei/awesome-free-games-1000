/**
 * Path Finder Main Entry
 * Neon Circuit / Electronic Data Flow Theme
 * Game #050
 */
import { PathFinderGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Electronic Circuit Sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Start drawing path - circuit activation
  playStart(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Power-up sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);

    // Digital beep
    const beep = ctx.createOscillator();
    const beepGain = ctx.createGain();
    beep.type = 'square';
    beep.frequency.value = 880;
    beepGain.gain.setValueAtTime(0.04, now + 0.1);
    beepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    beep.connect(beepGain);
    beepGain.connect(ctx.destination);
    beep.start(now + 0.1);
    beep.stop(now + 0.15);
  }

  // Path step - data packet transmission
  playStep(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Backtrack - signal reversal
  playBacktrack(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Draw release
  playRelease(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Goal reached - connection established
  playGoal(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Success chord
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.3);
    });

    // Electric confirmation
    const buzz = ctx.createOscillator();
    const buzzGain = ctx.createGain();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 220;
    buzzGain.gain.setValueAtTime(0.03, now);
    buzzGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    buzz.connect(buzzGain);
    buzzGain.connect(ctx.destination);
    buzz.start(now);
    buzz.stop(now + 0.2);
  }

  // Victory - full system activation
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Ascending electronic melody
    const notes = [392, 523, 659, 784, 1047]; // G4, C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.1;
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc2.type = 'square';
      osc2.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc2.start(now + delay);
      osc.stop(now + delay + 0.5);
      osc2.stop(now + delay + 0.5);
    });

    // Electric surge
    for (let i = 0; i < 6; i++) {
      const surge = ctx.createOscillator();
      const surgeGain = ctx.createGain();

      surge.type = 'sawtooth';
      surge.frequency.value = 100 + i * 80;

      surgeGain.gain.setValueAtTime(0.02, now + 0.4 + i * 0.05);
      surgeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5 + i * 0.05);

      surge.connect(surgeGain);
      surgeGain.connect(ctx.destination);

      surge.start(now + 0.4 + i * 0.05);
      surge.stop(now + 0.5 + i * 0.05);
    }
  }

  // Clear path - circuit reset
  playClear(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Toggle hint - system query
  playHint(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [880, 1100, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.05, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.1);
    });
  }

  // Reset - power cycle
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Power down
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);

    // Power up
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(50, now + 0.35);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.5);

    gain2.gain.setValueAtTime(0.05, now + 0.35);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.35);
    osc2.stop(now + 0.55);
  }

  // Next level - system upgrade
  playNextLevel(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.08, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const stepsDisplay = document.getElementById("steps-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const clearBtn = document.getElementById("clear-btn")!;
const hintBtn = document.getElementById("hint-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: PathFinderGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

let lastPathLength = 0;
let isDrawing = false;

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
  game = new PathFinderGame(canvas);
  game.resize();

  // Initialize WebGPU
  if (bgCanvas) {
    renderer = new WebGPURenderer(bgCanvas);
    const success = await renderer.initialize();
    if (success) {
      resizeBgCanvas();
      requestAnimationFrame(function renderLoop() {
        renderer?.render();
        requestAnimationFrame(renderLoop);
      });
    }
  }

  // Mouse events
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", (e) => handleInput("up", e));

  // Touch events
  canvas.addEventListener("touchstart", (e) => handleTouch("down", e), { passive: false });
  window.addEventListener("touchmove", (e) => handleTouch("move", e), { passive: false });
  window.addEventListener("touchend", (e) => handleTouch("up", e), { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.steps !== undefined) {
      const currentLength = state.steps + 1;
      if (currentLength > lastPathLength) {
        // Path extended
        audio.playStep();
        if (renderer) {
          renderer.emitRoute(0.5, 0.5);
        }
      } else if (currentLength < lastPathLength) {
        // Backtracked
        audio.playBacktrack();
      }
      lastPathLength = currentLength;
      stepsDisplay.textContent = String(state.steps);
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      audio.playGoal();
      if (renderer) {
        renderer.emitGoal(0.5, 0.5);
      }
      setTimeout(() => {
        audio.playVictory();
        if (renderer) {
          renderer.emitVictory(0.5, 0.5);
        }
      }, 300);
      showWin(state.hasNextLevel, state.steps, state.optimal);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    resizeBgCanvas();
  });
}

function resizeBgCanvas() {
  if (bgCanvas && bgCanvas.parentElement) {
    const rect = bgCanvas.parentElement.getBoundingClientRect();
    bgCanvas.width = rect.width;
    bgCanvas.height = rect.height;
  }
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (type === "down") {
    isDrawing = true;
    audio.playStart();
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitSignal(nx, ny);
    }
  } else if (type === "move" && isDrawing) {
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitRoute(nx, ny);
    }
  } else if (type === "up" && isDrawing) {
    isDrawing = false;
    audio.playRelease();
  }

  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (type === "down") {
    isDrawing = true;
    audio.playStart();
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitSignal(nx, ny);
    }
  } else if (type === "move" && isDrawing) {
    if (renderer) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      renderer.emitRoute(nx, ny);
    }
  } else if (type === "up" && isDrawing) {
    isDrawing = false;
    audio.playRelease();
  }

  game.handleInput(type, x, y);
}

function showWin(hasNextLevel: boolean, steps: number, optimal: number) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = `${i18n.t("game.yourPath")}: ${steps} | ${i18n.t("game.optimal")}: ${optimal}`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        audio.playNextLevel();
        lastPathLength = 0;
        game.nextLevel();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = `${i18n.t("game.yourPath")}: ${steps} | ${i18n.t("game.optimal")}: ${optimal}`;
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        levelDisplay.textContent = "1";
        lastPathLength = 0;
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playNextLevel();
  stepsDisplay.textContent = "0";
  lastPathLength = 0;
  game.start();
}

startBtn.addEventListener("click", startGame);
clearBtn.addEventListener("click", () => {
  audio.playClear();
  lastPathLength = 0;
  game.clearPath();
});
hintBtn.addEventListener("click", () => {
  audio.playHint();
  game.toggleHint();
});
resetBtn.addEventListener("click", () => {
  audio.playReset();
  lastPathLength = 0;
  game.reset();
});

// Init
initI18n();
initGame();
