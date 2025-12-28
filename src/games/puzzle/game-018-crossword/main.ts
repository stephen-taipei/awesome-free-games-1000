/**
 * Crossword Main Entry - WebGPU Enhanced
 * Cyber Cipher Theme
 * Game #018
 */
import { CrosswordGame, type CrosswordWord } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer, type CellData } from "./webgpu/renderer";

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

  // Key press - cipher input
  playInput(): void {
    const freq = 400 + Math.random() * 200;
    this.playTone(freq, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(freq * 1.2, 0.05, 'sine', 0.06), 30);
  }

  // Correct letter - decryption success
  playCorrect(): void {
    this.playTone(523, 0.12, 'sine', 0.12);
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.1), 60);
    setTimeout(() => this.playTone(784, 0.15, 'triangle', 0.08), 120);
  }

  // Wrong letter - error
  playWrong(): void {
    this.playTone(200, 0.12, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(180, 0.1, 'sawtooth', 0.06), 80);
  }

  // Puzzle complete - full decryption
  playComplete(): void {
    const melody = [523, 659, 784, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sine', 0.15);
        this.playTone(freq * 0.5, 0.3, 'triangle', 0.08);
      }, i * 120);
    });

    // Success shimmer
    setTimeout(() => {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          this.playTone(1000 + Math.random() * 1000, 0.1, 'sine', 0.05);
        }, i * 40);
      }
    }, 700);
  }

  // Focus cell
  playFocus(): void {
    this.playTone(300, 0.05, 'sine', 0.05);
  }

  // Reset
  playReset(): void {
    const notes = [500, 400, 300];
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
const gridContainer = document.getElementById("crossword-grid") as HTMLElement;
const gameArea = document.querySelector(".grid-area") as HTMLElement;
const cluesAcross = document.getElementById("clues-across")!;
const cluesDown = document.getElementById("clues-down")!;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const resetBtn = document.getElementById("reset-btn")!;
const checkBtn = document.getElementById("check-btn")!;

// =====================
// Global Variables
// =====================
let game: CrosswordGame;
let renderer: WebGPURenderer | null = null;
let audio: AudioSystem;
let useWebGPU = false;
let animationId: number | null = null;
let lastTime = 0;

let inputs: HTMLInputElement[][] = [];
let focusedCell: { r: number; c: number } | null = null;
let cellStates: Map<string, number> = new Map(); // "r,c" -> state
let isVictory = false;
let victoryAnimProgress = 0;

// Navigation State
let currentDirection: "across" | "down" = "across";

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
  canvas.width = 400;
  canvas.height = 320;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';

  gameArea.style.position = 'relative';
  gameArea.insertBefore(canvas, gameArea.firstChild);

  renderer = new WebGPURenderer(canvas);
  useWebGPU = await renderer.init();

  if (useWebGPU) {
    console.log('WebGPU renderer initialized');
    gridContainer.style.opacity = '0.001';
    canvas.style.pointerEvents = 'none';
  } else {
    console.log('Falling back to CSS');
    renderer = null;
    canvas.remove();
  }
}

function initGame() {
  game = new CrosswordGame();

  if (renderer) {
    renderer.setGridSize(game.level.cols, game.level.rows);
  }

  renderGrid();
  renderClues();

  game.setOnStateChange((status) => {
    if (status === "won" && !isVictory) {
      isVictory = true;
      victoryAnimProgress = 0;
      audio.playComplete();
      if (renderer) {
        renderer.emitComplete();
      }
      showWin();
    }
  });
}

