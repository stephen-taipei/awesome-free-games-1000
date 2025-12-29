/**
 * Sliding Puzzle Main Entry - WebGPU Enhanced
 * Data Fragment Theme
 * Game #017
 */
import { SlidingPuzzleGame, type Tile } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type TileData } from "./webgpu/renderer";

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

  // Tile slide - data transfer sound
  playSlide(): void {
    this.playTone(400, 0.12, 'sine', 0.15);
    setTimeout(() => this.playTone(600, 0.08, 'sine', 0.1), 40);
    setTimeout(() => this.playTone(500, 0.06, 'triangle', 0.08), 80);
  }

  // Shuffle start - quantum scatter
  playShuffleStart(): void {
    this.playTone(300, 0.2, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(400, 0.15, 'sine', 0.1), 100);
  }

  // Shuffle step - quick blips
  playShuffleStep(): void {
    const freq = 300 + Math.random() * 300;
    this.playTone(freq, 0.03, 'sine', 0.05);
  }

  // Puzzle complete - data sync achieved
  playComplete(): void {
    const melody = [523, 659, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sine', 0.15);
        this.playTone(freq * 0.5, 0.3, 'triangle', 0.08);
      }, i * 120);
    });

    // Sparkle effect
    setTimeout(() => {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          this.playTone(1000 + Math.random() * 1000, 0.1, 'sine', 0.05);
        }, i * 40);
      }
    }, 600);
  }

  // Reset - shutdown sound
  playReset(): void {
    const notes = [500, 400, 300, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.08, 'sine', 0.08);
      }, i * 50);
    });
  }
}

// =====================
// Elements
// =====================
const container = document.getElementById("grid-container") as HTMLElement;
const gameArea = document.querySelector(".game-area") as HTMLElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const imageBtn = document.getElementById("image-btn")!;
const diffRadios = document.querySelectorAll('input[name="difficulty"]');

// =====================
// Global Variables
// =====================
let game: SlidingPuzzleGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;

let currentSize = 3;
let isImageMode = false;
let isVictory = false;
let victoryAnimProgress = 0;

// Slide animations
interface SlideAnimation {
  tileValue: number;
  progress: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}
const slideAnimations: Map<number, SlideAnimation> = new Map();

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
  const canvas = document.createElement('canvas');
  canvas.id = 'webgpu-canvas';
  canvas.width = 600;
  canvas.height = 600;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';

  gameArea.insertBefore(canvas, gameArea.firstChild);

  renderer = new WebGPURenderer(canvas);
  useWebGPU = await renderer.init();

  if (useWebGPU) {
    console.log('WebGPU renderer initialized');
    container.style.opacity = '0.001';
    canvas.style.pointerEvents = 'none';
  } else {
    console.log('Falling back to CSS');
    renderer = null;
    canvas.remove();
  }
}

function initGame() {
  game = new SlidingPuzzleGame(container);

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    if (state.status === "won" && !isVictory) {
      isVictory = true;
      victoryAnimProgress = 0;
      audio.playComplete();
      if (renderer) {
        renderer.emitComplete();
      }
      showWin();
    }
  });

  // Hook tile clicks
  hookTileInteractions();
}

function hookTileInteractions(): void {
  const originalStart = game.start.bind(game);
  game.start = () => {
    originalStart();
    setTimeout(() => setupTileHooks(), 100);
  };

  const originalInit = game.init.bind(game);
  game.init = (size: number, isImg: boolean) => {
    originalInit(size, isImg);
    if (renderer) {
      renderer.setGridSize(size);
    }
    setTimeout(() => setupTileHooks(), 100);
  };
}

