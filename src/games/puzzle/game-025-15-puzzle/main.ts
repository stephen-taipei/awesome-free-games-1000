/**
 * 15 Puzzle Main Entry
 * Holographic Interface Theme
 * Game #025
 */
import { Puzzle15Game } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type TileData } from "./webgpu";

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
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSlide() {
    this.init();
    if (!this.ctx) return;
    // Holographic slide sound
    this.playTone(300, 0.08, 'sine', 0.15);
    setTimeout(() => this.playTone(400, 0.06, 'sine', 0.1), 30);
  }

  playCorrect() {
    this.init();
    if (!this.ctx) return;
    // Tile in correct position
    this.playTone(600, 0.1, 'sine', 0.15);
    setTimeout(() => this.playTone(800, 0.1, 'triangle', 0.1), 50);
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    // Victory fanfare
    const notes = [400, 500, 600, 800, 1000, 1200];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25, 'sine', 0.2), i * 80);
    });
    setTimeout(() => {
      this.playTone(800, 0.5, 'triangle', 0.15);
      this.playTone(1000, 0.5, 'triangle', 0.15);
    }, 500);
  }

  playStart() {
    this.init();
    if (!this.ctx) return;
    // Holographic boot
    this.playTone(200, 0.15, 'sine', 0.1);
    setTimeout(() => this.playTone(400, 0.1, 'sine', 0.15), 80);
    setTimeout(() => this.playTone(600, 0.1, 'triangle', 0.2), 160);
  }
}

const audio = new AudioSystem();

// Elements
const gridContainer = document.getElementById("grid-container")!;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const moveDisplay = document.getElementById("move-display")!;
const timeDisplay = document.getElementById("time-display")!;

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
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.className = 'webgpu-overlay';
  webgpuCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:20;';
  gameArea.appendChild(webgpuCanvas);

  const rect = gameArea.getBoundingClientRect();
  webgpuCanvas.width = rect.width * window.devicePixelRatio;
  webgpuCanvas.height = rect.height * window.devicePixelRatio;

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  useWebGPU = await webgpuRenderer.init();

  if (useWebGPU) {
    webgpuRenderer.setGridSize(4);
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
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  const rect = gameArea.getBoundingClientRect();
  webgpuCanvas.width = rect.width * window.devicePixelRatio;
  webgpuCanvas.height = rect.height * window.devicePixelRatio;
}

let game: Puzzle15Game;

// Track previous state for effects
let previousTiles: number[] | null = null;
let previousCorrect: Set<number> = new Set();

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

function initGame() {
  game = new Puzzle15Game();

  game.setOnStateChange((state: any) => {
    moveDisplay.textContent = state.moves.toString();

    const min = Math.floor(state.time / 60);
    const sec = state.time % 60;
    timeDisplay.textContent = `${min}:${sec.toString().padStart(2, "0")}`;

    renderGrid(state.tiles);
    updateWebGPUState(state.tiles);

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", resizeWebGPU);
}

function updateWebGPUState(tiles: number[]) {
  if (!webgpuRenderer || !useWebGPU) return;

  const gridSize = 4;
  const tileSize = 1 / gridSize;
  const gap = 0.01;

  const tileDataArray: TileData[] = [];
  const currentCorrect = new Set<number>();

  tiles.forEach((val, pos) => {
    if (val === 0) return; // Skip empty

    const row = Math.floor(pos / gridSize);
    const col = pos % gridSize;

    const x = col * tileSize + gap / 2;
    const y = row * tileSize + gap / 2;
    const width = tileSize - gap;
    const height = tileSize - gap;

    const isCorrect = val === pos + 1;
    if (isCorrect) currentCorrect.add(val);

    tileDataArray.push({
      x,
      y,
      width,
      height,
      number: val,
      correct: isCorrect,
      animProgress: 0,
    });

    // Detect newly correct tiles
    if (isCorrect && !previousCorrect.has(val) && previousTiles !== null) {
      webgpuRenderer.emitCorrect(x + width / 2, y + height / 2);
      audio.playCorrect();
    }
  });

  webgpuRenderer.updateTiles(tileDataArray);

  // Detect slides
  if (previousTiles !== null) {
    for (let pos = 0; pos < tiles.length; pos++) {
      if (previousTiles[pos] !== tiles[pos] && tiles[pos] !== 0) {
        // This position changed
        const prevPos = previousTiles.indexOf(tiles[pos]);
        if (prevPos !== -1 && prevPos !== pos) {
          const fromRow = Math.floor(prevPos / gridSize);
          const fromCol = prevPos % gridSize;
          const toRow = Math.floor(pos / gridSize);
          const toCol = pos % gridSize;

          const fromX = (fromCol + 0.5) * tileSize;
          const fromY = (fromRow + 0.5) * tileSize;
          const toX = (toCol + 0.5) * tileSize;
          const toY = (toRow + 0.5) * tileSize;

          webgpuRenderer.emitSlide(fromX, fromY, toX, toY);
          audio.playSlide();
        }
      }
    }
  }

  previousTiles = [...tiles];
  previousCorrect = currentCorrect;
}

function renderGrid(tiles: number[]) {
  // First run: Create elements 1-15.
  if (gridContainer.children.length === 0) {
    for (let i = 1; i <= 15; i++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = i.toString();
      tile.id = `tile-${i}`;
      tile.addEventListener("click", () => {
        game.move(i);
      });
      gridContainer.appendChild(tile);
    }
    // Empty slot
    const empty = document.createElement("div");
    empty.className = "tile tile-empty";
    empty.id = "tile-0";
    gridContainer.appendChild(empty);
  }

  // Update Order
  tiles.forEach((val, pos) => {
    const el = document.getElementById(`tile-${val}`);
    if (el) {
      el.style.order = pos.toString();

      // Check correct position
      if (val !== 0) {
        if (val === pos + 1) el.classList.add("correct");
        else el.classList.remove("correct");
      }
    }
  });
}

function showWin() {
  setTimeout(() => {
    audio.playWin();

    if (webgpuRenderer && useWebGPU) {
      webgpuRenderer.emitComplete(0.5, 0.5);
      webgpuRenderer.setVictory(1.0);
      setTimeout(() => webgpuRenderer?.setVictory(0), 2000);
    }

    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${
      moveDisplay.textContent
    }`;
    startBtn.textContent = i18n.t("game.start");

    startBtn.onclick = () => {
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  previousTiles = null;
  previousCorrect.clear();

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
