/**
 * Maze Main Entry
 * Game #020
 * Neural Circuit Theme - WebGPU Enhanced
 */
import { MazeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type WallSegment, type MazeData } from "./webgpu";

// ============== Audio System ==============
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    opts?: { attack?: number; decay?: number; freqEnd?: number }
  ) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    if (opts?.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(
        opts.freqEnd,
        this.ctx.currentTime + duration
      );
    }

    const attack = opts?.attack ?? 0.01;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + attack);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Move sound - neural signal
  playMove() {
    this.playTone(600, 0.08, "sine", { freqEnd: 800 });
    setTimeout(() => this.playTone(800, 0.05, "triangle"), 40);
  }

  // Wall bump - error pulse
  playBump() {
    this.playTone(150, 0.15, "sawtooth", { freqEnd: 80 });
    setTimeout(() => this.playTone(100, 0.1, "square", { freqEnd: 50 }), 80);
  }

  // Maze complete - circuit activated
  playComplete() {
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.35, "sine");
        this.playTone(freq * 1.5, 0.25, "triangle");
      }, i * 80);
    });
  }

  // Game start - system boot
  playStart() {
    this.playTone(200, 0.25, "sine", { freqEnd: 600 });
    setTimeout(() => this.playTone(400, 0.2, "triangle", { freqEnd: 1000 }), 150);
    setTimeout(() => this.playTone(600, 0.15, "sine"), 300);
  }

  // Reset sound
  playReset() {
    this.playTone(500, 0.1, "sine", { freqEnd: 200 });
    setTimeout(() => this.playTone(300, 0.12, "sine", { freqEnd: 100 }), 80);
  }
}

const audio = new AudioSystem();

// ============== Elements ==============
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const timeDisplay = document.getElementById("time-display")!;
const levelDisplay = document.getElementById("level-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const diffRadios = document.querySelectorAll('input[name="difficulty"]');

// Mobile Controls
const upBtn = document.getElementById("up-btn")!;
const downBtn = document.getElementById("down-btn")!;
const leftBtn = document.getElementById("left-btn")!;
const rightBtn = document.getElementById("right-btn")!;

let game: MazeGame;
let difficulty = 10; // Default Easy

// ============== WebGPU Renderer ==============
let gpuRenderer: WebGPURenderer | null = null;
let gpuCanvas: HTMLCanvasElement | null = null;
let animationId: number | null = null;
let lastTime = 0;

async function initWebGPU() {
  const gameArea = canvas.parentElement;
  if (!gameArea) return;

  gpuCanvas = document.createElement("canvas");
  gpuCanvas.className = "webgpu-overlay";
  gpuCanvas.width = canvas.width || 600;
  gpuCanvas.height = canvas.height || 600;
  gameArea.appendChild(gpuCanvas);

  gpuRenderer = new WebGPURenderer(gpuCanvas);
  const success = await gpuRenderer.init();

  if (!success) {
    console.log("WebGPU not available, using Canvas 2D fallback");
    gpuCanvas.remove();
    gpuRenderer = null;
    return;
  }

  startRenderLoop();
}

function startRenderLoop() {
  if (animationId) cancelAnimationFrame(animationId);

  function render(time: number) {
    const deltaTime = time - lastTime;
    lastTime = time;

    if (gpuRenderer) gpuRenderer.render(deltaTime);

    animationId = requestAnimationFrame(render);
  }

  animationId = requestAnimationFrame(render);
}

function resizeWebGPUCanvas() {
  if (!gpuCanvas) return;

  gpuCanvas.width = canvas.width;
  gpuCanvas.height = canvas.height;
}

function updateMazeForWebGPU() {
  if (!gpuRenderer) return;

  // Access game internals to extract wall data
  const gameAny = game as any;
  const cells = gameAny.cells;
  const cellSize = gameAny.cellSize;
  const cols = gameAny.cols;
  const rows = gameAny.rows;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  if (!cells || !cells.length) return;

  const walls: WallSegment[] = [];

  // Convert cell walls to line segments in normalized coordinates
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = cells[y][x];
      const cx = x * cellSize;
      const cy = y * cellSize;

      // Normalize to 0-1 range
      const nx1 = cx / canvasWidth;
      const ny1 = cy / canvasHeight;
      const nx2 = (cx + cellSize) / canvasWidth;
      const ny2 = (cy + cellSize) / canvasHeight;

      if (cell.walls.top) {
        walls.push({ x1: nx1, y1: ny1, x2: nx2, y2: ny1, intensity: 1.0 });
      }
      if (cell.walls.right) {
        walls.push({ x1: nx2, y1: ny1, x2: nx2, y2: ny2, intensity: 1.0 });
      }
      if (cell.walls.bottom) {
        walls.push({ x1: nx2, y1: ny2, x2: nx1, y2: ny2, intensity: 1.0 });
      }
      if (cell.walls.left) {
        walls.push({ x1: nx1, y1: ny2, x2: nx1, y2: ny1, intensity: 1.0 });
      }
    }
  }

  const mazeData: MazeData = {
    cellSize,
    cols,
    rows,
    walls,
  };

  gpuRenderer.updateMaze(mazeData);

  // Set exit position
  const exitX = (cols - 0.5) * cellSize / canvasWidth;
  const exitY = (rows - 0.5) * cellSize / canvasHeight;
  const radius = (cellSize / 3) / canvasWidth;
  gpuRenderer.setExit(exitX, exitY, radius);
}

