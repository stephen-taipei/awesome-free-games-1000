/**
 * Dice Puzzle Main Entry
 * Game #098 - With WebGPU Effects
 */
import { DiceGame, GameState, Direction, DiceState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System for Casino / Dice sounds
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

  // Dice roll - tumbling sound
  playRoll() {
    if (!this.audioContext) return;

    // Create rumble effect
    const noise = this.audioContext.createBufferSource();
    const bufferSize = this.audioContext.sampleRate * 0.15;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15);

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    noise.start();

    // Add wooden thunk
    setTimeout(() => {
      this.playTone(150, 0.08, "sine", 0.15);
      this.playTone(100, 0.1, "triangle", 0.1);
    }, 100);
  }

  // Dice lands - solid thunk
  playLand(topValue: number) {
    if (!this.audioContext) return;

    // Different pitch based on dice value
    const baseFreq = 120 + topValue * 15;
    this.playTone(baseFreq, 0.12, "sine", 0.18);
    this.playTone(baseFreq * 0.5, 0.15, "triangle", 0.12);

    // Small click
    setTimeout(() => {
      this.playTone(600, 0.03, "square", 0.05);
    }, 50);
  }

  // Blocked - error sound
  playBlocked() {
    if (!this.audioContext) return;

    this.playTone(200, 0.1, "square", 0.1);
    setTimeout(() => this.playTone(150, 0.12, "square", 0.08), 80);
  }

  // Victory - casino jackpot sound
  playVictory() {
    if (!this.audioContext) return;

    // Ascending triumphant melody
    const melody = [523, 659, 784, 1047, 1319, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, "sine", 0.12);
        // Add harmony
        if (i > 2) {
          this.playTone(freq * 0.75, 0.15, "triangle", 0.08);
        }
      }, i * 80);
    });

    // Coin sounds
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.playTone(2000 + Math.random() * 1000, 0.05, "sine", 0.06);
      }, 200 + i * 60);
    }
  }

  // Level start - casino game start
  playLevelStart() {
    if (!this.audioContext) return;

    this.playTone(400, 0.1, "sine", 0.1);
    setTimeout(() => this.playTone(500, 0.1, "sine", 0.12), 100);
    setTimeout(() => this.playTone(600, 0.12, "sine", 0.13), 200);
    setTimeout(() => this.playTone(800, 0.15, "sine", 0.15), 300);
  }

  // Reset - shuffle sound
  playReset() {
    if (!this.audioContext) return;

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playTone(300 - i * 40, 0.08, "triangle", 0.08);
      }, i * 50);
    }
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const targetDisplay = document.getElementById("target-display")!;
const boardEl = document.getElementById("board")!;
const diceEl = document.getElementById("dice")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const upBtn = document.getElementById("up-btn")!;
const downBtn = document.getElementById("down-btn")!;
const leftBtn = document.getElementById("left-btn")!;
const rightBtn = document.getElementById("right-btn")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: DiceGame;
let webgpuRenderer: WebGPURenderer | null = null;
const audioSystem = new AudioSystem();
let isAnimating = false;

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

function getCellPosition(row: number, col: number): { x: number; y: number } {
  const cells = boardEl.querySelectorAll(".cell");
  const { cols } = game.getGridSize();
  const idx = row * cols + col;
  const cell = cells[idx] as HTMLElement;

  if (!cell || !webgpuCanvas) return { x: 0, y: 0 };

  const cellRect = cell.getBoundingClientRect();
  const canvasRect = webgpuCanvas.getBoundingClientRect();

  return {
    x: cellRect.left - canvasRect.left + cellRect.width / 2,
    y: cellRect.top - canvasRect.top + cellRect.height / 2,
  };
}

function initGame(): void {
  game = new DiceGame();

  game.onStateChange = (state: GameState) => {
    renderBoard(state);
    renderDice(state.dice);
    updateUI(state);

    if (state.status === "won") {
      audioSystem.playVictory();
      webgpuRenderer?.emitVictory();
      setTimeout(() => showWinOverlay(), 600);
    }
  };

  // Keyboard controls
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", resizeWebGPU);
}

function createBoard(rows: number, cols: number): void {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell empty";
      cell.dataset.row = r.toString();
      cell.dataset.col = c.toString();
      boardEl.appendChild(cell);
    }
  }
}

