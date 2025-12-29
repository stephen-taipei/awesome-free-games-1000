/**
 * Nonogram Main Entry - WebGPU Enhanced
 * Digital Blueprint Theme
 * Game #013
 */
import { NonogramGame, type GameState, type CellState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type CellData } from "./webgpu/renderer";

// =====================
// Audio System
// =====================
class AudioSystem {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3,
    attack = 0.01,
    decay = 0.1
  ): void {
    if (!this.ctx || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + attack);
    gain.gain.linearRampToValueAtTime(volume * 0.7, this.ctx.currentTime + attack + decay);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Fill cell - digital blip
  playFill(): void {
    this.playTone(800, 0.06, 'square', 0.15);
    setTimeout(() => this.playTone(1000, 0.04, 'sine', 0.1), 30);
  }

  // Mark cell (X)
  playMark(): void {
    this.playTone(300, 0.08, 'triangle', 0.12);
  }

  // Clear cell
  playClear(): void {
    this.playTone(400, 0.05, 'sine', 0.1);
  }

  // Invalid action
  playInvalid(): void {
    this.playTone(150, 0.15, 'sawtooth', 0.12);
  }

  // Check - wrong answer
  playError(): void {
    const notes = [300, 200, 150];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.12, 'square', 0.15);
      }, i * 80);
    });
  }

  // Puzzle complete - triumphant fanfare
  playComplete(): void {
    const melody = [523, 659, 784, 1047];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sine', 0.2);
        this.playTone(freq * 1.5, 0.3, 'sine', 0.1);
      }, i * 150);
    });

    // Final chord
    setTimeout(() => {
      this.playTone(523, 0.5, 'sine', 0.15);
      this.playTone(659, 0.5, 'sine', 0.12);
      this.playTone(784, 0.5, 'sine', 0.1);
      this.playTone(1047, 0.5, 'sine', 0.08);
    }, 600);
  }

  // Row/column complete hint
  playHintComplete(): void {
    this.playTone(600, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(800, 0.08, 'sine', 0.08), 40);
  }

  // Reset
  playReset(): void {
    const notes = [600, 500, 400];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.08, 'sine', 0.1);
      }, i * 40);
    });
  }
}

// =====================
// Elements
// =====================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelSelect = document.getElementById("level-select") as HTMLSelectElement;

const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const checkBtn = document.getElementById("check-btn")!;
const switchModeBtn = document.getElementById("switch-mode-btn")!;

// =====================
// Global Variables
// =====================
let game: NonogramGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;

let inputMode: "fill" | "mark" = "fill";
let isVictory = false;
let victoryAnimProgress = 0;
let lastCellStates: Map<string, number> = new Map();

// =====================
// Initialization
// =====================
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
    if (key) {
      if (key === "game.modeFill")
        el.textContent =
          inputMode === "fill"
            ? i18n.t("game.modeFill")
            : i18n.t("game.modeMark");
      else el.textContent = i18n.t(key);
    }
  });
}

async function initRenderer(): Promise<void> {
  renderer = new WebGPURenderer(canvas);
  useWebGPU = await renderer.init();

  if (useWebGPU) {
    console.log('WebGPU renderer initialized');
  } else {
    console.log('Falling back to Canvas 2D');
    renderer = null;
  }
}

function initGame() {
  game = new NonogramGame(canvas);

  game.setOnStateChange((state: GameState) => {
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    if (state.status === "won" && !isVictory) {
      isVictory = true;
      victoryAnimProgress = 0;
      audio.playComplete();

      if (renderer) {
        renderer.emitComplete(0.5, 0.5);
      }

      setTimeout(() => {
        showWin();
      }, 1500);
    }
  });
}

// =====================
// Game Flow
// =====================
function startGame() {
  overlay.style.display = "none";
  const lvl = parseInt(levelSelect.value, 10);
  game.startLevel(lvl);

  isVictory = false;
  victoryAnimProgress = 0;
  lastCellStates.clear();

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0, 0.5, 0.5);
  }

  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

function showWin() {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");
  overlayMsg.textContent =
    i18n.t("game.time") + ": " + timeDisplay.textContent;
  startBtn.textContent = i18n.t("game.start");

  startBtn.onclick = () => {
    startGame();
  };
}

// =====================
// Game Loop
// =====================
function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // Update victory animation
  if (isVictory && victoryAnimProgress < 1) {
    victoryAnimProgress = Math.min(1, victoryAnimProgress + deltaTime * 0.001);
    if (renderer) {
      renderer.setVictory(victoryAnimProgress, 0.5, 0.5);
    }
  }

  // WebGPU rendering
  if (renderer && useWebGPU) {
    const { cells, gridOffsetX, gridOffsetY, cellSize, rows, cols } = getGameDataForRenderer();

    renderer.setGridLayout(gridOffsetX, gridOffsetY, cellSize, rows, cols);
    renderer.updateCells(cells);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// Get game data for WebGPU renderer
function getGameDataForRenderer(): {
  cells: CellData[];
  gridOffsetX: number;
  gridOffsetY: number;
  cellSize: number;
  rows: number;
  cols: number;
} {
  const gameAny = game as any;
  const currentLevel = gameAny.currentLevel;
  const userGrid = gameAny.userGrid as CellState[];
  const hintSize = gameAny.hintSize as number;
  const cellSize = gameAny.cellSize as number;

  if (!currentLevel) {
    return { cells: [], gridOffsetX: 0, gridOffsetY: 0, cellSize: 0, rows: 0, cols: 0 };
  }

  const rows = currentLevel.rows;
  const cols = currentLevel.cols;

  const cells: CellData[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      cells.push({
        col: c,
        row: r,
        state: userGrid[idx],
        highlight: 0,
      });
    }
  }

  return {
    cells,
    gridOffsetX: hintSize,
    gridOffsetY: hintSize,
    cellSize,
    rows,
    cols,
  };
}

