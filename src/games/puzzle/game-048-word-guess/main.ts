/**
 * Word Guess Main Entry
 * Secret Agent / Spy Decoder Theme
 * Game #048
 */
import { WordGuessGame, type CellState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Spy/Tech sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Key press - mechanical click
  playKeyPress(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Mechanical click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Delete key - soft click
  playDelete(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Submit guess - data processing sound
  playSubmit(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Ascending sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);

    // Digital blip
    const blip = ctx.createOscillator();
    const blipGain = ctx.createGain();
    blip.type = 'square';
    blip.frequency.value = 1200;
    blipGain.gain.setValueAtTime(0.05, now + 0.1);
    blipGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    blip.connect(blipGain);
    blipGain.connect(ctx.destination);
    blip.start(now + 0.1);
    blip.stop(now + 0.2);
  }

  // Correct letter - positive chime
  playCorrect(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.2);
    });
  }

  // Present letter - medium tone
  playPresent(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = 440;

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Absent letter - low tone
  playAbsent(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 220;

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Invalid word - error buzzer
  playError(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Low buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 150;

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Victory - mission complete fanfare
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Ascending victory melody
    const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.1;
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 1.5;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc2.start(now + delay);
      osc.stop(now + delay + 0.4);
      osc2.stop(now + delay + 0.4);
    });

    // Victory sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(400, now + 0.4);
    sweep.frequency.exponentialRampToValueAtTime(1600, now + 0.8);
    sweepGain.gain.setValueAtTime(0.05, now + 0.4);
    sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    sweep.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweep.start(now + 0.4);
    sweep.stop(now + 0.8);
  }

  // Lose - mission failed
  playLose(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Descending tones
    const notes = [392, 349, 311, 262]; // G4, F4, Eb4, C4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.08, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    });
  }

  // Start game - system boot
  playStart(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Boot sequence
    const freqs = [200, 400, 600, 800];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.06, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.1);
    });
  }

  // Reveal sound for each cell
  playReveal(state: CellState, delay: number): void {
    setTimeout(() => {
      if (state === 'correct') {
        this.playCorrect();
      } else if (state === 'present') {
        this.playPresent();
      } else {
        this.playAbsent();
      }
    }, delay);
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const attemptsDisplay = document.getElementById("attempts-display")!;
const boardEl = document.getElementById("board")!;
const keyboardEl = document.getElementById("keyboard")!;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: WordGuessGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

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

async function initGame() {
  game = new WordGuessGame();

  createBoard();
  createKeyboard();

  // Initialize WebGPU
  if (bgCanvas) {
    renderer = new WebGPURenderer(bgCanvas);
    const success = await renderer.initialize();
    if (success) {
      resizeBgCanvas();
      requestAnimationFrame(function renderLoop() {
        renderer?.render();
        requestAnimationFrame(renderLoop);
      });
    }
  }

  game.setOnStateChange((state: any) => {
    if (state.attempts !== undefined) {
      attemptsDisplay.textContent = state.attempts;
    }

    if (state.board !== undefined) {
      updateBoard(state.board, state.rowRevealed);
    }

    if (state.keyStates !== undefined) {
      updateKeyboard(state.keyStates);
    }

    if (state.cellUpdated !== undefined && renderer) {
      // Emit code particles when typing
      const cell = boardEl.querySelector(
        `[data-row="${state.cellUpdated.row}"][data-col="${state.cellUpdated.col}"]`
      ) as HTMLElement;
      if (cell) {
        const rect = cell.getBoundingClientRect();
        const containerRect = boardEl.getBoundingClientRect();
        const x = (rect.left + rect.width / 2 - containerRect.left) / containerRect.width;
        const y = (rect.top + rect.height / 2 - containerRect.top) / containerRect.height;
        renderer.emitCode(x, y);
      }
    }

    if (state.status === "won") {
      audio.playVictory();
      if (renderer) {
        renderer.emitVictory(0.5, 0.5);
      }
      showResult(true);
    } else if (state.status === "lost") {
      audio.playLose();
      showResult(false, state.targetWord);
    }
  });

  game.setOnInvalidWord(() => {
    audio.playError();
    if (renderer) {
      renderer.emitError(0.5, 0.5);
    }
    showToast(i18n.t("game.notInList"));
    shakeCurrentRow();
  });

  // Physical keyboard
  window.addEventListener("keydown", handleKeydown);

  window.addEventListener("resize", resizeBgCanvas);
}

function resizeBgCanvas() {
  if (bgCanvas && bgCanvas.parentElement) {
    const rect = bgCanvas.parentElement.getBoundingClientRect();
    bgCanvas.width = rect.width;
    bgCanvas.height = rect.height;
  }
}

function createBoard() {
  boardEl.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.row = String(i);

    for (let j = 0; j < 5; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = String(i);
      cell.dataset.col = String(j);
      row.appendChild(cell);
    }

    boardEl.appendChild(row);
  }
}