function renderBoard(state: GameState): void {
  const { rows, cols } = game.getGridSize();

  // Recreate board if size changed
  if (boardEl.children.length !== rows * cols) {
    createBoard(rows, cols);
  }

  const cells = boardEl.querySelectorAll(".cell");
  const [diceRow, diceCol] = state.dicePos;
  const [goalRow, goalCol] = state.goal;

  cells.forEach((cell) => {
    const r = parseInt(cell.getAttribute("data-row")!);
    const c = parseInt(cell.getAttribute("data-col")!);
    const idx = r * cols + c;
    const cellType = state.grid[r][c];

    cell.className = "cell";

    if (r === diceRow && c === diceCol) {
      cell.classList.add("dice");
      cell.textContent = state.dice.top.toString();
    } else if (cellType === "goal") {
      cell.classList.add("goal");
      cell.textContent = state.targetValue.toString();
    } else if (cellType === "blocked") {
      cell.classList.add("blocked");
      cell.textContent = "";
    } else {
      cell.classList.add("empty");
      cell.textContent = "";
    }
  });
}

function renderDice(dice: DiceState): void {
  const faces = diceEl.querySelectorAll(".dice-face");

  const faceMap: { [key: string]: number } = {
    front: dice.front,
    back: dice.back,
    right: dice.right,
    left: dice.left,
    top: dice.top,
    bottom: dice.bottom,
  };

  faces.forEach((face) => {
    const faceType = face.classList[1]; // front, back, etc.
    const value = faceMap[faceType] || 1;
    face.innerHTML = createDots(value);
  });
}

function createDots(value: number): string {
  let dots = "";
  const positions: { [key: number]: string[] } = {
    1: ["center"],
    2: ["top-right", "bottom-left"],
    3: ["top-right", "center", "bottom-left"],
    4: ["top-left", "top-right", "bottom-left", "bottom-right"],
    5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
    6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"],
  };

  const pos = positions[value] || [];
  pos.forEach(() => {
    dots += '<span class="dot"></span>';
  });

  return dots;
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  movesDisplay.textContent = state.moves.toString();
  targetDisplay.textContent = state.targetValue.toString();
}

function handleKeydown(e: KeyboardEvent): void {
  if (game.getState().status !== "playing" || isAnimating) return;

  let dir: Direction | null = null;

  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      dir = "up";
      break;
    case "ArrowDown":
    case "s":
    case "S":
      dir = "down";
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      dir = "left";
      break;
    case "ArrowRight":
    case "d":
    case "D":
      dir = "right";
      break;
  }

  if (dir) {
    e.preventDefault();
    moveWithAnimation(dir);
  }
}

function moveWithAnimation(dir: Direction): void {
  if (isAnimating) return;

  audioSystem.init();
  isAnimating = true;

  const state = game.getState();
  const [oldRow, oldCol] = state.dicePos;
  const oldPos = getCellPosition(oldRow, oldCol);

  // Emit roll effect
  audioSystem.playRoll();
  webgpuRenderer?.emitDiceRoll(oldPos.x, oldPos.y, dir);

  // Add animation class to dice preview
  diceEl.classList.add(`roll-${dir}`);

  setTimeout(() => {
    const moved = game.move(dir);
    diceEl.classList.remove(`roll-${dir}`);

    if (moved) {
      const newState = game.getState();
      const newPos = getCellPosition(newState.dicePos[0], newState.dicePos[1]);

      audioSystem.playLand(newState.dice.top);
      webgpuRenderer?.emitDiceLand(newPos.x, newPos.y, newState.dice.top);
    } else {
      // Blocked
      audioSystem.playBlocked();
      webgpuRenderer?.emitBlocked(oldPos.x, oldPos.y);
    }

    isAnimating = false;
  }, 400);
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

upBtn.addEventListener("click", () => moveWithAnimation("up"));
downBtn.addEventListener("click", () => moveWithAnimation("down"));
leftBtn.addEventListener("click", () => moveWithAnimation("left"));
rightBtn.addEventListener("click", () => moveWithAnimation("right"));

// Initialize
initI18n();
initWebGPU().then(() => {
  initGame();
});
