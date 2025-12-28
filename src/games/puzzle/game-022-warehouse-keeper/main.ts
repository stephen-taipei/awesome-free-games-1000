/**
 * Warehouse Keeper Main Entry
 * Cargo Teleportation Theme
 * Game #022
 */
import { WarehouseGame, Tile } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type TileData, type CrateData, type PlayerData } from "./webgpu";

// ============================================================
// Audio System - Synthesized Warehouse Sounds
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

  playMove(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Teleportation step sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playPush(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Heavy cargo push
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.15);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(80, now);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
  }

  playLand(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Cargo lands on target
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.exponentialRampToValueAtTime(1000, now + 0.1);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(800, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

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

    // Level complete fanfare
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
  }

  playUndo(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Reverse teleport
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playStart(): void {
    if (!this.init() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // System boot
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);

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

    // System reset
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }
}

// ============================================================
// Game State
// ============================================================
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const moveDisplay = document.getElementById("move-display")!;
const timeDisplay = document.getElementById("time-display")!;
const levelDisplay = document.getElementById("level-display")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const undoBtn = document.getElementById("undo-btn")!;

// Mobile Controls
const upBtn = document.getElementById("up-btn")!;
const downBtn = document.getElementById("down-btn")!;
const leftBtn = document.getElementById("left-btn")!;
const rightBtn = document.getElementById("right-btn")!;

let game: WarehouseGame;
let audio: AudioSystem;
let webgpuRenderer: WebGPURenderer | null = null;
let webgpuCanvas: HTMLCanvasElement | null = null;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;
let victoryTriggered = false;
let previousCratesOnTarget: Set<string> = new Set();

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
  game = new WarehouseGame(canvas);

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();
    levelDisplay.textContent = state.level.toString();
    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    // Update WebGPU rendering
    if (useWebGPU && webgpuRenderer) {
      updateWebGPUState();
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

  setupSwipe();
}

function updateWebGPUState(): void {
  if (!webgpuRenderer || !game) return;

  const grid = game.grid;
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  if (cols === 0) return;

  const cellWidth = 1.0 / cols;
  const cellHeight = 1.0 / rows;

  webgpuRenderer.setGrid(cols, rows);

  // Build tiles
  const tiles: TileData[] = [];
  const targets = game.targets;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];
      let tileType = 0; // floor

      if (tile === Tile.Wall) {
        tileType = 1;
      } else if (tile === Tile.Target) {
        tileType = 2;
      }

      // Check if target is occupied
      const isTarget = targets.some(t => t.x === x && t.y === y);
      const isOccupied = game.crates.some(c => c.x === x && c.y === y);

      tiles.push({
        x: x * cellWidth,
        y: y * cellHeight,
        width: cellWidth,
        height: cellHeight,
        tileType,
        state: (isTarget && isOccupied) ? 1 : 0,
      });
    }
  }
  webgpuRenderer.updateTiles(tiles);

  // Build crates
  const crates: CrateData[] = game.crates.map(c => {
    const onTarget = targets.some(t => t.x === c.x && t.y === c.y);
    const key = `${c.x},${c.y}`;

    // Check if newly landed on target
    if (onTarget && !previousCratesOnTarget.has(key)) {
      const centerX = (c.x + 0.5) * cellWidth;
      const centerY = (c.y + 0.5) * cellHeight;
      webgpuRenderer!.emitLand(centerX, centerY);
      audio.playLand();
    }

    return {
      x: c.x * cellWidth,
      y: c.y * cellHeight,
      width: cellWidth,
      height: cellHeight,
      onTarget,
      pushAnim: 0,
    };
  });
  webgpuRenderer.updateCrates(crates);

  // Update previous state
  previousCratesOnTarget.clear();
  game.crates.forEach(c => {
    const onTarget = targets.some(t => t.x === c.x && t.y === c.y);
    if (onTarget) {
      previousCratesOnTarget.add(`${c.x},${c.y}`);
    }
  });

  // Update player
  const player: PlayerData = {
    x: game.playerPos.x * cellWidth,
    y: game.playerPos.y * cellHeight,
    size: cellWidth,
  };
  webgpuRenderer.updatePlayer(player);
}