function setupTileHooks(): void {
  const tileElements = container.querySelectorAll('.tile');
  const gameAny = game as any;
  const gameTiles = gameAny.tiles as Tile[];

  tileElements.forEach((tileEl, index) => {
    const existingHandler = (tileEl as any).__slideHandler;
    if (existingHandler) {
      tileEl.removeEventListener('click', existingHandler);
    }

    const handler = () => {
      const tile = gameTiles[index];
      if (!tile) return;

      const gameAny2 = game as any;
      if (gameAny2.status !== 'playing') return;

      const emptyPos = gameAny2.emptyPos;
      const canMove = gameAny2.canMove(tile.currentPos);

      if (canMove) {
        audio.playSlide();

        // Calculate positions for animation
        const size = gameAny2.size;
        const fromRow = Math.floor(tile.currentPos / size);
        const fromCol = tile.currentPos % size;
        const toRow = Math.floor(emptyPos / size);
        const toCol = emptyPos % size;

        const rect = gameArea.getBoundingClientRect();
        const cellSize = 1 / size;

        const fromX = (fromCol + 0.5) * cellSize;
        const fromY = (fromRow + 0.5) * cellSize;
        const toX = (toCol + 0.5) * cellSize;
        const toY = (toRow + 0.5) * cellSize;

        // Emit particles
        if (renderer) {
          renderer.emitSlide(fromX, fromY, toX, toY);
        }

        // Start slide animation
        slideAnimations.set(tile.value, {
          tileValue: tile.value,
          progress: 0,
          fromX: fromCol * cellSize,
          fromY: fromRow * cellSize,
          toX: toCol * cellSize,
          toY: toRow * cellSize,
        });
      }
    };

    (tileEl as any).__slideHandler = handler;
    tileEl.addEventListener('click', handler);
  });
}

// =====================
// Game Flow
// =====================
function startGame() {
  overlay.style.display = "none";

  diffRadios.forEach((r) => {
    if ((r as HTMLInputElement).checked) {
      currentSize = parseInt((r as HTMLInputElement).value, 10);
    }
  });

  game.init(currentSize, isImageMode);

  // Play shuffle sound
  audio.playShuffleStart();
  if (renderer) {
    renderer.emitShuffle();
  }

  game.start();
  isVictory = false;
  victoryAnimProgress = 0;
  slideAnimations.clear();

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
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.time")}: ${timeDisplay.textContent}, ${i18n.t("game.moves")}: ${moveDisplay.textContent}`;
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = startGame;
  }, 500);
}

// =====================
// Game Loop
// =====================
function gameLoop(timestamp: number) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // Update slide animations
  slideAnimations.forEach((anim, value) => {
    anim.progress = Math.min(1, anim.progress + deltaTime * 0.005);

    if (anim.progress >= 1) {
      slideAnimations.delete(value);
    }
  });

  // Update victory animation
  if (isVictory && victoryAnimProgress < 1) {
    victoryAnimProgress = Math.min(1, victoryAnimProgress + deltaTime * 0.001);
    if (renderer) {
      renderer.setVictory(victoryAnimProgress, 0.5, 0.5);
    }
  }

  // WebGPU rendering
  if (renderer && useWebGPU) {
    const tileData = getTileDataForRenderer();
    renderer.updateTiles(tileData);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

function getTileDataForRenderer(): TileData[] {
  const gameAny = game as any;
  const gameTiles = gameAny.tiles as Tile[];
  if (!gameTiles || gameTiles.length === 0) return [];

  const rect = gameArea.getBoundingClientRect();
  const canvasWidth = 600;
  const canvasHeight = 600;
  const size = gameAny.size || currentSize;

  const cellWidth = canvasWidth / size;
  const cellHeight = canvasHeight / size;
  const padding = 4;

  return gameTiles.map((tile) => {
    const row = Math.floor(tile.currentPos / size);
    const col = tile.currentPos % size;

    let x = col * cellWidth + padding;
    let y = row * cellHeight + padding;
    let fromX = x;
    let fromY = y;
    let slideProgress = 1;

    // Check for active animation
    const anim = slideAnimations.get(tile.value);
    if (anim) {
      fromX = anim.fromX * canvasWidth + padding;
      fromY = anim.fromY * canvasHeight + padding;
      slideProgress = anim.progress;
    }

    return {
      x,
      y,
      width: cellWidth - padding * 2,
      height: cellHeight - padding * 2,
      value: tile.value,
      slideProgress,
      fromX,
      fromY,
    };
  });
}

// =====================
// Event Listeners
// =====================
startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
  isVictory = false;
  victoryAnimProgress = 0;
  slideAnimations.clear();

  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.welcome");
  overlayMsg.textContent = i18n.t("game.desc");
  startBtn.onclick = startGame;

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0, 0.5, 0.5);
  }
});

imageBtn.addEventListener("click", () => {
  isImageMode = !isImageMode;
  game.toggleMode();
});

// =====================
// Sound Toggle
// =====================
function createSoundToggle(): void {
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

  // Init audio
  audio = new AudioSystem();

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
  game.init(currentSize, isImageMode);

  // Sound toggle
  createSoundToggle();

  // Start game loop
  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

main();
