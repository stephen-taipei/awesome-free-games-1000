/**
 * Ultimate Puzzle Main Entry
 * Game #150 (Milestone!)
 */
import { UltimatePuzzleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const phaseDisplay = document.getElementById("phase-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: UltimatePuzzleGame;
let renderer: WebGPURenderer | null = null;
let ambientInterval: number | null = null;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.3,
    delay: number = 0
  ) {
    this.init();
    if (!this.ctx) return;

    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playColorSelect() {
    // Soft chime
    this.playTone(523, 0.1, "sine", 0.06);
    this.playTone(659, 0.08, "sine", 0.04, 0.03);
  }

  playColorMatch() {
    // Harmonious match
    this.playTone(523, 0.15, "sine", 0.08);
    this.playTone(659, 0.12, "sine", 0.06, 0.05);
    this.playTone(784, 0.1, "sine", 0.05, 0.1);
  }

  playColorMismatch() {
    // Gentle buzz
    this.playTone(200, 0.15, "triangle", 0.04);
    this.playTone(180, 0.12, "triangle", 0.03, 0.05);
  }

  playPathRotate() {
    // Mechanical click
    this.playTone(300, 0.08, "square", 0.03);
    this.playTone(400, 0.06, "sine", 0.02, 0.02);
  }

  playPathConnect() {
    // Connection sound
    this.playTone(440, 0.12, "sine", 0.06);
    this.playTone(550, 0.1, "sine", 0.05, 0.04);
  }

  playSortSelect() {
    // Selection pop
    this.playTone(350, 0.08, "sine", 0.05);
  }

  playSortSwap() {
    // Swoosh
    this.playTone(250, 0.12, "triangle", 0.04);
    this.playTone(350, 0.1, "triangle", 0.035, 0.04);
    this.playTone(300, 0.08, "sine", 0.03, 0.08);
  }

  playPhaseComplete() {
    // Phase victory
    const melody = [523, 659, 784, 880];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.2, "sine", 0.08, i * 0.08);
      this.playTone(freq * 0.5, 0.15, "triangle", 0.03, i * 0.08);
    });
  }

  playWin() {
    // Level complete fanfare
    const melody = [392, 494, 587, 659, 784, 880];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.25, "sine", 0.1, i * 0.1);
      this.playTone(freq * 0.5, 0.2, "triangle", 0.04, i * 0.1);
    });
  }

  playComplete() {
    // Ultimate victory (rainbow arpeggio)
    const melody = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.3, "sine", 0.12, i * 0.08);
      this.playTone(freq * 1.5, 0.2, "sine", 0.05, i * 0.08 + 0.02);
      this.playTone(freq * 0.5, 0.25, "triangle", 0.04, i * 0.08);
    });
  }

  playLevelStart() {
    // Opening flourish
    this.playTone(330, 0.15, "sine", 0.05);
    this.playTone(392, 0.12, "sine", 0.045, 0.06);
    this.playTone(494, 0.1, "sine", 0.04, 0.12);
  }

  playReset() {
    // Rewind sound
    this.playTone(400, 0.15, "triangle", 0.04);
    this.playTone(350, 0.12, "triangle", 0.035, 0.05);
    this.playTone(300, 0.1, "triangle", 0.03, 0.1);
  }
}

const audio = new AudioSystem();

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-Hant")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.includes("zh")) {
    i18n.setLocale("zh-CN");
  } else if (browserLang.includes("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.includes("ko")) {
    i18n.setLocale("ko");
  } else {
    i18n.setLocale("en");
  }

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
  if (webgpuCanvas) {
    renderer = new WebGPURenderer(webgpuCanvas);
    const success = await renderer.init();
    if (success) {
      ambientInterval = window.setInterval(() => {
        renderer?.emitAmbient();
      }, 150);
    } else {
      renderer = null;
    }
  }
}

function initGame() {
  game = new UltimatePuzzleGame(canvas);
  game.resize();

  // Mouse input
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);
  });

  // Touch input
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = state.level.toString();
    phaseDisplay.textContent = `${state.phase}/${state.totalPhases}`;
    movesDisplay.textContent = state.moves.toString();

    // Update WebGPU renderer
    if (renderer) {
      renderer.setPhase(state.phaseIndex / 3);

      if (state.colorSelect) {
        const nx = state.colorSelect.x / canvas.clientWidth;
        const ny = 1 - state.colorSelect.y / canvas.clientHeight;
        renderer.emitColorSelect(nx, ny);
        audio.playColorSelect();
      }

      if (state.colorMatch) {
        const nx = state.colorMatch.x / canvas.clientWidth;
        const ny = 1 - state.colorMatch.y / canvas.clientHeight;
        renderer.emitColorMatch(nx, ny, state.colorMatch.hue);
        audio.playColorMatch();
      }

      if (state.colorMismatch) {
        audio.playColorMismatch();
      }

      if (state.pathRotate) {
        const nx = state.pathRotate.x / canvas.clientWidth;
        const ny = 1 - state.pathRotate.y / canvas.clientHeight;
        renderer.emitPathRotate(nx, ny);
        audio.playPathRotate();
      }

      if (state.pathConnect) {
        const nx = state.pathConnect.x / canvas.clientWidth;
        const ny = 1 - state.pathConnect.y / canvas.clientHeight;
        renderer.emitPathConnect(nx, ny);
        audio.playPathConnect();
      }

      if (state.sortSelect) {
        const nx = state.sortSelect.x / canvas.clientWidth;
        const ny = 1 - state.sortSelect.y / canvas.clientHeight;
        renderer.emitSortSelect(nx, ny);
        audio.playSortSelect();
      }

      if (state.sortSwap) {
        const nx1 = state.sortSwap.x1 / canvas.clientWidth;
        const ny1 = 1 - state.sortSwap.y1 / canvas.clientHeight;
        const nx2 = state.sortSwap.x2 / canvas.clientWidth;
        const ny2 = 1 - state.sortSwap.y2 / canvas.clientHeight;
        renderer.emitSortSwap(nx1, ny1, nx2, ny2);
        audio.playSortSwap();
      }

      if (state.phaseComplete) {
        renderer.emitPhaseComplete();
        audio.playPhaseComplete();
      }

      if (state.phaseTransition) {
        renderer.emitPhaseTransition(
          state.phaseTransition.from,
          state.phaseTransition.to
        );
      }

      if (state.reset) {
        renderer.emitReset();
        audio.playReset();
      }
    }

    if (state.status === "won") {
      renderer?.emitLevelComplete();
      audio.playWin();
      showWin(state.level, state.maxLevel);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
}

function showWin(level: number, maxLevel: number) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");

    if (level < maxLevel) {
      overlayMsg.textContent = `Level ${level} completed!`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
        renderer?.emitLevelStart();
        audio.playLevelStart();
      };
    } else {
      overlayMsg.textContent = i18n.t("game.complete");
      startBtn.textContent = i18n.t("game.start");
      renderer?.emitVictory();
      audio.playComplete();
      startBtn.onclick = () => {
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  renderer?.emitReset();
  audio.playReset();
});

// Init
initI18n();
initWebGPU();
initGame();