function handleMove(dx: number, dy: number): void {
  const prevPlayer = { ...game.playerPos };
  const prevCrates = game.crates.map(c => ({ ...c }));

  game.move(dx, dy);

  // Check if player actually moved
  if (prevPlayer.x !== game.playerPos.x || prevPlayer.y !== game.playerPos.y) {
    audio.playMove();

    if (useWebGPU && webgpuRenderer) {
      const cols = game.grid[0]?.length || 1;
      const rows = game.grid.length;
      const cellWidth = 1.0 / cols;
      const cellHeight = 1.0 / rows;

      // Emit teleport particles at new position
      const centerX = (game.playerPos.x + 0.5) * cellWidth;
      const centerY = (game.playerPos.y + 0.5) * cellHeight;
      webgpuRenderer.emitTeleport(centerX, centerY);

      // Check if crate was pushed
      const crateMoved = game.crates.some((c, i) => {
        return c.x !== prevCrates[i]?.x || c.y !== prevCrates[i]?.y;
      });

      if (crateMoved) {
        audio.playPush();
        const pushX = (game.playerPos.x + dx + 0.5) * cellWidth;
        const pushY = (game.playerPos.y + dy + 0.5) * cellHeight;
        webgpuRenderer.emitPush(pushX, pushY, dx * 0.1, dy * 0.1);
      }
    }
  }
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${moveDisplay.textContent}`;
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      game.loadLevel(0);
      overlay.style.display = "none";
      victoryTriggered = false;
      previousCratesOnTarget.clear();

      if (useWebGPU && webgpuRenderer) {
        webgpuRenderer.setVictory(0);
        webgpuRenderer.clearParticles();
      }
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playStart();
  victoryTriggered = false;
  previousCratesOnTarget.clear();

  if (useWebGPU && webgpuRenderer) {
    webgpuRenderer.setVictory(0);
    webgpuRenderer.clearParticles();
  }

  game.loadLevel(0);

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

  webgpuRenderer.render(deltaTime);
  animationId = requestAnimationFrame(animate);
}

// ============================================================
// Input Handlers
// ============================================================
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      handleMove(0, -1);
      e.preventDefault();
      break;
    case "ArrowDown":
      handleMove(0, 1);
      e.preventDefault();
      break;
    case "ArrowLeft":
      handleMove(-1, 0);
      e.preventDefault();
      break;
    case "ArrowRight":
      handleMove(1, 0);
      e.preventDefault();
      break;
    case "z":
      if (e.metaKey || e.ctrlKey) {
        audio.playUndo();
        game.undo();
      }
      break;
  }
});

// Mobile Buttons
upBtn.addEventListener("click", () => handleMove(0, -1));
downBtn.addEventListener("click", () => handleMove(0, 1));
leftBtn.addEventListener("click", () => handleMove(-1, 0));
rightBtn.addEventListener("click", () => handleMove(1, 0));

startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  audio.playReset();
  victoryTriggered = false;
  previousCratesOnTarget.clear();

  if (useWebGPU && webgpuRenderer) {
    webgpuRenderer.setVictory(0);
    webgpuRenderer.clearParticles();
  }

  game.reset();
});

undoBtn.addEventListener("click", () => {
  audio.playUndo();
  game.undo();
});

// Swipe Logic
function setupSwipe() {
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      e.preventDefault();
    },
    { passive: false }
  );

  canvas.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        if (dx > 0) handleMove(1, 0);
        else handleMove(-1, 0);
      }
    } else {
      if (Math.abs(dy) > 30) {
        if (dy > 0) handleMove(0, 1);
        else handleMove(0, -1);
      }
    }
  });
}

// ============================================================
// Initialize
// ============================================================
async function init() {
  initI18n();

  useWebGPU = await initWebGPU();
  if (useWebGPU) {
    console.log('Warehouse Keeper: WebGPU enabled');
  }

  initGame();
}

init();
