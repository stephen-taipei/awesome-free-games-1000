/**
 * Pipe Puzzle Main Entry
 * Energy Conduit Theme
 * Game #021
 */
import { PipeGame, type PipeType, type Pipe } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type PipeCellData } from "./webgpu";

// ============================================================
// Audio System - Synthesized Energy Sounds
// ============================================================
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init(): boolean {
    if (this.ctx) return true;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  playRotate(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Mechanical rotation with energy hum
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(300, now);
    osc1.frequency.exponentialRampToValueAtTime(450, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(350, now + 0.15);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(600, now);
    osc2.frequency.exponentialRampToValueAtTime(900, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
  }

  playConnect(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Energy connection spark
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(800, now);
    osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
  }

  playComplete(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Energy circuit completion fanfare
    const frequencies = [523, 659, 784, 1047];
    frequencies.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });

    // Power-up hum
    const hum = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();
    hum.type = 'sawtooth';
    hum.frequency.setValueAtTime(100, now);
    hum.frequency.exponentialRampToValueAtTime(200, now + 0.8);
    humGain.gain.setValueAtTime(0.15, now);
    humGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    hum.connect(humGain);
    humGain.connect(this.masterGain);
    hum.start(now);
    hum.stop(now + 0.8);
  }

  playStart(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // System boot sequence
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  playReset(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Power down sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }
}

// ============================================================
// Game State
// ============================================================
const container = document.getElementById("grid-container") as HTMLElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const timeDisplay = document.getElementById("time-display")!;
const levelDisplay = document.getElementById("level-display")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: PipeGame;
let audio: AudioSystem;
let webgpuRenderer: WebGPURenderer | null = null;
let webgpuCanvas: HTMLCanvasElement | null = null;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;
let currentGrid: Pipe[][] = [];
let rotatingCells: Map<string, { startTime: number; startRotation: number; endRotation: number }> = new Map();
let previousActiveState: Map<string, boolean> = new Map();
let victoryTriggered = false;

// ============================================================
// Initialization
// ============================================================
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

async function initWebGPU(): Promise<boolean> {
  const gameArea = document.querySelector('.game-area') as HTMLElement;
  if (!gameArea) return false;

  webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.className = 'webgpu-overlay';
  webgpuCanvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  `;

  const rect = gameArea.getBoundingClientRect();
  webgpuCanvas.width = rect.width * window.devicePixelRatio;
  webgpuCanvas.height = rect.height * window.devicePixelRatio;

  gameArea.style.position = 'relative';
  gameArea.appendChild(webgpuCanvas);

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const success = await webgpuRenderer.init();

  if (!success) {
    webgpuCanvas.remove();
    webgpuCanvas = null;
    webgpuRenderer = null;
    return false;
  }

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    if (webgpuCanvas && webgpuRenderer) {
      const newRect = gameArea.getBoundingClientRect();
      webgpuCanvas.width = newRect.width * window.devicePixelRatio;
      webgpuCanvas.height = newRect.height * window.devicePixelRatio;
    }
  });
  resizeObserver.observe(gameArea);

  return true;
}

function initGame() {
  audio = new AudioSystem();
  game = new PipeGame(container);

  game.setOnStateChange((state: any) => {
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    currentGrid = state.grid;
    renderGrid(state.grid);

    // Check for new connections and emit particles
    if (useWebGPU && webgpuRenderer) {
      checkConnections(state.grid);
    }

    if (state.status === "won" && !victoryTriggered) {
      victoryTriggered = true;
      audio.playComplete();

      if (useWebGPU && webgpuRenderer) {
        webgpuRenderer.setVictory(1.0);
        webgpuRenderer.emitComplete(0.5, 0.5);
      }

      showWin();
    }
  });
}

function checkConnections(grid: Pipe[][]): void {
  if (!webgpuRenderer) return;

  const rows = grid.length;
  const cols = grid[0].length;

  grid.forEach((row, rowIdx) => {
    row.forEach((pipe, colIdx) => {
      const key = `${colIdx},${rowIdx}`;
      const wasActive = previousActiveState.get(key) || false;

      if (pipe.active && !wasActive) {
        // New connection established
        const cellWidth = 1.0 / cols;
        const cellHeight = 1.0 / rows;
        const centerX = (colIdx + 0.5) * cellWidth;
        const centerY = (rowIdx + 0.5) * cellHeight;

        webgpuRenderer!.emitConnect(centerX, centerY);
        audio.playConnect();

        // Emit flow particles to connected neighbors
        emitFlowToNeighbors(pipe, colIdx, rowIdx, cols, rows);
      }

      previousActiveState.set(key, pipe.active);
    });
  });
}

function emitFlowToNeighbors(pipe: Pipe, col: number, row: number, cols: number, rows: number): void {
  if (!webgpuRenderer) return;

  const cellWidth = 1.0 / cols;
  const cellHeight = 1.0 / rows;
  const fromX = (col + 0.5) * cellWidth;
  const fromY = (row + 0.5) * cellHeight;

  // Based on rotation and connections, emit flow particles
  const dirs = [
    { dx: 0, dy: -1 }, // Top
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: 1 },  // Bottom
    { dx: -1, dy: 0 }, // Left
  ];

  dirs.forEach((dir) => {
    const nx = col + dir.dx;
    const ny = row + dir.dy;
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
      const toX = (nx + 0.5) * cellWidth;
      const toY = (ny + 0.5) * cellHeight;
      if (Math.random() > 0.5) {
        webgpuRenderer!.emitFlow(fromX, fromY, toX, toY);
      }
    }
  });
}

function renderGrid(grid: Pipe[][]) {
  const rows = grid.length;
  const cols = grid[0].length;

  if (container.style.gridTemplateColumns === "") {
    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  }

  // Update WebGPU grid info
  if (useWebGPU && webgpuRenderer) {
    webgpuRenderer.setGrid(cols, rows);
  }

  if (container.children.length === 0) {
    grid.forEach((row) => {
      row.forEach((p) => {
        const cell = document.createElement("div");
        cell.className = "pipe-cell";
        cell.dataset.x = p.x.toString();
        cell.dataset.y = p.y.toString();

        cell.addEventListener("click", () => handlePipeClick(p.x, p.y));
        container.appendChild(cell);
      });
    });
  }

  const cells = Array.from(container.children) as HTMLElement[];
  let idx = 0;

  grid.forEach((row) => {
    row.forEach((p) => {
      const cell = cells[idx++];
      const svg = getPipeSVG(p.type, p.active);

      const prevType = cell.dataset.type;
      const prevActive = cell.dataset.active;

      if (
        prevType !== p.type ||
        prevActive !== String(p.active) ||
        cell.innerHTML === ""
      ) {
        cell.innerHTML = svg;
        cell.dataset.type = p.type;
        cell.dataset.active = String(p.active);
      }

      cell.style.transform = `rotate(${p.rotation}deg)`;

      if (p.active) {
        cell.classList.add("pipe-active");
        cell.classList.remove("pipe-default");
      } else {
        cell.classList.add("pipe-default");
        cell.classList.remove("pipe-active");
      }
    });
  });

  // Update WebGPU pipe data
  if (useWebGPU && webgpuRenderer) {
    updateWebGPUPipes(grid);
  }
}

function handlePipeClick(x: number, y: number): void {
  audio.playRotate();

  if (useWebGPU && webgpuRenderer && currentGrid.length > 0) {
    const rows = currentGrid.length;
    const cols = currentGrid[0].length;
    const cellWidth = 1.0 / cols;
    const cellHeight = 1.0 / rows;
    const centerX = (x + 0.5) * cellWidth;
    const centerY = (y + 0.5) * cellHeight;

    webgpuRenderer.emitRotate(centerX, centerY);

    // Track rotation animation
    const key = `${x},${y}`;
    const pipe = currentGrid[y]?.[x];
    if (pipe) {
      rotatingCells.set(key, {
        startTime: performance.now(),
        startRotation: pipe.rotation,
        endRotation: pipe.rotation + 90,
      });
    }
  }

  game.rotatePipe(x, y);
}

function updateWebGPUPipes(grid: Pipe[][]): void {
  if (!webgpuRenderer) return;

  const rows = grid.length;
  const cols = grid[0].length;
  const cellWidth = 1.0 / cols;
  const cellHeight = 1.0 / rows;

  const pipeTypeMap: Record<PipeType, number> = {
    'empty': 0,
    'straight': 1,
    'elbow': 2,
    't': 3,
    'cross': 4,
    'start': 5,
    'end': 6,
  };

  const pipes: PipeCellData[] = [];
  const now = performance.now();

  grid.forEach((row, rowIdx) => {
    row.forEach((pipe, colIdx) => {
      const key = `${colIdx},${rowIdx}`;
      const rotAnim = rotatingCells.get(key);
      let rotateAnimValue = 0;

      if (rotAnim) {
        const elapsed = now - rotAnim.startTime;
        const duration = 200; // 200ms rotation
        if (elapsed < duration) {
          rotateAnimValue = elapsed / duration;
        } else {
          rotatingCells.delete(key);
        }
      }

      pipes.push({
        x: colIdx * cellWidth,
        y: rowIdx * cellHeight,
        width: cellWidth,
        height: cellHeight,
        pipeType: pipeTypeMap[pipe.type] || 0,
        rotation: pipe.rotation * (Math.PI / 180),
        active: pipe.active,
        rotateAnim: rotateAnimValue,
      });
    });
  });

  webgpuRenderer.updatePipes(pipes);
}

function getPipeSVG(type: PipeType, active: boolean): string {
  let d = "";

  switch (type) {
    case "straight":
      d = "M50,0 L50,100";
      break;
    case "elbow":
      d = "M50,0 L50,50 L100,50";
      break;
    case "t":
      d = "M50,0 L50,50 L100,50 M50,50 L50,100";
      break;
    case "cross":
      d = "M50,0 L50,100 M0,50 L100,50";
      break;
    case "start":
      d = "M20,50 L100,50";
      break;
    case "end":
      d = "M0,50 L80,50";
      break;
    case "empty":
      return "";
  }

  let extra = "";
  if (type === "start")
    extra = '<circle cx="35" cy="50" r="15" class="start-marker" />';
  if (type === "end")
    extra = '<rect x="65" y="35" width="30" height="30" class="end-marker" />';

  return `<svg class="pipe-svg" viewBox="0 0 100 100">
    <path d="${d}" />
    ${extra}
  </svg>`;
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.time")}: ${timeDisplay.textContent}`;
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame();
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playStart();
  victoryTriggered = false;
  previousActiveState.clear();
  rotatingCells.clear();

  if (useWebGPU && webgpuRenderer) {
    webgpuRenderer.setVictory(0);
    webgpuRenderer.clearParticles();
  }

  game.start();

  if (useWebGPU && !animationId) {
    lastTime = performance.now();
    animate();
  }
}

function animate(): void {
  if (!useWebGPU || !webgpuRenderer) return;

  const now = performance.now();
  const deltaTime = now - lastTime;
  lastTime = now;

  // Update pipe data for animations
  if (currentGrid.length > 0) {
    updateWebGPUPipes(currentGrid);
  }

  webgpuRenderer.render(deltaTime);
  animationId = requestAnimationFrame(animate);
}

// ============================================================
// Event Listeners
// ============================================================
startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  audio.playReset();
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.textContent = i18n.t("game.start");
  startBtn.onclick = startGame;

  if (useWebGPU && webgpuRenderer) {
    webgpuRenderer.setVictory(0);
    webgpuRenderer.clearParticles();
  }
});

// ============================================================
// Initialize
// ============================================================
async function init() {
  initI18n();

  // Try WebGPU
  useWebGPU = await initWebGPU();
  if (useWebGPU) {
    console.log('Pipe Puzzle: WebGPU enabled');
  }

  initGame();
}

init();