function createKeyboard() {
  keyboardEl.innerHTML = "";

  for (const row of KEYBOARD_ROWS) {
    const rowEl = document.createElement("div");
    rowEl.className = "keyboard-row";

    for (const key of row) {
      const keyEl = document.createElement("button");
      keyEl.className = "key";
      keyEl.textContent = key;
      keyEl.dataset.key = key;

      if (key === "ENTER" || key === "⌫") {
        keyEl.classList.add("wide");
      }

      keyEl.addEventListener("click", () => handleKeyClick(key));
      rowEl.appendChild(keyEl);
    }

    keyboardEl.appendChild(rowEl);
  }
}

function handleKeyClick(key: string) {
  if (key === "ENTER") {
    audio.playSubmit();
    if (renderer) {
      renderer.emitSubmit(0.5, 0.5);
    }
    game.submitGuess();
  } else if (key === "⌫") {
    audio.playDelete();
    game.deleteLetter();
  } else {
    audio.playKeyPress();
    game.inputLetter(key);
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (overlay.style.display !== "none") return;

  if (e.key === "Enter") {
    audio.playSubmit();
    if (renderer) {
      renderer.emitSubmit(0.5, 0.5);
    }
    game.submitGuess();
  } else if (e.key === "Backspace") {
    audio.playDelete();
    game.deleteLetter();
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    audio.playKeyPress();
    game.inputLetter(e.key);
  }
}

function updateBoard(board: any[][], rowRevealed?: number) {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      const cell = boardEl.querySelector(`[data-row="${i}"][data-col="${j}"]`) as HTMLElement;
      if (cell) {
        cell.textContent = board[i][j].letter;

        // Remove old state classes
        cell.classList.remove("empty", "filled", "correct", "present", "absent");

        // Add new state class
        cell.classList.add(board[i][j].state);

        // Add reveal animation delay for revealed row
        if (rowRevealed !== undefined && i === rowRevealed) {
          cell.style.animationDelay = `${j * 0.2}s`;

          // Play reveal sounds and emit particles
          const state = board[i][j].state as CellState;
          audio.playReveal(state, j * 200);

          // Emit decrypt particles for revealed cells
          if (renderer) {
            setTimeout(() => {
              const rect = cell.getBoundingClientRect();
              const containerRect = boardEl.getBoundingClientRect();
              const x = (rect.left + rect.width / 2 - containerRect.left) / containerRect.width;
              const y = (rect.top + rect.height / 2 - containerRect.top) / containerRect.height;

              if (state === 'correct') {
                renderer?.emitCorrect(x, y);
              } else {
                renderer?.emitDecrypt(x, y);
              }
            }, j * 200);
          }
        }
      }
    }
  }
}

function updateKeyboard(keyStates: { [key: string]: CellState }) {
  for (const [key, state] of Object.entries(keyStates)) {
    const keyEl = keyboardEl.querySelector(`[data-key="${key}"]`) as HTMLElement;
    if (keyEl) {
      keyEl.classList.remove("correct", "present", "absent");
      keyEl.classList.add(state);
    }
  }
}

function shakeCurrentRow() {
  const currentRow = game.getCurrentRow();
  const rowEl = boardEl.querySelector(`[data-row="${currentRow}"]`) as HTMLElement;
  if (rowEl) {
    rowEl.classList.add("shake");
    setTimeout(() => rowEl.classList.remove("shake"), 300);
  }
}

function showToast(message: string) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.querySelector(".game-area")!.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

function showResult(won: boolean, targetWord?: string) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (won) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = "";
    } else {
      overlayTitle.textContent = i18n.t("game.lose");
      overlayMsg.textContent = `${i18n.t("game.theWord")}: ${targetWord}`;
    }

    startBtn.textContent = i18n.t("game.playAgain");
    startBtn.onclick = startGame;
  }, 1500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playStart();
  createBoard();
  createKeyboard();
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", startGame);

// Init
initI18n();
initGame();
