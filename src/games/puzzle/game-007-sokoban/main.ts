/**
 * Sokoban Main Entry - WebGPU 3D Edition
 * Game #007
 *
 * Features:
 * - WebGPU 3D isometric view
 * - Animated player and boxes
 * - Particle effects for push, target, victory
 * - Synthesized audio feedback
 * - Cyberpunk neon aesthetic
 */
import { SokobanGame } from "./game";
import { LEVELS } from "./levels";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// ============================================================================
// Audio System - Web Audio API 合成音效
// ============================================================================
class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;

  async init(): Promise<void> {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine',
                   attack = 0.01, decay = 0.1, volume = 0.5): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume = 0.1): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 1500;

    source.buffer = buffer;
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start();
  }

  // 移動音效
  playMove(): void {
    this.playTone(220, 0.08, 'sine', 0.01, 0.04, 0.2);
    this.playNoise(0.05, 0.08);
  }

  // 推箱子音效
  playPush(): void {
    this.playTone(150, 0.15, 'triangle', 0.01, 0.1, 0.3);
    this.playNoise(0.1, 0.15);
    this.playTone(180, 0.1, 'sine', 0.05, 0.05, 0.2);
  }

  // 箱子到達目標
  playTargetReached(): void {
    this.playTone(523, 0.15, 'sine', 0.01, 0.1, 0.4);
    this.playTone(659, 0.15, 'sine', 0.05, 0.1, 0.3);
    this.playTone(784, 0.2, 'sine', 0.1, 0.1, 0.3);
  }

  // 箱子離開目標
  playTargetLeft(): void {
    this.playTone(440, 0.1, 'sine', 0.01, 0.05, 0.2);
    this.playTone(330, 0.12, 'sine', 0.03, 0.06, 0.15);
  }

  // 撞牆音效
  playBlocked(): void {
    this.playTone(100, 0.1, 'square', 0.01, 0.05, 0.15);
    this.playNoise(0.08, 0.1);
  }

  // 撤銷音效
  playUndo(): void {
    this.playTone(300, 0.08, 'sine', 0.01, 0.04, 0.2);
    this.playTone(250, 0.08, 'sine', 0.02, 0.04, 0.15);
  }

  // 重置音效
  playReset(): void {
    this.playTone(200, 0.1, 'triangle', 0.01, 0.05, 0.2);
    setTimeout(() => this.playTone(300, 0.1, 'triangle', 0.01, 0.05, 0.2), 80);
    setTimeout(() => this.playTone(400, 0.15, 'triangle', 0.01, 0.08, 0.25), 160);
  }

  // 勝利音效
  playVictory(): void {
    const notes = [523, 587, 659, 784, 880, 1047]; // C5 to C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sine', 0.02, 0.15, 0.4);
        this.playTone(freq * 1.5, 0.25, 'triangle', 0.05, 0.12, 0.2);
      }, i * 100);
    });

    // 閃爍音效
    setTimeout(() => {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          this.playTone(1500 + Math.random() * 1500, 0.08, 'sine', 0.01, 0.04, 0.15);
        }, i * 60);
      }
    }, 600);
  }

  // 下一關音效
  playNextLevel(): void {
    this.playTone(440, 0.12, 'sine', 0.02, 0.08, 0.3);
    setTimeout(() => this.playTone(550, 0.12, 'sine', 0.02, 0.08, 0.3), 100);
    setTimeout(() => this.playTone(660, 0.15, 'sine', 0.02, 0.1, 0.35), 200);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

// ============================================================================
// DOM Elements
// ============================================================================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const undoBtn = document.getElementById("undo-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextLevelBtn = document.getElementById("next-level-btn")!;
const prevLevelBtn = document.getElementById("prev-level")!;
const nextLevelNav = document.getElementById("next-level")!;
const levelDisplay = document.getElementById("level-display")!;
const movesCounter = document.getElementById("moves-counter")!;
const gameOverlay = document.getElementById("game-overlay")!;

// ============================================================================
// Game State
// ============================================================================
let game: SokobanGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let animationFrameId: number | null = null;
let lastTime = 0;
let useWebGPU = false;

// Player animation
let playerBobPhase = 0;
let playerDirection = 2; // 0=up, 1=right, 2=down, 3=left

// Track box states for effects
let previousBoxPositions: Map<string, { x: number; y: number; onTarget: boolean }> = new Map();

// ============================================================================
// Initialization
// ============================================================================
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
  if (game) updateUI();
}

function updateUI() {
  levelDisplay.textContent = i18n
    .t("game.level")
    .replace("{n}", (game.getLevelIndex() + 1).toString());
}

