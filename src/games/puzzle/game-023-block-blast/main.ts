/**
 * Block Blast Main Entry
 * Digital Matrix Theme
 * Game #023
 */
import { BlockBlastGame, type Shape } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type BlockData } from "./webgpu";

// Audio System - Synthesized sounds
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialDecayTo?.(0.01, this.ctx.currentTime + duration) ||
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playPlace() {
    this.init();
    if (!this.ctx) return;
    // Digital placement sound - matrix-like
    this.playTone(400, 0.08, 'square', 0.15);
    setTimeout(() => this.playTone(600, 0.06, 'square', 0.1), 30);
  }

  playClear() {
    this.init();
    if (!this.ctx) return;
    // Line clear - ascending digital sweep
    const freqs = [300, 400, 500, 600, 800];
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.1, 'sawtooth', 0.12), i * 40);
    });
  }

  playCombo(level: number) {
    this.init();
    if (!this.ctx) return;
    // Multi-line combo - harmonics
    const base = 400 + level * 100;
    this.playTone(base, 0.2, 'triangle', 0.2);
    setTimeout(() => this.playTone(base * 1.5, 0.15, 'triangle', 0.15), 50);
    setTimeout(() => this.playTone(base * 2, 0.1, 'sine', 0.1), 100);
  }

  playGameOver() {
    this.init();
    if (!this.ctx) return;
    // Game over - descending tones
    const freqs = [500, 400, 300, 200];
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'sawtooth', 0.15), i * 100);
    });
  }

  playStart() {
    this.init();
    if (!this.ctx) return;
    // Start game - matrix boot
    this.playTone(200, 0.1, 'square', 0.1);
    setTimeout(() => this.playTone(400, 0.1, 'square', 0.15), 80);
    setTimeout(() => this.playTone(600, 0.15, 'sine', 0.2), 160);
  }
}

const audio = new AudioSystem();

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const piecesContainer = document.getElementById("pieces-container")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const scoreDisplay = document.getElementById("score-display")!;
const highScoreDisplay = document.getElementById("high-score-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;

// WebGPU Setup
let webgpuRenderer: WebGPURenderer | null = null;
let webgpuCanvas: HTMLCanvasElement | null = null;
let useWebGPU = false;

async function initWebGPU() {
  const gameArea = document.querySelector('.grid-wrapper');
  if (!gameArea) return;

  webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.className = 'webgpu-overlay';
  webgpuCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
  gameArea.style.position = 'relative';
  gameArea.appendChild(webgpuCanvas);

  const rect = gameArea.getBoundingClientRect();
  webgpuCanvas.width = rect.width * window.devicePixelRatio;
  webgpuCanvas.height = rect.height * window.devicePixelRatio;

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  useWebGPU = await webgpuRenderer.init();

  if (useWebGPU) {
    webgpuRenderer.setGrid(8, 8);
    startWebGPULoop();
  }
}

function startWebGPULoop() {
  if (!webgpuRenderer || !useWebGPU) return;

  let lastTime = 0;
  function loop(time: number) {
    if (!webgpuRenderer || !useWebGPU) return;

    const deltaTime = lastTime ? time - lastTime : 16;
    lastTime = time;

    webgpuRenderer.render(deltaTime);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function resizeWebGPU() {
  if (!webgpuCanvas) return;
  const gameArea = document.querySelector('.grid-wrapper');
  if (!gameArea) return;

  const rect = gameArea.getBoundingClientRect();
  webgpuCanvas.width = rect.width * window.devicePixelRatio;
  webgpuCanvas.height = rect.height * window.devicePixelRatio;
}

let game: BlockBlastGame;

// Drag state
let dragItem: {
  id: number;
  shape: Shape;
  color: string;
  element: HTMLElement;
  offsetX: number;
  offsetY: number;
} | null = null;

let ghostElement: HTMLCanvasElement | null = null;

// Track previous state for WebGPU effects
let previousGrid: number[][] | null = null;

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

// Color palette for blocks (digital matrix theme)
const BLOCK_COLORS = [
  '#00e676', // Bright green
  '#00bfa5', // Teal
  '#00b0ff', // Cyan
  '#76ff03', // Lime
  '#64ffda', // Mint
  '#1de9b6', // Aqua
  '#00c853', // Green
];

function getBlockColor(colorIndex: number): string {
  return BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];
}

function updateWebGPUState(state: any) {
  if (!webgpuRenderer || !useWebGPU) return;

  const gridSize = 8;
  const blocks: BlockData[] = [];

  // Convert grid to BlockData
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cellValue = state.grid[row][col];
      const isFilled = cellValue > 0;

      // Determine if this cell is being cleared
      let cellState = isFilled ? 1 : 0;

      // Get color
      let color: [number, number, number] = [0, 0.9, 0.4]; // Default green
      if (isFilled) {
        const hexColor = getBlockColor(cellValue - 1);
        const rgb = hexToRgbArray(hexColor);
        color = rgb;
      }

      blocks.push({
        x: col / gridSize,
        y: row / gridSize,
        width: 1 / gridSize,
        height: 1 / gridSize,
        color,
        state: cellState,
      });
    }
  }

  webgpuRenderer.updateBlocks(blocks);

  // Detect line clears
  if (previousGrid) {
    const clearedCells: { x: number; y: number; hexColor: string }[] = [];

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (previousGrid[row][col] > 0 && state.grid[row][col] === 0) {
          clearedCells.push({
            x: (col + 0.5) / gridSize,
            y: (row + 0.5) / gridSize,
            hexColor: getBlockColor(previousGrid[row][col] - 1),
          });
        }
      }
    }

    if (clearedCells.length > 0) {
      webgpuRenderer.emitClear(clearedCells);

      // Check for combo (multi-line clear)
      const linesCleared = Math.floor(clearedCells.length / gridSize);
      if (linesCleared > 1) {
        const centerX = clearedCells.reduce((sum, c) => sum + c.x, 0) / clearedCells.length;
        const centerY = clearedCells.reduce((sum, c) => sum + c.y, 0) / clearedCells.length;
        webgpuRenderer.emitCombo(centerX, centerY, linesCleared);
        audio.playCombo(linesCleared);
      } else {
        audio.playClear();
      }
    }
  }

  // Store current grid for next comparison
  previousGrid = state.grid.map((row: number[]) => [...row]);
}