function renderGrid() {
  const level = game.level;
  gridContainer.style.gridTemplateColumns = `repeat(${level.cols}, 30px)`;
  gridContainer.innerHTML = "";
  inputs = Array(level.rows)
    .fill(null)
    .map(() => Array(level.cols).fill(null));
  cellStates.clear();

  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const cellInfo = game.getCellInfo(r, c);
      const cellDiv = document.createElement("div");
      cellDiv.className = "cell";

      if (!cellInfo) {
        cellDiv.classList.add("blocked");
        cellStates.set(`${r},${c}`, 4); // Blocked state
      } else {
        cellStates.set(`${r},${c}`, 0); // Empty state

        if (cellInfo.startNum) {
          const numSpan = document.createElement("span");
          numSpan.className = "cell-number";
          numSpan.textContent = cellInfo.startNum.toString();
          cellDiv.appendChild(numSpan);
        }

        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = 1;
        input.className = "cell-input";

        input.addEventListener("input", (e) => handleInput(e, r, c));
        input.addEventListener("keydown", (e) => handleKey(e, r, c));
        input.addEventListener("focus", () => {
          focusedCell = { r, c };
          audio.playFocus();
          highlightClue(cellInfo.words);
        });
        input.addEventListener("blur", () => {
          if (focusedCell?.r === r && focusedCell?.c === c) {
            focusedCell = null;
          }
        });

        inputs[r][c] = input;
        cellDiv.appendChild(input);
      }
      gridContainer.appendChild(cellDiv);
    }
  }
}

function renderClues() {
  cluesAcross.innerHTML = "";
  cluesDown.innerHTML = "";

  game.level.words.forEach((w) => {
    const li = document.createElement("li");
    li.textContent = `${w.id}. ${w.clue}`;
    li.id = `clue-${w.id}`;

    if (w.direction === "across") cluesAcross.appendChild(li);
    else cluesDown.appendChild(li);

    li.addEventListener("click", () => {
      if (inputs[w.row][w.col]) inputs[w.row][w.col].focus();
    });
  });
}

function handleInput(e: Event, r: number, c: number) {
  const input = e.target as HTMLInputElement;
  const val = input.value;

  if (val.match(/[a-zA-Z]/)) {
    game.setUserInput(r, c, val);
    cellStates.set(`${r},${c}`, 1); // Filled state
    audio.playInput();

    // Emit particle
    if (renderer) {
      const normX = (c + 0.5) / game.level.cols;
      const normY = (r + 0.5) / game.level.rows;
      renderer.emitInput(normX, normY);
    }

    moveFocus(r, c, 1);
  } else {
    input.value = "";
  }
}

function handleKey(e: KeyboardEvent, r: number, c: number) {
  const input = e.target as HTMLInputElement;

  if (e.key === "Backspace") {
    if (input.value === "") {
      moveFocus(r, c, -1);
    } else {
      input.value = "";
      game.setUserInput(r, c, "");
      cellStates.set(`${r},${c}`, 0); // Empty state
    }
  } else if (e.key === "ArrowRight") {
    findNextFocus(r, c, 0, 1);
  } else if (e.key === "ArrowLeft") {
    findNextFocus(r, c, 0, -1);
  } else if (e.key === "ArrowDown") {
    findNextFocus(r, c, 1, 0);
  } else if (e.key === "ArrowUp") {
    findNextFocus(r, c, -1, 0);
  }
}

function moveFocus(r: number, c: number, dist: number) {
  if (currentDirection === "across") {
    const nextC = c + dist;
    if (inputs[r] && inputs[r][nextC]) {
      inputs[r][nextC].focus();
    }
  } else {
    const nextR = r + dist;
    if (inputs[nextR] && inputs[nextR][c]) {
      inputs[nextR][c].focus();
    }
  }
}

function findNextFocus(r: number, c: number, dr: number, dc: number) {
  const nr = r + dr;
  const nc = c + dc;
  if (inputs[nr] && inputs[nr][nc]) {
    inputs[nr][nc].focus();
    if (dr !== 0) currentDirection = "down";
    if (dc !== 0) currentDirection = "across";
  }
}

function highlightClue(words: CrosswordWord[]) {
  document.querySelectorAll(".clue-section li").forEach((l) => l.classList.remove("active"));

  words.forEach((w) => {
    const el = document.getElementById(`clue-${w.id}`);
    if (el) el.classList.add("active");

    if (words.length === 1) currentDirection = words[0].direction;
  });
}

