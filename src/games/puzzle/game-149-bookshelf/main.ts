/**
 * Bookshelf Main Entry
 * Game #149
 */
import { BookshelfGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: BookshelfGame;
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
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playSelect() {
    // Soft wooden tap
    this.playTone(300, 0.1, "sine", 0.04);
    this.playTone(200, 0.08, "triangle", 0.03, 0.02);
  }

  playDeselect() {
    // Light release
    this.playTone(250, 0.08, "sine", 0.02);
  }

  playSwap() {
    // Books sliding
    this.playTone(180, 0.15, "triangle", 0.05);
    this.playTone(220, 0.12, "sine", 0.04, 0.05);
    this.playTone(200, 0.1, "triangle", 0.03, 0.1);
  }

  playCorrect() {
    // Satisfying click
    this.playTone(400, 0.12, "sine", 0.05);
    this.playTone(500, 0.1, "sine", 0.04, 0.05);
  }

  playWin() {
    // Cozy achievement melody
    const melody = [392, 440, 494, 523, 587];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.25, "sine", 0.08, i * 0.12);
      this.playTone(freq * 0.5, 0.2, "triangle", 0.03, i * 0.12);
    });
  }

  playComplete() {
    // Library fanfare
    const melody = [262, 330, 392, 440, 494, 523, 587, 659, 784];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.3, "sine", 0.1, i * 0.1);
      this.playTone(freq * 0.5, 0.25, "triangle", 0.04, i * 0.1);
    });
  }

  playLevelStart() {
    // Book opening
    this.playTone(200, 0.15, "sine", 0.03);
    this.playTone(250, 0.12, "sine", 0.025, 0.05);
    this.playTone(300, 0.1, "triangle", 0.02, 0.1);
  }

  playReset() {
    // Shuffling books
    this.playTone(150, 0.2, "triangle", 0.04);
    this.playTone(180, 0.15, "triangle", 0.03, 0.08);
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
      }, 200);
    } else {
      renderer = null;
    }
  }
}

function initGame() {
  game = new BookshelfGame(canvas);
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
    movesDisplay.textContent = state.moves.toString();

    // Update WebGPU
    if (renderer) {
      if (state.bookSelect) {
        const nx = state.bookSelect.x / canvas.clientWidth;
        const ny = 1 - state.bookSelect.y / canvas.clientHeight;
        renderer.emitBookSelect(nx, ny);
        audio.playSelect();
      }

      if (state.bookDeselect) {
        const nx = state.bookDeselect.x / canvas.clientWidth;
        const ny = 1 - state.bookDeselect.y / canvas.clientHeight;
        renderer.emitBookDeselect(nx, ny);
        audio.playDeselect();
      }

      if (state.bookSwap) {
        const nx1 = state.bookSwap.x1 / canvas.clientWidth;
        const ny1 = 1 - state.bookSwap.y1 / canvas.clientHeight;
        const nx2 = state.bookSwap.x2 / canvas.clientWidth;
        const ny2 = 1 - state.bookSwap.y2 / canvas.clientHeight;
        renderer.emitBookSwap(nx1, ny1, nx2, ny2);
        audio.playSwap();
      }

      if (state.bookCorrect) {
        const nx = state.bookCorrect.x / canvas.clientWidth;
        const ny = 1 - state.bookCorrect.y / canvas.clientHeight;
        renderer.emitBookCorrect(nx, ny);
        audio.playCorrect();
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
