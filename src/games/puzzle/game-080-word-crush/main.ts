/**
 * Word Crush Main Entry
 * Game #080 - Literary / Typography Theme
 */
import { WordCrushGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const scoreDisplay = document.getElementById("score-display")!;
const wordsDisplay = document.getElementById("words-display")!;
const currentWordDisplay = document.getElementById("current-word")!;
const letterGrid = document.getElementById("letter-grid")!;
const foundWordsContainer = document.getElementById("found-words")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: WordCrushGame;
let renderer: WebGPURenderer | null = null;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
  }

  playSelect(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playContinue(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(500 + Math.random() * 200, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playValidWord(wordLength: number): void {
    this.init();
    if (!this.ctx) return;

    // Ascending chord based on word length
    const baseFreq = 300 + wordLength * 50;
    const notes = [1, 1.25, 1.5, 1.875];

    notes.forEach((mult, i) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq * mult, this.ctx!.currentTime);

      gainNode.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.05);
      gainNode.gain.linearRampToValueAtTime(0.15, this.ctx!.currentTime + i * 0.05 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.4);

      osc.connect(gainNode);
      gainNode.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + i * 0.05);
      osc.stop(this.ctx!.currentTime + 0.5);
    });
  }

  playInvalidWord(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playLetterRemove(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playNewLetter(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(500, this.ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playGameStart(): void {
    this.init();
    if (!this.ctx) return;

    const melody = [523.25, 659.25, 783.99];
    melody.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.1);

      gainNode.gain.setValueAtTime(0.2, this.ctx!.currentTime + i * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + i * 0.1 + 0.2);

      osc.connect(gainNode);
      gainNode.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + i * 0.1);
      osc.stop(this.ctx!.currentTime + i * 0.1 + 0.25);
    });
  }

  playReset(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }
}

const audio = new AudioSystem();

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

async function initWebGPU() {
  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();
  if (!success) {
    webgpuCanvas.style.display = "none";
  }
  return success;
}

function initGame() {
  game = new WordCrushGame();

  game.setOnStateChange((state: GameState) => {
    scoreDisplay.textContent = state.score.toString();
    wordsDisplay.textContent = state.wordsFound.toString();
    currentWordDisplay.textContent = state.currentWord;

    const gridRect = letterGrid.getBoundingClientRect();
    const cx = gridRect.left + gridRect.width / 2;
    const cy = gridRect.top + gridRect.height / 2;

    // Handle events
    if (state.event) {
      switch (state.event) {
        case "select":
          audio.playSelect();
          if (state.cellX !== undefined && state.cellY !== undefined) {
            const cellX = gridRect.left + (state.cellX + 0.5) * (gridRect.width / 5);
            const cellY = gridRect.top + (state.cellY + 0.5) * (gridRect.height / 5);
            renderer?.emitSelect(cellX, cellY);
          }
          break;
        case "continue":
          audio.playContinue();
          if (state.cellX !== undefined && state.cellY !== undefined) {
            const cellX = gridRect.left + (state.cellX + 0.5) * (gridRect.width / 5);
            const cellY = gridRect.top + (state.cellY + 0.5) * (gridRect.height / 5);
            renderer?.emitContinue(cellX, cellY);
          }
          break;
        case "validWord":
          audio.playValidWord(state.wordLength || 3);
          renderer?.emitValidWord(cx, cy, state.wordLength || 3);
          break;
        case "invalidWord":
          audio.playInvalidWord();
          renderer?.emitInvalidWord(cx, cy);
          break;
        case "letterRemove":
          audio.playLetterRemove();
          if (state.cellX !== undefined && state.cellY !== undefined) {
            const cellX = gridRect.left + (state.cellX + 0.5) * (gridRect.width / 5);
            const cellY = gridRect.top + (state.cellY + 0.5) * (gridRect.height / 5);
            renderer?.emitLetterRemove(cellX, cellY);
          }
          break;
        case "newLetter":
          audio.playNewLetter();
          if (state.cellX !== undefined && state.cellY !== undefined) {
            const cellX = gridRect.left + (state.cellX + 0.5) * (gridRect.width / 5);
            const cellY = gridRect.top + (state.cellY + 0.5) * (gridRect.height / 5);
            renderer?.emitNewLetter(cellX, cellY);
          }
          break;
        case "selectionEnd":
          renderer?.emitSelectionEnd();
          break;
        case "gameStart":
          audio.playGameStart();
          renderer?.emitGameStart(cx, cy);
          break;
        case "reset":
          audio.playReset();
          renderer?.emitReset();
          break;
      }
    }
  });

  game.setOnGridUpdate(() => {
    renderGrid();
  });
}

function renderGrid() {
  letterGrid.innerHTML = "";
  const grid = game.getGrid();

  grid.forEach((row, y) => {
    row.forEach((cell, x) => {
      const cellEl = document.createElement("div");
      cellEl.className = "letter-cell" + (cell.selected ? " selected" : "");
      cellEl.textContent = cell.letter;
      cellEl.dataset.x = x.toString();
      cellEl.dataset.y = y.toString();
      letterGrid.appendChild(cellEl);
    });
  });
}

function getCellFromEvent(e: MouseEvent | Touch): { x: number; y: number } | null {
  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (target && target.classList.contains("letter-cell")) {
    const x = parseInt(target.getAttribute("data-x") || "-1");
    const y = parseInt(target.getAttribute("data-y") || "-1");
    if (x >= 0 && y >= 0) {
      return { x, y };
    }
  }
  return null;
}

function setupInputHandlers() {
  // Mouse events
  letterGrid.addEventListener("mousedown", (e) => {
    const cell = getCellFromEvent(e);
    if (cell) {
      game.startSelection(cell.x, cell.y);
    }
  });

  document.addEventListener("mousemove", (e) => {
    const cell = getCellFromEvent(e);
    if (cell) {
      game.continueSelection(cell.x, cell.y);
    }
  });

  document.addEventListener("mouseup", () => {
    const result = game.endSelection();
    if (result.word.length >= 3) {
      showWordResult(result.valid, result.word);
    }
  });

  // Touch events
  letterGrid.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = getCellFromEvent(touch);
    if (cell) {
      game.startSelection(cell.x, cell.y);
    }
  });

  document.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    const cell = getCellFromEvent(touch);
    if (cell) {
      game.continueSelection(cell.x, cell.y);
    }
  });

  document.addEventListener("touchend", () => {
    const result = game.endSelection();
    if (result.word.length >= 3) {
      showWordResult(result.valid, result.word);
    }
  });
}

function showWordResult(valid: boolean, word: string) {
  if (valid) {
    // Add to found words display
    const wordEl = document.createElement("span");
    wordEl.className = "found-word";
    wordEl.textContent = word;
    foundWordsContainer.appendChild(wordEl);

    // Flash valid
    const cells = letterGrid.querySelectorAll(".letter-cell");
    cells.forEach((cell) => {
      if (cell.classList.contains("selected")) {
        cell.classList.add("valid");
        setTimeout(() => cell.classList.remove("valid"), 300);
      }
    });
  } else {
    // Flash invalid
    currentWordDisplay.style.color = "#e74c3c";
    setTimeout(() => {
      currentWordDisplay.style.color = "";
    }, 300);
  }
}

function startGame() {
  overlay.style.display = "none";
  foundWordsContainer.innerHTML = "";
  game.start();
  renderGrid();
  setupInputHandlers();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  foundWordsContainer.innerHTML = "";
  game.reset();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