function hexToRgbArray(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [1, 1, 1];
}

function initGame() {
  game = new BlockBlastGame(canvas);

  // Initial resize
  game.resize();
  window.addEventListener("resize", () => {
    game.resize();
    resizeWebGPU();
  });

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    highScoreDisplay.textContent = state.highScore.toString();

    // Update WebGPU
    updateWebGPUState(state);

    renderPieces(state.shapes);

    if (state.status === "gameover") {
      showGameOver();
      audio.playGameOver();
      if (webgpuRenderer) {
        webgpuRenderer.setVictory(1.0);
        setTimeout(() => webgpuRenderer?.setVictory(0), 2000);
      }
    }
  });

  // Global Drag Listeners
  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onDragEnd);
}

function renderPieces(shapes: any[]) {
  piecesContainer.innerHTML = "";
  shapes.forEach((s: any) => {
    const container = document.createElement("div");
    container.className = "piece-container";

    const cvs = document.createElement("canvas");
    cvs.width = 80;
    cvs.height = 80;

    // Draw shape centered
    const ctx = cvs.getContext("2d")!;
    drawShape(ctx, s.shape, s.color, 80, 80);

    container.appendChild(cvs);
    piecesContainer.appendChild(container);

    // Drag Start
    const startDrag = (e: MouseEvent | TouchEvent) => {
      if (dragItem) return;
      e.preventDefault(); // Prevent scroll

      // Get client pos
      let clientX, clientY;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      // Create Ghost
      ghostElement = document.createElement("canvas");
      // Ghost size should match grid scale roughly?
      // Actually, visually matching the grid size on the board feels best.
      // game.tileSize
      const ts = game.tileSize;
      const wStr = s.shape[0].length * ts;
      const hStr = s.shape.length * ts;

      ghostElement.width = wStr;
      ghostElement.height = hStr;
      ghostElement.className = "dragging-ghost";
      const gCtx = ghostElement.getContext("2d")!;

      // Draw scaled shape
      drawShapeRaw(gCtx, s.shape, s.color, ts);

      document.body.appendChild(ghostElement);

      // Center Ghost on finger
      // Offset logic: we grabbed centering the piece container?
      // Usually dragging from center of piece.
      // Center of ghost should be at pointer.

      dragItem = {
        id: s.id,
        shape: s.shape,
        color: s.color,
        element: container,
        offsetX: wStr / 2,
        offsetY: hStr / 2,
      };

      // Hide original
      container.style.opacity = "0";

      updateGhost(clientX, clientY);
    };

    container.addEventListener("mousedown", startDrag);
    container.addEventListener("touchstart", startDrag, { passive: false });
  });
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  color: string,
  w: number,
  h: number
) {
  const rows = shape.length;
  const cols = shape[0].length;
  // Fit into W/H
  const size = Math.min(w / cols, h / rows) * 0.8;

  // Center it
  const startX = (w - cols * size) / 2;
  const startY = (h - rows * size) / 2;

  ctx.fillStyle = color;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape[r][c]) {
        // Main block
        ctx.fillStyle = color;
        ctx.fillRect(startX + c * size, startY + r * size, size - 2, size - 2);

        // Digital glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillRect(startX + c * size, startY + r * size, size - 2, size - 2);
        ctx.shadowBlur = 0;

        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(startX + c * size, startY + r * size, size - 2, (size - 2) / 4);
      }
    }
  }
}