async function initWebGPU(): Promise<boolean> {
  if (!navigator.gpu) {
    console.warn('WebGPU not supported');
    return false;
  }

  try {
    renderer = new WebGPURenderer(canvas);
    const success = await renderer.init();
    return success;
  } catch (e) {
    console.warn('WebGPU init failed:', e);
    renderer = null;
    return false;
  }
}

// ============================================================================
// Game Logic
// ============================================================================
function initGame() {
  game = new SokobanGame(canvas);

  game.setOnStateChange((state) => {
    movesCounter.textContent = `${i18n.t("game.moves")}: ${state.moves}`;
    updateUI();

    if (state.status === "won") {
      gameOverlay.style.display = "flex";
      audio.playVictory();
      if (useWebGPU && renderer) {
        renderer.setVictory(true);
      }
    } else {
      gameOverlay.style.display = "none";
      if (useWebGPU && renderer) {
        renderer.setVictory(false);
      }
    }
  });

  loadLevel(0);
}

function loadLevel(index: number) {
  if (index < 0 || index >= LEVELS.length) return;

  game.loadLevel(index);

  if (useWebGPU && renderer) {
    // Parse level for WebGPU renderer
    const levelData = LEVELS[index];
    const rows = levelData.map;
    const height = rows.length;
    const width = rows.reduce((max, row) => Math.max(max, row.length), 0);

    const grid: number[][] = [];
    const boxes: { x: number; y: number; onTarget: boolean }[] = [];
    let playerX = 0, playerY = 0;

    for (let y = 0; y < height; y++) {
      const gridRow: number[] = [];
      const str = rows[y];
      for (let x = 0; x < width; x++) {
        const char = str[x] || ' ';
        let tile = 0;

        if (char === '#') tile = 1;
        else if (char === '.') tile = 2;
        else if (char === '+') {
          tile = 2;
          playerX = x;
          playerY = y;
        } else if (char === '*') {
          tile = 2;
          boxes.push({ x, y, onTarget: true });
        } else if (char === '@') {
          playerX = x;
          playerY = y;
        } else if (char === '$') {
          boxes.push({ x, y, onTarget: false });
        }

        gridRow.push(tile);
      }
      grid.push(gridRow);
    }

    renderer.setGrid(width, height, grid);
    renderer.updateBoxes(boxes);
    renderer.updatePlayer(playerX, playerY, playerDirection, playerBobPhase);

    // Track box positions
    previousBoxPositions.clear();
    boxes.forEach((b, i) => {
      previousBoxPositions.set(`${i}`, { ...b });
    });
  }

  audio.playNextLevel();
}

function move(dx: number, dy: number) {
  audio.resume();

  // Get current state before move
  const beforeState = getGameState();

  game.move(dx, dy);

  // Get state after move
  const afterState = getGameState();

  // Check if move happened
  if (beforeState.playerX === afterState.playerX && beforeState.playerY === afterState.playerY) {
    // Move blocked
    audio.playBlocked();
    if (useWebGPU && renderer) {
      renderer.emitBlocked(afterState.playerX, afterState.playerY, dx, dy);
    }
    return;
  }

  // Update direction
  if (dy < 0) playerDirection = 0;
  else if (dx > 0) playerDirection = 1;
  else if (dy > 0) playerDirection = 2;
  else if (dx < 0) playerDirection = 3;

  // Update bob phase
  playerBobPhase += 0.5;

  // Check if box was pushed
  const boxPushed = afterState.boxes.some((newBox, i) => {
    const oldBox = beforeState.boxes[i];
    return oldBox && (newBox.x !== oldBox.x || newBox.y !== oldBox.y);
  });

  if (boxPushed) {
    audio.playPush();

    // Find which box was pushed and check target state
    afterState.boxes.forEach((newBox, i) => {
      const oldBox = beforeState.boxes[i];
      if (oldBox && (newBox.x !== oldBox.x || newBox.y !== oldBox.y)) {
        if (useWebGPU && renderer) {
          renderer.emitPushEffect(newBox.x, newBox.y, dx, dy);

          // Box reached target
          if (newBox.onTarget && !oldBox.onTarget) {
            audio.playTargetReached();
            renderer.emitTargetReached(newBox.x, newBox.y);
          }
          // Box left target
          else if (!newBox.onTarget && oldBox.onTarget) {
            audio.playTargetLeft();
            renderer.emitTargetLeft(oldBox.x, oldBox.y);
          }
        }
      }
    });
  } else {
    audio.playMove();
  }

  // Update WebGPU renderer
  if (useWebGPU && renderer) {
    renderer.updatePlayer(afterState.playerX, afterState.playerY, playerDirection, playerBobPhase);
    renderer.updateBoxes(afterState.boxes);
    renderer.emitMoveDust(afterState.playerX, afterState.playerY);
    renderer.emitPlayerTrail(afterState.playerX, afterState.playerY);
  }
}

