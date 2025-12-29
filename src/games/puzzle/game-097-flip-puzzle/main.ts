/**
 * Flip Puzzle Main Entry
 * Game #097 - With WebGPU Effects
 */
import { FlipGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System for Tile/Toggle sounds
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      this.audioContext = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.15
  ) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Tile flip - digital click
  playFlip(toOn: boolean) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(toOn ? 800 : 400, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      toOn ? 1200 : 200,
      this.audioContext.currentTime + 0.08
    );

    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  // Victory melody
  playVictory() {
    if (!this.audioContext) return;

    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "sine", 0.12);
      }, i * 100);
    });
  }

  // Hint sound
  playHint() {
    if (!this.audioContext) return;

    this.playTone(600, 0.1, "sine", 0.08);
    setTimeout(() => this.playTone(800, 0.15, "sine", 0.1), 100);
  }

  // Reset sound
  playReset() {
    if (!this.audioContext) return;

    this.playTone(500, 0.08, "triangle", 0.08);
    setTimeout(() => this.playTone(350, 0.1, "triangle", 0.06), 60);
    setTimeout(() => this.playTone(200, 0.12, "triangle", 0.05), 120);
  }

  // Level start
  playLevelStart() {
    if (!this.audioContext) return;

    this.playTone(400, 0.1, "sine", 0.08);
    setTimeout(() => this.playTone(500, 0.1, "sine", 0.09), 80);
    setTimeout(() => this.playTone(600, 0.12, "sine", 0.1), 160);
    setTimeout(() => this.playTone(800, 0.15, "sine", 0.12), 240);
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const bestDisplay = document.getElementById("best-display")!;
const currentBoard = document.getElementById("current-board")!;
const targetBoard = document.getElementById("target-board")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: FlipGame;
let webgpuRenderer: WebGPURenderer | null = null;
const audioSystem = new AudioSystem();
let hintTimeout: number | null = null;

function initI18n(): void {
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

function updateTexts(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

async function initWebGPU(): Promise<void> {
  if (!webgpuCanvas) return;

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const success = await webgpuRenderer.init();

  if (!success) {
    console.warn("WebGPU not available, running without effects");
    webgpuRenderer = null;
  } else {
    resizeWebGPU();
  }
}

function resizeWebGPU(): void {
  if (webgpuRenderer && webgpuCanvas.parentElement) {
    const rect = webgpuCanvas.parentElement.getBoundingClientRect();
    webgpuRenderer.resize(rect.width, rect.height);
  }
}

function getTilePosition(row: number, col: number, size: number): { x: number; y: number; tileSize: number } {
  const boardRect = currentBoard.getBoundingClientRect();
  const canvasRect = webgpuCanvas?.getBoundingClientRect();

  if (!canvasRect) return { x: 0, y: 0, tileSize: 40 };

  const tileSize = boardRect.width / size;

  const x = boardRect.left - canvasRect.left + col * tileSize + tileSize / 2;
  const y = boardRect.top - canvasRect.top + row * tileSize + tileSize / 2;

  return { x, y, tileSize };
}

function initGame(): void {
  game = new FlipGame();

  game.onStateChange = (state: GameState) => {
    renderBoards(state);
    updateUI(state);

    if (state.status === "won") {
      audioSystem.playVictory();
      webgpuRenderer?.emitVictory();
      setTimeout(() => showWinOverlay(), 500);
    }
  };

  window.addEventListener("resize", resizeWebGPU);
}

function createBoard(container: HTMLElement, size: number, isTarget: boolean = false): void {
  container.innerHTML = "";
  container.className = `board size-${size}${isTarget ? " target" : ""}`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const tile = document.createElement("div");
      tile.className = "tile off";
      tile.dataset.row = r.toString();
      tile.dataset.col = c.toString();

      if (!isTarget) {
        tile.addEventListener("click", () => handleTileClick(r, c));
      }

      container.appendChild(tile);
    }
  }
}

function handleTileClick(row: number, col: number): void {
  if (game.getState().status !== "playing") return;

  audioSystem.init();
  clearHint();

  const state = game.getState();
  const size = state.size;
  const board = state.board;

  // Get current states before flip
  const centerOn = board[row][col];
  const pos = getTilePosition(row, col, size);

  // Emit flip effect for center
  webgpuRenderer?.emitFlip(pos.x, pos.y, pos.tileSize, !centerOn);

  // Adjacent tiles
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      const adjPos = getTilePosition(nr, nc, size);
      const adjOn = board[nr][nc];
      webgpuRenderer?.emitAdjacentFlip(adjPos.x, adjPos.y, pos.tileSize, !adjOn);
    }
  }

  audioSystem.playFlip(!centerOn);

  // Add flip animation
  const tiles = currentBoard.querySelectorAll(".tile");

  const affected: number[] = [row * size + col];
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      affected.push(nr * size + nc);
    }
  }

  affected.forEach((idx) => {
    tiles[idx].classList.add("flipping");
    setTimeout(() => tiles[idx].classList.remove("flipping"), 300);
  });

  game.flipTile(row, col);
}

function renderBoards(state: GameState): void {
  const { board, target, size } = state;

  // Ensure boards are created with correct size
  if (currentBoard.children.length !== size * size) {
    createBoard(currentBoard, size, false);
    createBoard(targetBoard, size, true);
  }

  // Render current board
  const currentTiles = currentBoard.querySelectorAll(".tile");
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const tile = currentTiles[idx];
      tile.classList.remove("on", "off");
      tile.classList.add(board[r][c] ? "on" : "off");
    }
  }

  // Render target board
  const targetTiles = targetBoard.querySelectorAll(".tile");
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const tile = targetTiles[idx];
      tile.classList.remove("on", "off");
      tile.classList.add(target[r][c] ? "on" : "off");
    }
  }
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();

  const best = game.getBestScore(state.level);
  bestDisplay.textContent = best !== null ? best.toString() : "-";
}

function clearHint(): void {
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }
  currentBoard.querySelectorAll(".hint").forEach((el) => el.classList.remove("hint"));
}

function showHint(): void {
  audioSystem.init();
  clearHint();
  const hint = game.getHint();
  if (!hint) return;

  const [row, col] = hint;
  const size = game.getState().size;
  const idx = row * size + col;
  const tile = currentBoard.children[idx];

  if (tile) {
    tile.classList.add("hint");
    hintTimeout = window.setTimeout(clearHint, 3000);

    audioSystem.playHint();

    const pos = getTilePosition(row, col, size);
    webgpuRenderer?.emitHint(pos.x, pos.y, pos.tileSize);
  }
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${state.moves}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
      audioSystem.playLevelStart();
      webgpuRenderer?.emitLevelStart();
    };
  }
}

function startGame(level: number = 1): void {
  audioSystem.init();
  overlay.style.display = "none";
  clearHint();
  game.start(level);
  audioSystem.playLevelStart();
  webgpuRenderer?.emitLevelStart();
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => {
  audioSystem.init();
  game.reset();
  audioSystem.playReset();
  webgpuRenderer?.emitReset();
});
hintBtn.addEventListener("click", showHint);

// Initialize
initI18n();
initWebGPU().then(() => {
  initGame();
});
