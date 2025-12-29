/**
 * Combination Lock Main Entry
 * Game #100 - With WebGPU Effects
 */
import { CombinationGame, GameState, Hint, HintType } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System for Vault / Safe-Cracking sounds
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

  // Dial click - mechanical tumbler sound
  playDialClick(direction: number) {
    if (!this.audioContext) return;

    const baseFreq = direction > 0 ? 600 : 500;

    // Metallic click
    this.playTone(baseFreq, 0.05, "square", 0.08);
    setTimeout(() => {
      this.playTone(baseFreq * 1.5, 0.03, "triangle", 0.06);
    }, 20);

    // Mechanical thunk
    this.playTone(120, 0.08, "sine", 0.1);
  }

  // Check attempt - suspenseful
  playCheck() {
    if (!this.audioContext) return;

    // Tumbler testing sounds
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(300 + i * 100, 0.1, "triangle", 0.08);
      }, i * 80);
    }
  }

  // Wrong guess - clunk/reject
  playWrong() {
    if (!this.audioContext) return;

    // Harsh rejection sound
    this.playTone(150, 0.15, "sawtooth", 0.1);
    this.playTone(100, 0.2, "sine", 0.12);

    setTimeout(() => {
      this.playTone(80, 0.15, "triangle", 0.08);
    }, 100);
  }

  // Correct digit - satisfying click
  playCorrect() {
    if (!this.audioContext) return;

    // Satisfying tumbler fall
    this.playTone(800, 0.1, "sine", 0.12);
    setTimeout(() => this.playTone(1000, 0.1, "sine", 0.14), 60);
    setTimeout(() => this.playTone(1200, 0.12, "sine", 0.12), 120);
  }

  // Lock opens - victory!
  playUnlock() {
    if (!this.audioContext) return;

    // Mechanical release
    this.playTone(200, 0.2, "triangle", 0.15);

    // Shackle pop
    setTimeout(() => {
      this.playTone(400, 0.1, "sine", 0.12);
      this.playTone(600, 0.15, "sine", 0.1);
    }, 150);

    // Victory melody
    const melody = [523, 659, 784, 1047, 1319, 1568];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "sine", 0.12);
        if (i > 2) {
          this.playTone(freq * 0.5, 0.2, "triangle", 0.06);
        }
      }, 300 + i * 100);
    });

    // Coin/treasure sounds
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playTone(2000 + Math.random() * 1000, 0.15, "sine", 0.06);
      }, 500 + i * 80);
    }
  }

  // Level start
  playLevelStart() {
    if (!this.audioContext) return;

    // Lock engagement sound
    this.playTone(200, 0.1, "triangle", 0.08);
    setTimeout(() => this.playTone(300, 0.1, "sine", 0.1), 100);
    setTimeout(() => this.playTone(400, 0.12, "sine", 0.12), 200);

    // Dial reset
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.playTone(500 + i * 50, 0.03, "square", 0.05);
        }, i * 30);
      }
    }, 300);
  }

  // Reset - dials spinning back
  playReset() {
    if (!this.audioContext) return;

    // Rapid dial spins
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        this.playTone(400 - i * 30, 0.04, "square", 0.06);
      }, i * 40);
    }

    // Lock re-engage
    setTimeout(() => {
      this.playTone(150, 0.15, "triangle", 0.1);
    }, 350);
  }
}