// =====================
// Input Handling
// =====================
function getPos(e: MouseEvent | TouchEvent) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (window.TouchEvent && e instanceof TouchEvent) {
    if (e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else return null;
  } else if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else return null;

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function handleCellChange(x: number, y: number, isRight: boolean, isDrag: boolean) {
  const gameAny = game as any;
  const currentLevel = gameAny.currentLevel;
  if (!currentLevel) return;

  const hintSize = gameAny.hintSize;
  const cellSize = gameAny.cellSize;
  const userGrid = gameAny.userGrid as CellState[];

  const gridX = x - hintSize;
  const gridY = y - hintSize;

  if (gridX < 0 || gridY < 0) return;

  const c = Math.floor(gridX / cellSize);
  const r = Math.floor(gridY / cellSize);

  if (c >= 0 && c < currentLevel.cols && r >= 0 && r < currentLevel.rows) {
    const idx = r * currentLevel.cols + c;
    const key = `${r}-${c}`;
    const oldState = lastCellStates.get(key) ?? 0;
    const newState = userGrid[idx];

    if (newState !== oldState && !isDrag) {
      // Emit particle effect at cell center
      if (renderer) {
        const w = canvas.width;
        const h = canvas.height;
        const normX = (hintSize + c * cellSize + cellSize / 2) / w;
        const normY = (hintSize + r * cellSize + cellSize / 2) / h;

        if (newState === 1) {
          renderer.emitFill(normX, normY);
          audio.playFill();
        } else if (newState === 2) {
          renderer.emitMark(normX, normY);
          audio.playMark();
        } else {
          renderer.emitClear(normX, normY);
          audio.playClear();
        }
      } else {
        if (newState === 1) audio.playFill();
        else if (newState === 2) audio.playMark();
        else audio.playClear();
      }

      lastCellStates.set(key, newState);
    }
  }
}

canvas.addEventListener("mousedown", (e) => {
  e.preventDefault();
  const pos = getPos(e);
  if (pos) {
    const isRight = e.button === 2 || inputMode === "mark";
    game.handleInput(pos.x, pos.y, isRight, false);
    handleCellChange(pos.x, pos.y, isRight, false);
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (e.buttons === 0) return;
  const pos = getPos(e);
  if (pos) {
    const isRight = e.buttons === 2 || inputMode === "mark";
    game.handleInput(pos.x, pos.y, isRight, true);
    handleCellChange(pos.x, pos.y, isRight, true);
  }
});

canvas.addEventListener("mouseup", () => game.endDrag());
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// Touch
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) {
      const isRight = inputMode === "mark";
      game.handleInput(pos.x, pos.y, isRight, false);
      handleCellChange(pos.x, pos.y, isRight, false);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) {
      const isRight = inputMode === "mark";
      game.handleInput(pos.x, pos.y, isRight, true);
      handleCellChange(pos.x, pos.y, isRight, true);
    }
  },
  { passive: false }
);

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  game.endDrag();
});

startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
  lastCellStates.clear();

  if (renderer) {
    renderer.clearParticles();
    const normCenterX = 0.5;
    const normCenterY = 0.5;
    // Subtle reset effect
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        renderer?.emitClear(normCenterX + (Math.random() - 0.5) * 0.2, normCenterY + (Math.random() - 0.5) * 0.2);
      }, i * 50);
    }
  }
});

checkBtn.addEventListener("click", () => {
  // Override the alert with custom handling
  const gameAny = game as any;
  const currentLevel = gameAny.currentLevel;
  const userGrid = gameAny.userGrid;

  if (!currentLevel) return;

  let correct = true;
  for (let i = 0; i < userGrid.length; i++) {
    const user = userGrid[i] === 1 ? 1 : 0;
    const sol = currentLevel.data[i];
    if (user !== sol) {
      correct = false;
      break;
    }
  }

  if (correct) {
    gameAny.status = "won";
    if (gameAny.timerInterval) clearInterval(gameAny.timerInterval);
    gameAny.notifyChange();
  } else {
    audio.playError();
    if (renderer) {
      renderer.emitError(0.5, 0.5);
    }
    // Shake animation via CSS
    canvas.classList.add('shake');
    setTimeout(() => canvas.classList.remove('shake'), 300);
  }
});

switchModeBtn.addEventListener("click", () => {
  inputMode = inputMode === "fill" ? "mark" : "fill";
  updateTexts();
});

levelSelect.addEventListener("change", () => {
  startGame();
});

// =====================
// Sound Toggle
// =====================
function createSoundToggle(): void {
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  const btn = document.createElement('button');
  btn.className = 'sound-toggle';
  btn.innerHTML = '🔊';
  btn.title = 'Toggle Sound';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const enabled = !audio.isEnabled();
    audio.setEnabled(enabled);
    btn.innerHTML = enabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !enabled);
  });

  gameArea.appendChild(btn);
}

// =====================
// Main
// =====================
async function main() {
  initI18n();

  // Init audio system
  audio = new AudioSystem();

  // Init audio on user interaction
  const initAudioOnInteraction = async () => {
    await audio.init();
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('touchstart', initAudioOnInteraction);
  };
  document.addEventListener('click', initAudioOnInteraction);
  document.addEventListener('touchstart', initAudioOnInteraction);

  // Init renderer
  await initRenderer();

  // Init game
  initGame();

  // Create sound toggle
  createSoundToggle();
}

main();
