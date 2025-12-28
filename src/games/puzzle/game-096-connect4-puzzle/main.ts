/**
 * Connect 4 Puzzle Main Entry
 * Game #096 - With WebGPU Effects
 */
import { Connect4Game, CellState, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System for Board Game sounds
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

  // Piece drop - sliding thud
  playDrop() {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.audioContext.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  // Piece lands - solid thunk
  playLand() {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.25, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  // Win connection - triumphant chord
  playConnect() {
    if (!this.audioContext) return;

    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, "sine", 0.12);
      }, i * 60);
    });
  }

  // Victory celebration
  playVictory() {
    if (!this.audioContext) return;

    const melody = [523, 659, 784, 880, 1047, 1047, 1047];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "sine", 0.12);
      }, i * 100);
    });
  }

  // Hint shown
  playHint() {
    if (!this.audioContext) return;

    this.playTone(800, 0.1, "sine", 0.08);
    setTimeout(() => this.playTone(1000, 0.15, "sine", 0.1), 100);
  }

  // Undo action
  playUndo() {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.15);

    gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  // Switch piece color
  playSwitch() {
    if (!this.audioContext) return;

    this.playTone(500, 0.08, "square", 0.08);
    setTimeout(() => this.playTone(700, 0.1, "square", 0.1), 60);
  }

  // Reset level
  playReset() {
    if (!this.audioContext) return;

    this.playTone(400, 0.1, "triangle", 0.1);
    setTimeout(() => this.playTone(300, 0.1, "triangle", 0.08), 80);
    setTimeout(() => this.playTone(200, 0.15, "triangle", 0.06), 160);
  }

  // Level start
  playLevelStart() {
    if (!this.audioContext) return;

    this.playTone(300, 0.1, "sine", 0.1);
    setTimeout(() => this.playTone(400, 0.1, "sine", 0.1), 100);
    setTimeout(() => this.playTone(500, 0.15, "sine", 0.12), 200);
  }

  // Lost / Out of moves
  playLost() {
    if (!this.audioContext) return;

    this.playTone(400, 0.2, "sine", 0.1);
    setTimeout(() => this.playTone(300, 0.3, "sine", 0.1), 200);
    setTimeout(() => this.playTone(200, 0.4, "sine", 0.08), 400);
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const targetDisplay = document.getElementById("target-display")!;
const boardEl = document.getElementById("board")!;
const previewRow = document.getElementById("preview-row")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const undoBtn = document.getElementById("undo-btn")! as HTMLButtonElement;
const resetBtn = document.getElementById("reset-btn")!;
const hintBtn = document.getElementById("hint-btn")!;
const switchBtn = document.getElementById("switch-btn")!;
const currentPieceEl = document.getElementById("current-piece")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: Connect4Game;
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
  updateTargetDisplay();
}

function updateTargetDisplay(): void {
  if (game) {
    const maxMoves = game.getMaxMoves();
    targetDisplay.textContent = `${maxMoves} ${i18n.t("game.targetMoves")}`;
  }
}

function getCellPosition(row: number, col: number): { x: number; y: number } {
  const boardRect = boardEl.getBoundingClientRect();
  const canvasRect = webgpuCanvas?.getBoundingClientRect();

  if (!canvasRect) return { x: 0, y: 0 };

  const cellWidth = boardRect.width / 7;
  const cellHeight = boardRect.height / 6;

  const x = boardRect.left - canvasRect.left + col * cellWidth + cellWidth / 2;
  const y = boardRect.top - canvasRect.top + row * cellHeight + cellHeight / 2;

  return { x, y };
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

function initGame(): void {
  game = new Connect4Game();

  game.onStateChange = (state: GameState) => {
    renderBoard(state);
    updateUI(state);
  };

  game.onWin = (winningCells: [number, number][]) => {
    audioSystem.playConnect();

    // Get cell positions for WebGPU effect
    if (webgpuRenderer && winningCells.length > 0) {
      const boardRect = boardEl.getBoundingClientRect();
      const canvasRect = webgpuCanvas?.getBoundingClientRect();

      if (canvasRect) {
        const cellWidth = boardRect.width / 7;
        const cellHeight = boardRect.height / 6;
        const offsetX = boardRect.left - canvasRect.left;
        const offsetY = boardRect.top - canvasRect.top;

        webgpuRenderer.emitWinConnection(
          winningCells,
          (cellWidth + cellHeight) / 2,
          offsetX,
          offsetY
        );
      }
    }

    highlightWinningCells(winningCells);
    setTimeout(() => {
      audioSystem.playVictory();
      webgpuRenderer?.emitVictory();
      showWinOverlay();
    }, 800);
  };

  // Create preview row
  createPreviewRow();

  // Create board
  createBoard();

  window.addEventListener("resize", resizeWebGPU);
}

function createPreviewRow(): void {
  previewRow.innerHTML = "";
  for (let c = 0; c < 7; c++) {
    const cell = document.createElement("div");
    cell.className = "preview-cell";
    cell.dataset.col = c.toString();
    cell.addEventListener("click", () => handleColumnClick(c));
    previewRow.appendChild(cell);
  }
}

function createBoard(): void {
  boardEl.innerHTML = "";
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r.toString();
      cell.dataset.col = c.toString();
      cell.addEventListener("click", () => handleColumnClick(c));
      boardEl.appendChild(cell);
    }
  }
}

