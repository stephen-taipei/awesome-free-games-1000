/**
 * Magnetic Blocks Main Entry
 * Game #138
 */
import { MagneticBlocksGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

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
const nextBtn = document.getElementById("next-btn")!;

let game: MagneticBlocksGame;
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
    filter.frequency.setValueAtTime(2500, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    oscillator.start(this.ctx.currentTime + delay);
    oscillator.stop(this.ctx.currentTime + delay + duration);
  }

  playBlockMove() {
    // Magnetic slide sound
    this.playTone(200, 0.1, "sine", 0.08);
    this.playTone(250, 0.08, "triangle", 0.06, 0.03);
  }

  playAttraction() {
    // Magnetic attraction snap
    this.playTone(400, 0.15, "sine", 0.12);
    this.playTone(600, 0.12, "triangle", 0.1, 0.05);
    this.playTone(800, 0.1, "sine", 0.08, 0.1);
    this.playTone(1000, 0.08, "sine", 0.06, 0.15);
  }

  playRepulsion() {
    // Magnetic repulsion buzz
    this.playTone(150, 0.12, "sawtooth", 0.08);
    this.playTone(180, 0.1, "square", 0.06, 0.04);
  }

  playWin() {
    // Electric victory melody
    const melody = [392, 494, 587, 784, 988, 1175];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.25, "sine", 0.12, i * 0.1);
      this.playTone(freq * 0.5, 0.2, "triangle", 0.06, i * 0.1);
    });
  }

  playComplete() {
    // Full electromagnetic fanfare
    const melody = [262, 330, 392, 523, 659, 784, 1047];
    melody.forEach((freq, i) => {
      this.playTone(freq, 0.3, "sine", 0.15, i * 0.08);
      this.playTone(freq * 0.75, 0.25, "triangle", 0.08, i * 0.08);
    });
  }

  playLevelStart() {
    // Power up sound
    this.playTone(150, 0.2, "sine", 0.08);
    this.playTone(200, 0.18, "sine", 0.07, 0.08);
    this.playTone(300, 0.15, "triangle", 0.06, 0.15);
    this.playTone(450, 0.12, "sine", 0.05, 0.22);
  }

  playReset() {
    // Demagnetize sound
    this.playTone(400, 0.1, "sine", 0.06);
    this.playTone(300, 0.1, "sine", 0.05, 0.05);
    this.playTone(200, 0.1, "sine", 0.04, 0.1);
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
  game = new MagneticBlocksGame(canvas);
  game.resize();

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "w") game.move("up");
    else if (e.key === "ArrowDown" || e.key === "s") game.move("down");
    else if (e.key === "ArrowLeft" || e.key === "a") game.move("left");
    else if (e.key === "ArrowRight" || e.key === "d") game.move("right");
  });

  // Touch swipe
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 30) return;

    if (absDx > absDy) {
      game.move(dx > 0 ? "right" : "left");
    } else {
      game.move(dy > 0 ? "down" : "up");
    }
  }, { passive: true });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    movesDisplay.textContent = state.moves?.toString() || "0";

    // WebGPU events
    if (renderer) {
      if (state.blockMove) {
        renderer.emitBlockMove(state.blockMove.x, state.blockMove.y, state.blockMove.isPositive);
        audio.playBlockMove();
      }

      if (state.attraction) {
        renderer.emitAttraction(state.attraction.x, state.attraction.y);
        audio.playAttraction();
      }

      if (state.repulsion) {
        renderer.emitRepulsion(state.repulsion.x, state.repulsion.y, state.repulsion.isPositive);
        audio.playRepulsion();
      }

      if (state.reset) {
        renderer.emitReset();
        audio.playReset();
      }
    }

    if (state.status === "won") {
      renderer?.emitLevelComplete();
      audio.playWin();
      showWin();
    } else if (state.status === "complete") {
      renderer?.emitVictory();
      audio.playComplete();
      showComplete();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas) {
      renderer.resize(webgpuCanvas.clientWidth, webgpuCanvas.clientHeight);
    }
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${game.moves}`;
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 500);
}

function showComplete() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.start");
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    startBtn.onclick = () => {
      game.restart();
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
  renderer?.emitLevelStart();
  audio.playLevelStart();
});

initI18n();
initWebGPU();
initGame();