// =====================
// Game Flow
// =====================
function startGame() {
  overlay.style.display = "none";
  game.reset();
  document.querySelectorAll("input").forEach((i) => (i.value = ""));
  document.querySelectorAll(".cell").forEach((c) => c.classList.remove("correct", "wrong"));

  isVictory = false;
  victoryAnimProgress = 0;
  cellStates.clear();

  // Reinitialize cell states
  for (let r = 0; r < game.level.rows; r++) {
    for (let c = 0; c < game.level.cols; c++) {
      const cellInfo = game.getCellInfo(r, c);
      cellStates.set(`${r},${c}`, cellInfo ? 0 : 4);
    }
  }

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
    overlayMsg.textContent = i18n.t("game.desc");
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

  // Update victory animation
  if (isVictory && victoryAnimProgress < 1) {
    victoryAnimProgress = Math.min(1, victoryAnimProgress + deltaTime * 0.001);
    if (renderer) {
      renderer.setVictory(victoryAnimProgress, 0.5, 0.5);
    }
  }

  // WebGPU rendering
  if (renderer && useWebGPU) {
    const cellData = getCellDataForRenderer();
    renderer.updateCells(cellData);
    renderer.render(deltaTime);
  }

  animationId = requestAnimationFrame(gameLoop);
}

function getCellDataForRenderer(): CellData[] {
  const level = game.level;
  const cellWidth = 400 / level.cols;
  const cellHeight = 320 / level.rows;
  const padding = 2;

  const cells: CellData[] = [];
  let letterIndex = 0;

  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const state = cellStates.get(`${r},${c}`) ?? 0;

      // Check if this is a word start
      const cellInfo = game.getCellInfo(r, c);
      const wordStart = cellInfo?.startNum ? 1 : 0;

      // Check focus
      const isFocused = focusedCell?.r === r && focusedCell?.c === c;

      cells.push({
        x: c * cellWidth + padding,
        y: r * cellHeight + padding,
        width: cellWidth - padding * 2,
        height: cellHeight - padding * 2,
        state,
        focusProgress: isFocused ? 1 : 0,
        letterIndex: letterIndex++,
        wordStart,
      });
    }
  }

  return cells;
}

// =====================
// Event Listeners
// =====================
startBtn.addEventListener("click", startGame);

resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
  document.querySelectorAll("input").forEach((i) => (i.value = ""));
  document.querySelectorAll(".cell").forEach((c) => c.classList.remove("correct", "wrong"));

  isVictory = false;
  victoryAnimProgress = 0;

  // Reinitialize cell states
  for (let r = 0; r < game.level.rows; r++) {
    for (let c = 0; c < game.level.cols; c++) {
      const cellInfo = game.getCellInfo(r, c);
      cellStates.set(`${r},${c}`, cellInfo ? 0 : 4);
    }
  }

  if (renderer) {
    renderer.clearParticles();
    renderer.setVictory(0, 0.5, 0.5);
  }
});

checkBtn.addEventListener("click", () => {
  const correct = game.checkWin();

  if (correct) {
    game.setState("won");
  } else {
    // Check each cell and update state
    game.level.words.forEach((w) => {
      for (let i = 0; i < w.answer.length; i++) {
        let r = w.row;
        let c = w.col;
        if (w.direction === "across") c += i;
        else r += i;

        const val = game.userGrid[r][c];
        const expected = w.answer[i];

        if (val !== expected && inputs[r][c]) {
          inputs[r][c].parentElement?.classList.add("wrong");
          inputs[r][c].parentElement?.classList.remove("correct");
          cellStates.set(`${r},${c}`, 3); // Wrong state
          audio.playWrong();

          if (renderer) {
            const normX = (c + 0.5) / game.level.cols;
            const normY = (r + 0.5) / game.level.rows;
            renderer.emitWrong(normX, normY);
          }
        } else if (inputs[r][c]) {
          inputs[r][c].parentElement?.classList.add("correct");
          inputs[r][c].parentElement?.classList.remove("wrong");
          cellStates.set(`${r},${c}`, 2); // Correct state

          if (renderer) {
            const normX = (c + 0.5) / game.level.cols;
            const normY = (r + 0.5) / game.level.rows;
            renderer.emitCorrect(normX, normY);
          }
        }
      }
    });
  }
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

  audio = new AudioSystem();

  const initAudioOnInteraction = async () => {
    await audio.init();
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('touchstart', initAudioOnInteraction);
  };
  document.addEventListener('click', initAudioOnInteraction);
  document.addEventListener('touchstart', initAudioOnInteraction);

  await initRenderer();
  initGame();
  createSoundToggle();

  if (!animationId) {
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

main();
