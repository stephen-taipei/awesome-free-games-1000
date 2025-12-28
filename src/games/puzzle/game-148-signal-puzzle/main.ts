/**
 * Signal Puzzle Main Entry
 * Game #148
 */
import { SignalPuzzleGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const signalDisplay = document.getElementById("signal-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: SignalPuzzleGame;
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

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1500, this.ctx.currentTime);
    filter.Q.setValueAtTime(2, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playRotate() {
    // Mechanical click with electronic beep
    this.playTone(800, 0.08, "square", 0.04);
    this.playTone(1200, 0.06, "sine", 0.03, 0.02);
  }

  playConnect() {
    // Signal connection established
    this.playTone(440, 0.15, "sine", 0.06);
    this.playTone(660, 0.12, "sine", 0.05, 0.05);
    this.playTone(880, 0.12, "triangle", 0.04, 0.1);
  }

  playDisconnect() {
    // Signal lost
    this.playTone(400, 0.12, "sawtooth", 0.04);
    this.playTone(300, 0.15, "sawtooth", 0.03, 0.05);
  }

  playPulse() {
    // Data transmission pulse
    this.playTone(1000, 0.05, "square", 0.02);
  }

  playWin() {
    // Level complete - successful transmission
    const melody = [523, 659, 784, 880, 1047];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.2, "sine", 0.08, i * 0.1);
      this.playTone(freq * 0.5, 0.15, "triangle", 0.03, i * 0.1);
    });
  }

  playComplete() {
    // All levels complete - full network online
    const melody = [392, 440, 523, 587, 659, 784, 880, 1047, 1175];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.3, "sine", 0.1, i * 0.12);
      this.playTone(freq * 0.5, 0.25, "triangle", 0.04, i * 0.12);
    });
  }

  playLevelStart() {
    // System startup
    this.playTone(300, 0.15, "sine", 0.04);
    this.playTone(400, 0.12, "sine", 0.03, 0.08);
    this.playTone(500, 0.12, "triangle", 0.03, 0.15);
  }

  playReset() {
    // System reset
    this.playTone(600, 0.15, "sawtooth", 0.03);
    this.playTone(400, 0.2, "sawtooth", 0.02, 0.05);
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
  game = new SignalPuzzleGame(canvas);
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
    signalDisplay.textContent = `${state.signalStrength}%`;

    // Update WebGPU signal strength
    if (renderer) {
      renderer.setSignalStrength(state.signalStrength);

      if (state.towerRotate) {
        const nx = state.towerRotate.x / canvas.clientWidth;
        const ny = 1 - state.towerRotate.y / canvas.clientHeight;
        renderer.emitTowerRotate(nx, ny);
        audio.playRotate();
      }

      if (state.signalConnect) {
        const nx = state.signalConnect.x / canvas.clientWidth;
        const ny = 1 - state.signalConnect.y / canvas.clientHeight;
        renderer.emitSignalConnect(nx, ny);
        audio.playConnect();
      }

      if (state.signalDisconnect) {
        const nx = state.signalDisconnect.x / canvas.clientWidth;
        const ny = 1 - state.signalDisconnect.y / canvas.clientHeight;
        renderer.emitSignalDisconnect(nx, ny);
        audio.playDisconnect();
      }

      if (state.dataPulse) {
        const nx = state.dataPulse.x / canvas.clientWidth;
        const ny = 1 - state.dataPulse.y / canvas.clientHeight;
        renderer.emitDataPulse(nx, ny, state.dataPulse.direction);
        audio.playPulse();
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