function drawShapeRaw(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  color: string,
  size: number
) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (shape[r][c]) {
        // Main block
        ctx.fillStyle = color;
        ctx.fillRect(c * size, r * size, size - 2, size - 2);

        // Digital glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillRect(c * size, r * size, size - 2, size - 2);
        ctx.shadowBlur = 0;

        // Bevel highlight
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(c * size, r * size, size - 2, (size - 2) / 4);
      }
    }
  }
}

function updateGhost(x: number, y: number) {
  if (!ghostElement || !dragItem) return;
  const top = y - dragItem.offsetY; // Slightly up to see under finger? usually center is fine
  const left = x - dragItem.offsetX; // However, we are placing top-left of shape relative to finger?
  // Let's assume Finger is at Center of Shape.
  // If we want accurate placement, we need to map Finger -> Center Ghost -> TopLeft Ghost -> Grid Check.

  // Ghost Top-Left:
  const gx = x - dragItem.offsetX;
  const gy = y - dragItem.offsetY - 50; // Visual offset: Lift it up so finger doesn't cover

  ghostElement.style.top = `${gy}px`;
  ghostElement.style.left = `${gx}px`;
}

function onDragMove(e: MouseEvent) {
  if (!dragItem) return;
  updateGhost(e.clientX, e.clientY);
}

function onTouchMove(e: TouchEvent) {
  if (!dragItem) return;
  e.preventDefault();
  updateGhost(e.touches[0].clientX, e.touches[0].clientY);
}

function onDragEnd(e: MouseEvent | TouchEvent) {
  if (!dragItem) return;

  // Drop Check
  let clientX, clientY;
  if (e instanceof MouseEvent) {
    // MouseEvent doesn't carry final position in dragend reliably if outside?
    // use client coords
    clientX = e.clientX;
    clientY = e.clientY;
  } else {
    // TouchEnd change touches
    clientX = e.changedTouches[0].clientX;
    clientY = e.changedTouches[0].clientY;
  }

  // Calculate Grid Pos
  const rect = canvas.getBoundingClientRect();

  // Ghost Top-Left (with same offset as in UpdateGhost)
  const gx = clientX - dragItem.offsetX;
  const gy = clientY - dragItem.offsetY - 50;

  // We want to map the Ghost Position to the Grid.
  // But visual offset (-50) makes it tricky. If user looks at where the ghost is, that's where they want to drop.
  // So we use ghost coordinates relative to canvas.
  const canvasX = gx - rect.left;
  const canvasY = gy - rect.top;

  const col = Math.round(canvasX / game.tileSize);
  const row = Math.round(canvasY / game.tileSize);

  // Check if valid
  const success = game.tryPlace(dragItem.id, col, row);

  if (success) {
    // Emit place effect
    if (webgpuRenderer && useWebGPU) {
      const gridSize = 8;
      // Emit particles for each cell of the placed shape
      for (let r = 0; r < dragItem.shape.length; r++) {
        for (let c = 0; c < dragItem.shape[0].length; c++) {
          if (dragItem.shape[r][c]) {
            const px = (col + c + 0.5) / gridSize;
            const py = (row + r + 0.5) / gridSize;
            webgpuRenderer.emitPlace(px, py, dragItem.color);
          }
        }
      }
    }
    audio.playPlace();
  }

  // Cleanup
  if (ghostElement) {
    document.body.removeChild(ghostElement);
    ghostElement = null;
  }

  if (!success) {
    // Return animation? Or just reappear.
    dragItem.element.style.opacity = "1";
  }

  dragItem = null;
}

function showGameOver() {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${
    scoreDisplay.textContent
  }`;
  startBtn.textContent = i18n.t("game.reset");

  startBtn.onclick = () => {
    startGame();
  };
}

function startGame() {
  overlay.style.display = "none";
  previousGrid = null;
  if (webgpuRenderer) {
    webgpuRenderer.clearParticles();
    webgpuRenderer.setVictory(0);
  }
  game.start();
  audio.playStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  startBtn.textContent = i18n.t("game.start");
  startBtn.onclick = startGame;
});

// Init
initI18n();
initGame();
initWebGPU();