function updatePlayerForWebGPU() {
  if (!gpuRenderer) return;

  const gameAny = game as any;
  const player = gameAny.player;
  const cellSize = gameAny.cellSize;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  if (!player) return;

  const px = (player.x + 0.5) * cellSize / canvasWidth;
  const py = (player.y + 0.5) * cellSize / canvasHeight;
  const radius = (cellSize / 3) / canvasWidth;

  gpuRenderer.setPlayer(px, py, radius);
}

function clearWebGPUState() {
  if (gpuRenderer) {
    gpuRenderer.clearParticles();
    gpuRenderer.setVictory(0);
  }
}

// ============== i18n ==============
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

// ============== Game ==============
function initGame() {
  game = new MazeGame(canvas);

  game.setOnStateChange((state: any) => {
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    // Update player position in WebGPU renderer
    updatePlayerForWebGPU();

    if (state.status === "won") {
      showWin();
    }
  });
}

function showWin() {
  audio.playComplete();

  // Trigger victory effect
  if (gpuRenderer) {
    const gameAny = game as any;
    const cellSize = gameAny.cellSize;
    const cols = gameAny.cols;
    const rows = gameAny.rows;

    const exitX = (cols - 0.5) * cellSize / canvas.width;
    const exitY = (rows - 0.5) * cellSize / canvas.height;

    gpuRenderer.emitComplete(exitX, exitY);
    gpuRenderer.setVictory(1.0);
  }

  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.time")}: ${
      timeDisplay.textContent
    }`;
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 1000);
}

function startGame() {
  overlay.style.display = "none";

  // Get difficulty
  diffRadios.forEach((r) => {
    if ((r as HTMLInputElement).checked) {
      difficulty = parseInt((r as HTMLInputElement).value, 10);
    }
  });

  game.start(difficulty);
  levelDisplay.textContent = difficulty === 10 ? "Easy" : "Hard";

  // Update WebGPU after maze is generated
  resizeWebGPUCanvas();
  clearWebGPUState();

  setTimeout(() => {
    updateMazeForWebGPU();
    updatePlayerForWebGPU();
  }, 50);

  audio.playStart();
}

// ============== Movement Handling ==============
let lastMoveDirection = "";

function handleMove(dir: "up" | "down" | "left" | "right") {
  const gameAny = game as any;
  const oldX = gameAny.player?.x ?? 0;
  const oldY = gameAny.player?.y ?? 0;

  game.move(dir);

  const newX = gameAny.player?.x ?? 0;
  const newY = gameAny.player?.y ?? 0;

  const moved = oldX !== newX || oldY !== newY;

  if (moved) {
    audio.playMove();
    lastMoveDirection = dir;

    // Emit trail particles
    if (gpuRenderer) {
      const cellSize = gameAny.cellSize;
      const px = (newX + 0.5) * cellSize / canvas.width;
      const py = (newY + 0.5) * cellSize / canvas.height;
      gpuRenderer.emitTrail(px, py, dir);
    }
  } else {
    // Wall bump
    audio.playBump();

    if (gpuRenderer) {
      const cellSize = gameAny.cellSize;
      const px = (oldX + 0.5) * cellSize / canvas.width;
      const py = (oldY + 0.5) * cellSize / canvas.height;
      gpuRenderer.emitBump(px, py, dir);
    }
  }
}

// ============== Input Handlers ==============
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      handleMove("up");
      e.preventDefault();
      break;
    case "ArrowDown":
    case "s":
    case "S":
      handleMove("down");
      e.preventDefault();
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      handleMove("left");
      e.preventDefault();
      break;
    case "ArrowRight":
    case "d":
    case "D":
      handleMove("right");
      e.preventDefault();
      break;
  }
});

// Mobile Buttons
upBtn?.addEventListener("click", () => handleMove("up"));
downBtn?.addEventListener("click", () => handleMove("down"));
leftBtn?.addEventListener("click", () => handleMove("left"));
rightBtn?.addEventListener("click", () => handleMove("right"));

// Touch support for mobile buttons
upBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); handleMove("up"); }, { passive: false });
downBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); handleMove("down"); }, { passive: false });
leftBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); handleMove("left"); }, { passive: false });
rightBtn?.addEventListener("touchstart", (e) => { e.preventDefault(); handleMove("right"); }, { passive: false });

// Prevent double tap zoom
document.addEventListener(
  "dblclick",
  function (event) {
    event.preventDefault();
  },
  { passive: false }
);

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  clearWebGPUState();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.onclick = startGame;
});

// ============== Init ==============
initI18n();
initGame();
initWebGPU();