// Elements
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const attemptsDisplay = document.getElementById("attempts-display")!;
const dialsEl = document.getElementById("dials")!;
const hintsListEl = document.getElementById("hints-list")!;
const lockShackle = document.getElementById("lock-shackle")!;
const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const checkBtn = document.getElementById("check-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;

let game: CombinationGame;
let webgpuRenderer: WebGPURenderer | null = null;
const audioSystem = new AudioSystem();

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
    renderHints(game.getState().hints);
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

function getDialPosition(index: number): { x: number; y: number } {
  const dialEl = document.querySelector(`[data-index="${index}"]`);
  if (!dialEl || !webgpuCanvas) return { x: 0, y: 0 };

  const dialRect = dialEl.getBoundingClientRect();
  const canvasRect = webgpuCanvas.getBoundingClientRect();

  return {
    x: dialRect.left - canvasRect.left + dialRect.width / 2,
    y: dialRect.top - canvasRect.top + dialRect.height / 2,
  };
}

function getLockPosition(): { x: number; y: number } {
  const lockEl = document.querySelector(".lock-body");
  if (!lockEl || !webgpuCanvas) return { x: 0, y: 0 };

  const lockRect = lockEl.getBoundingClientRect();
  const canvasRect = webgpuCanvas.getBoundingClientRect();

  return {
    x: lockRect.left - canvasRect.left + lockRect.width / 2,
    y: lockRect.top - canvasRect.top + lockRect.height / 2,
  };
}

function initGame(): void {
  game = new CombinationGame();

  game.onStateChange = (state: GameState) => {
    renderDials(state);
    renderHints(state.hints);
    updateUI(state);

    if (state.status === "won") {
      audioSystem.playUnlock();
      const pos = getLockPosition();
      webgpuRenderer?.emitUnlock(pos.x, pos.y);
      lockShackle.classList.add("unlocked");
      setTimeout(() => showWinOverlay(), 800);
    }
  };

  // Window resize handler
  window.addEventListener("resize", resizeWebGPU);
}

function createDials(count: number): void {
  dialsEl.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const dial = document.createElement("div");
    dial.className = "dial";
    dial.dataset.index = i.toString();

    const inner = document.createElement("div");
    inner.className = "dial-inner";

    const number = document.createElement("div");
    number.className = "dial-number";
    number.id = `dial-${i}-number`;
    number.textContent = "0";

    inner.appendChild(number);
    dial.appendChild(inner);

    // Controls
    const controls = document.createElement("div");
    controls.className = "dial-controls";

    const upBtn = document.createElement("button");
    upBtn.className = "dial-btn";
    upBtn.innerHTML = "&#9650;";
    upBtn.addEventListener("click", () => {
      audioSystem.init();
      audioSystem.playDialClick(1);
      const pos = getDialPosition(i);
      webgpuRenderer?.emitDialClick(pos.x, pos.y, 1);
      game.incrementDial(i);
    });

    const downBtn = document.createElement("button");
    downBtn.className = "dial-btn";
    downBtn.innerHTML = "&#9660;";
    downBtn.addEventListener("click", () => {
      audioSystem.init();
      audioSystem.playDialClick(-1);
      const pos = getDialPosition(i);
      webgpuRenderer?.emitDialClick(pos.x, pos.y, -1);
      game.decrementDial(i);
    });

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    dial.appendChild(controls);

    // Indicator
    const indicator = document.createElement("div");
    indicator.className = "dial-indicator";
    dial.appendChild(indicator);

    // Touch/scroll support
    let startY = 0;
    dial.addEventListener("touchstart", (e) => {
      startY = e.touches[0].clientY;
    });

    dial.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const deltaY = startY - e.touches[0].clientY;
      if (Math.abs(deltaY) > 20) {
        audioSystem.init();
        const pos = getDialPosition(i);
        if (deltaY > 0) {
          audioSystem.playDialClick(1);
          webgpuRenderer?.emitDialClick(pos.x, pos.y, 1);
          game.incrementDial(i);
        } else {
          audioSystem.playDialClick(-1);
          webgpuRenderer?.emitDialClick(pos.x, pos.y, -1);
          game.decrementDial(i);
        }
        startY = e.touches[0].clientY;
      }
    });

    dial.addEventListener("wheel", (e) => {
      e.preventDefault();
      audioSystem.init();
      const pos = getDialPosition(i);
      if (e.deltaY < 0) {
        audioSystem.playDialClick(1);
        webgpuRenderer?.emitDialClick(pos.x, pos.y, 1);
        game.incrementDial(i);
      } else {
        audioSystem.playDialClick(-1);
        webgpuRenderer?.emitDialClick(pos.x, pos.y, -1);
        game.decrementDial(i);
      }
    });

    dialsEl.appendChild(dial);
  }
}

function renderDials(state: GameState): void {
  if (dialsEl.children.length !== state.digits) {
    createDials(state.digits);
  }

  for (let i = 0; i < state.digits; i++) {
    const numberEl = document.getElementById(`dial-${i}-number`);
    if (numberEl) {
      numberEl.textContent = state.currentGuess[i].toString();
    }
  }
}

function renderHints(hints: Hint[]): void {
  hintsListEl.innerHTML = "";

  hints.forEach((hint) => {
    const row = document.createElement("div");
    row.className = "hint-row";

    const codeEl = document.createElement("div");
    codeEl.className = "hint-code";

    hint.code.forEach((digit, i) => {
      const digitEl = document.createElement("span");
      digitEl.className = `hint-digit ${hint.results[i]}`;
      digitEl.textContent = digit.toString();
      codeEl.appendChild(digitEl);
    });

    const textEl = document.createElement("span");
    textEl.className = "hint-text";
    textEl.textContent = hint.description;

    row.appendChild(codeEl);
    row.appendChild(textEl);
    hintsListEl.appendChild(row);
  });
}

function updateUI(state: GameState): void {
  levelDisplay.textContent = state.level.toString();
  attemptsDisplay.textContent = state.attempts.toString();
}

function handleCheck(): void {
  audioSystem.init();
  audioSystem.playCheck();

  const state = game.getState();
  const pos = getLockPosition();

  setTimeout(() => {
    const isCorrect = game.check();
    if (!isCorrect && game.getState().status === "playing") {
      audioSystem.playWrong();
      webgpuRenderer?.emitWrong(pos.x, pos.y);
    }
  }, 300);
}

function showWinOverlay(): void {
  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.win");
  webgpuRenderer?.emitVictory();

  const state = game.getState();
  if (state.level >= game.getTotalLevels()) {
    overlayMsg.textContent = i18n.t("game.complete");
    startBtn.textContent = i18n.t("game.start");
    startBtn.onclick = () => startGame(1);
  } else {
    overlayMsg.textContent = `${i18n.t("game.attempts")}: ${state.attempts}`;
    startBtn.textContent = i18n.t("game.nextLevel");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      lockShackle.classList.remove("unlocked");
      game.nextLevel();
      audioSystem.playLevelStart();
      webgpuRenderer?.emitLevelStart();
    };
  }
}

function startGame(level: number = 1): void {
  audioSystem.init();
  overlay.style.display = "none";
  lockShackle.classList.remove("unlocked");
  game.start(level);
  audioSystem.playLevelStart();
  webgpuRenderer?.emitLevelStart();
}

// Event listeners
startBtn.addEventListener("click", () => startGame());
resetBtn.addEventListener("click", () => {
  audioSystem.init();
  lockShackle.classList.remove("unlocked");
  game.reset();
  audioSystem.playReset();
  webgpuRenderer?.emitReset();
});
checkBtn.addEventListener("click", handleCheck);

// Keyboard support
document.addEventListener("keydown", (e) => {
  if (game.getState().status !== "playing") return;

  if (e.key === "Enter") {
    handleCheck();
  }
});

// Initialize
initI18n();
initWebGPU().then(() => {
  initGame();
});
