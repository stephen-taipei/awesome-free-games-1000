/**
 * Tangram Main Entry - WebGPU Enhanced
 * Holographic Origami Theme
 * Game #014
 */
import { TangramGame, type TangramPiece } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type PieceData } from "./webgpu/renderer";

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

  // Pick up piece - soft chime
  playPickUp(): void {
    this.playTone(800, 0.08, 'sine', 0.15);
    setTimeout(() => this.playTone(1200, 0.06, 'sine', 0.1), 40);
  }

  // Place piece - satisfying thunk
  playPlace(): void {
    this.playTone(400, 0.1, 'triangle', 0.2);
    setTimeout(() => this.playTone(600, 0.08, 'sine', 0.15), 30);
  }

  // Rotate piece - whoosh
  playRotate(): void {
    // Quick ascending sweep
    const startFreq = 400;
    const endFreq = 800;
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const freq = startFreq + (endFreq - startFreq) * (i / steps);
      setTimeout(() => {
        this.playTone(freq, 0.04, 'sine', 0.08);
      }, i * 20);
    }
  }

  // Snap to position
  playSnap(): void {
    this.playTone(600, 0.06, 'square', 0.1);
    this.playTone(900, 0.05, 'sine', 0.12);
  }

  // Reset
  playReset(): void {
    const notes = [600, 500, 400, 300];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.08, 'sine', 0.1);
      }, i * 50);
    });
  }

  // Level complete
  playComplete(): void {
    const melody = [523, 659, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'sine', 0.2);
        this.playTone(freq * 1.5, 0.25, 'sine', 0.08);
      }, i * 120);
    });

    // Final shimmer
    setTimeout(() => {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          this.playTone(1500 + Math.random() * 500, 0.1, 'sine', 0.06);
        }, i * 50);
      }
    }, 600);
  }

  // Next level
  playNextLevel(): void {
    const notes = [523, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.12, 'sine', 0.15);
      }, i * 80);
    });
  }
}

// =====================
// Elements
// =====================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;

const levelDisplay = document.getElementById("level-display")!;
const statusDisplay = document.getElementById("status-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;
const prevBtn = document.getElementById("prev-level")!;
const nextBtn = document.getElementById("next-level")!;

// =====================
// Global Variables
// =====================
let game: TangramGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;

let isVictory = false;
let victoryAnimProgress = 0;
let lastDraggingId: number | null = null;

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
    if (key) el.textContent = i18n.t(key);
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
  game = new TangramGame(canvas);

  game.setOnStateChange((status) => {
    statusDisplay.textContent =
      status === "playing" ? i18n.t("game.playing") : i18n.t("game.won");

    if (status === "won" && !isVictory) {
      isVictory = true;
      victoryAnimProgress = 0;
      audio.playComplete();

      if (renderer) {
        renderer.emitVictory(0.5, 0.5);
      }
    }
  });
}

// =====================
// Game Flow
// =====================
function startGame() {
  overlay.style.display = "none";
  game.startLevel(0);
  levelDisplay.textContent = "1";

  isVictory = false;
  victoryAnimProgress = 0;

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0, 0.5, 0.5);
  }

  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
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
    const pieces = getGameDataForRenderer();
    renderer.updatePieces(pieces);

    // Emit trail particles for dragging piece
    const draggingPiece = pieces.find(p => p.isDragging);
    if (draggingPiece) {
      const normX = draggingPiece.centerX / canvas.width;
      const normY = draggingPiece.centerY / canvas.height;
      renderer.emitTrail(normX, normY, draggingPiece.color);
    }

    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

// Get game data for WebGPU renderer
function getGameDataForRenderer(): PieceData[] {
  const gameAny = game as any;
  const pieces = gameAny.pieces as TangramPiece[];

  return pieces.map(p => ({
    id: p.id,
    points: p.points,
    color: p.color,
    isDragging: p.isDragging,
    centerX: p.x,
    centerY: p.y,
  }));
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

canvas.addEventListener("mousedown", (e) => {
  const pos = getPos(e);
  if (pos) {
    const gameAny = game as any;
    const pieces = gameAny.pieces as TangramPiece[];

    // Find piece before handling
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (isPointInPoly(pos.x, pos.y, p.points)) {
        audio.playPickUp();

        if (renderer) {
          const normX = p.x / canvas.width;
          const normY = p.y / canvas.height;
          renderer.emitPickUp(normX, normY, p.color);

          // Check for double-tap rotation
          const now = Date.now();
          if (now - (gameAny.lastTapTime ?? 0) < 300) {
            audio.playRotate();
            renderer.emitRotate(normX, normY, p.color);
          }
        }

        lastDraggingId = p.id;
        break;
      }
    }

    game.handleDown(pos.x, pos.y);
  }
});

canvas.addEventListener("mousemove", (e) => {
  const pos = getPos(e);
  if (pos) game.handleMove(pos.x, pos.y);
});

canvas.addEventListener("mouseup", () => {
  const gameAny = game as any;
  const pieces = gameAny.pieces as TangramPiece[];

  // Find the piece that was being dragged
  const draggedPiece = pieces.find(p => p.id === lastDraggingId);
  if (draggedPiece) {
    audio.playPlace();
    if (renderer) {
      const normX = draggedPiece.x / canvas.width;
      const normY = draggedPiece.y / canvas.height;
      renderer.emitSnap(normX, normY);
    }
  }

  lastDraggingId = null;
  game.handleUp();
});

canvas.addEventListener("mouseleave", () => {
  lastDraggingId = null;
  game.handleUp();
});

// Touch
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) {
      const gameAny = game as any;
      const pieces = gameAny.pieces as TangramPiece[];

      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        if (isPointInPoly(pos.x, pos.y, p.points)) {
          audio.playPickUp();

          if (renderer) {
            const normX = p.x / canvas.width;
            const normY = p.y / canvas.height;
            renderer.emitPickUp(normX, normY, p.color);

            const now = Date.now();
            if (now - (gameAny.lastTapTime ?? 0) < 300) {
              audio.playRotate();
              renderer.emitRotate(normX, normY, p.color);
            }
          }

          lastDraggingId = p.id;
          break;
        }
      }

      game.handleDown(pos.x, pos.y);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pos) game.handleMove(pos.x, pos.y);
  },
  { passive: false }
);

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();

  const gameAny = game as any;
  const pieces = gameAny.pieces as TangramPiece[];
  const draggedPiece = pieces.find(p => p.id === lastDraggingId);

  if (draggedPiece) {
    audio.playPlace();
    if (renderer) {
      const normX = draggedPiece.x / canvas.width;
      const normY = draggedPiece.y / canvas.height;
      renderer.emitSnap(normX, normY);
    }
  }

  lastDraggingId = null;
  game.handleUp();
});

// Point in polygon helper
function isPointInPoly(x: number, y: number, poly: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.resetPieces();

  if (renderer) {
    renderer.clearParticles();
  }
});

hintBtn.addEventListener("click", () => {
  alert(i18n.t("game.controls"));
});

prevBtn.addEventListener("click", () => {
  game.prevLevel();
  levelDisplay.textContent = ((game as any).levelIndex + 1).toString();
  isVictory = false;
  victoryAnimProgress = 0;

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0, 0.5, 0.5);
  }
});

nextBtn.addEventListener("click", () => {
  game.nextLevel();
  levelDisplay.textContent = ((game as any).levelIndex + 1).toString();
  audio.playNextLevel();
  isVictory = false;
  victoryAnimProgress = 0;

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0, 0.5, 0.5);
  }
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