function getGameState(): {
  playerX: number;
  playerY: number;
  boxes: { x: number; y: number; onTarget: boolean }[];
} {
  // Parse game state from canvas render (simplified - would need game API)
  // For now, use internal tracking
  const levelData = LEVELS[game.getLevelIndex()];
  const rows = levelData.map;

  // This is a simplified approach - ideally game.ts would expose state
  // For full implementation, game.ts needs getState() method
  return {
    playerX: 0,
    playerY: 0,
    boxes: [],
  };
}

// Extend SokobanGame to expose state
declare module "./game" {
  interface SokobanGame {
    getState(): {
      playerX: number;
      playerY: number;
      boxes: { x: number; y: number; onTarget: boolean }[];
      grid: number[][];
    };
  }
}

// ============================================================================
// WebGPU Render Loop
// ============================================================================
function renderLoop(currentTime: number) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  if (renderer) {
    renderer.render(deltaTime);
  }

  animationFrameId = requestAnimationFrame(renderLoop);
}

// ============================================================================
// Controls
// ============================================================================
window.addEventListener("keydown", (e) => {
  audio.resume();

  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      move(0, -1);
      break;
    case "ArrowDown":
    case "s":
    case "S":
      move(0, 1);
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      move(-1, 0);
      break;
    case "ArrowRight":
    case "d":
    case "D":
      move(1, 0);
      break;
    case "z":
      if (e.ctrlKey || e.metaKey) {
        game.undo();
        audio.playUndo();
        syncRendererState();
      }
      break;
    case "r":
      game.reset();
      audio.playReset();
      syncRendererState();
      break;
  }
});

function syncRendererState() {
  if (!useWebGPU || !renderer) return;

  const levelData = LEVELS[game.getLevelIndex()];
  loadLevel(game.getLevelIndex());
}

// D-Pad
document.querySelectorAll(".d-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    audio.resume();
    const dir = (e.currentTarget as HTMLElement).dataset.dir;
    if (dir === "up") move(0, -1);
    if (dir === "down") move(0, 1);
    if (dir === "left") move(-1, 0);
    if (dir === "right") move(1, 0);
  });
});

undoBtn.addEventListener("click", () => {
  game.undo();
  audio.playUndo();
  syncRendererState();
});

resetBtn.addEventListener("click", () => {
  game.reset();
  audio.playReset();
  syncRendererState();
});

nextLevelBtn.addEventListener("click", () => {
  game.nextLevel();
  gameOverlay.style.display = "none";
  loadLevel(game.getLevelIndex());
});

prevLevelBtn.addEventListener("click", () => {
  const newIndex = game.getLevelIndex() - 1;
  if (newIndex >= 0) {
    game.loadLevel(newIndex);
    loadLevel(newIndex);
  }
});

nextLevelNav.addEventListener("click", () => {
  game.nextLevel();
  loadLevel(game.getLevelIndex());
});

// Camera controls (WebGPU only)
let isDraggingCamera = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2 && useWebGPU && renderer) {
    isDraggingCamera = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    e.preventDefault();
  }
});

window.addEventListener('mousemove', (e) => {
  if (isDraggingCamera && renderer) {
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    renderer.rotateCamera(deltaX * 0.005, deltaY * 0.005);
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    isDraggingCamera = false;
  }
});

canvas.addEventListener('wheel', (e) => {
  if (useWebGPU && renderer) {
    renderer.zoomCamera(e.deltaY * 0.001);
    e.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Sound toggle button
const soundToggle = document.createElement('button');
soundToggle.id = 'sound-toggle';
soundToggle.innerHTML = '🔊';
soundToggle.title = 'Toggle Sound';
soundToggle.addEventListener('click', () => {
  const enabled = audio.toggle();
  soundToggle.innerHTML = enabled ? '🔊' : '🔇';
});

// ============================================================================
// Initialization
// ============================================================================
async function init() {
  initI18n();

  // Init audio
  audio = new AudioSystem();
  await audio.init();

  // Init WebGPU
  useWebGPU = await initWebGPU();

  if (useWebGPU) {
    console.log('🎮 WebGPU 3D mode enabled');
    document.body.classList.add('webgpu-enabled');

    // Start render loop
    lastTime = performance.now();
    requestAnimationFrame(renderLoop);
  } else {
    console.log('📱 Fallback to Canvas 2D mode');
    document.body.classList.add('canvas-fallback');
  }

  // Init game
  initGame();

  // Add sound toggle to controls
  document.querySelector('.controls')?.appendChild(soundToggle);
}

init();