function handleColumnClick(col: number): void {
  if (game.getState().status !== "playing") return;

  audioSystem.init();
  clearHint();

  // Find target row before dropping
  const state = game.getState();
  let targetRow = -1;
  for (let r = 5; r >= 0; r--) {
    if (state.board[r][col] === "empty") {
      targetRow = r;
      break;
    }
  }

  if (targetRow === -1) return; // Column full

  const isRed = state.currentPiece === "red";

  // Emit drop effect
  audioSystem.playDrop();
  const startPos = getCellPosition(0, col);
  const endPos = getCellPosition(targetRow, col);
  webgpuRenderer?.emitPieceDrop(startPos.x, 0, endPos.y, isRed);

  const dropped = game.dropPiece(col);
  if (dropped) {
    // Add drop animation to the newly placed piece
    const newState = game.getState();
    for (let r = 0; r < 6; r++) {
      if (newState.board[r][col] !== "empty") {
        const cell = boardEl.querySelector(
          `[data-row="${r}"][data-col="${col}"]`
        );
        if (cell) {
          cell.classList.add("dropping");
          setTimeout(() => cell.classList.remove("dropping"), 400);
        }

        // Emit land effect
        setTimeout(() => {
          audioSystem.playLand();
          const pos = getCellPosition(r, col);
          webgpuRenderer?.emitPieceLand(pos.x, pos.y, isRed);
        }, 350);

        break;
      }
    }
  }
}

function renderBoard(state: GameState): void {
  const cells = boardEl.querySelectorAll(".cell");
  cells.forEach((cell) => {
    const row = parseInt(cell.getAttribute("data-row")!);
    const col = parseInt(cell.getAttribute("data-col")!);
    const cellState = state.board[row][col];

    cell.classList.remove("red", "yellow", "winning", "hint");
    if (cellState !== "empty") {
      cell.classList.add(cellState);
    }
  });

  // Update preview row colors
  const previewCells = previewRow.querySelectorAll(".preview-cell");
  previewCells.forEach((cell) => {
    cell.classList.remove("red", "yellow");
    cell.classList.add(state.currentPiece);
  });
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = `${state.moves}/${game.getMaxMoves()}`;
  updateTargetDisplay();

  // Update current piece indicator
  currentPieceEl.classList.remove("red", "yellow");
  currentPieceEl.classList.add(state.currentPiece);

  // Update button states
  undoBtn.disabled = state.history.length === 0 || state.status === "won";

  if (state.status === "lost") {
    audioSystem.playLost();
    showLostOverlay();
  }
}

function highlightWinningCells(cells: [number, number][]): void {
  cells.forEach(([row, col]) => {
    const cell = boardEl.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (cell) {
      cell.classList.add("winning");
    }
  });
}

function clearHint(): void {
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }
  boardEl.querySelectorAll(".hint").forEach((el) => el.classList.remove("hint"));
}

function showHint(): void {
  audioSystem.init();
  clearHint();
  const hintCol = game.getHint();
  if (hintCol === null) return;

  // Find the row where piece would land
  const state = game.getState();
  let targetRow = -1;
  for (let r = 5; r >= 0; r--) {
    if (state.board[r][hintCol] === "empty") {
      targetRow = r;
      break;
    }
  }

  if (targetRow >= 0) {
    const cell = boardEl.querySelector(
      `[data-row="${targetRow}"][data-col="${hintCol}"]`
    );
    if (cell) {
      cell.classList.add("hint");
      hintTimeout = window.setTimeout(clearHint, 3000);

      audioSystem.playHint();

      // Emit hint effect
      const pos = getCellPosition(targetRow, hintCol);
      webgpuRenderer?.emitHint(pos.x, pos.y);
    }
  }
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");

  if (game.getState().level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.level")} ${game.getState().level} ${i18n.t("game.win")}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.nextLevel();
      audioSystem.playLevelStart();
      webgpuRenderer?.emitLevelStart();
    };
  }
}

function showLostOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.level") + " " + game.getState().level;
  overlayMsg.textContent = i18n.t("game.desc");
  startBtn.textContent = i18n.t("game.reset");
  startBtn.onclick = () => {
    overlay.style.display = "none";
    game.reset();
    audioSystem.playReset();
    webgpuRenderer?.emitReset();
  };
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
undoBtn.addEventListener("click", () => {
  audioSystem.init();

  // Get last piece position before undo
  const state = game.getState();
  const lastBoard = state.history[state.history.length - 1];
  if (lastBoard) {
    // Find which piece was added
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        if (state.board[r][c] !== lastBoard[r][c]) {
          const pos = getCellPosition(r, c);
          const isRed = state.board[r][c] === "red";
          webgpuRenderer?.emitUndo(pos.x, pos.y, isRed);
          break;
        }
      }
    }
  }

  game.undo();
  audioSystem.playUndo();
});
hintBtn.addEventListener("click", showHint);
switchBtn.addEventListener("click", () => {
  audioSystem.init();

  const pieceRect = currentPieceEl.getBoundingClientRect();
  const canvasRect = webgpuCanvas?.getBoundingClientRect();
  if (canvasRect) {
    const x = pieceRect.left - canvasRect.left + pieceRect.width / 2;
    const y = pieceRect.top - canvasRect.top + pieceRect.height / 2;
    const toRed = game.getState().currentPiece === "yellow";
    webgpuRenderer?.emitSwitchPiece(x, y, toRed);
  }

  game.switchPiece();
  audioSystem.playSwitch();
});

// Initialize
initI18n();
initWebGPU().then(() => {
  initGame();
});
