/**
 * Math Maze Main Entry
 * Game #082 - WebGPU Enhanced
 */
import { MathMazeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const targetDisplay = document.getElementById("target-display")!;
const currentDisplay = document.getElementById("current-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

const mobileControls = document.getElementById("mobile-controls")!;

let game: MathMazeGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Digital/Mathematical Theme
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playMove() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Digital step sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playCollect(operator: "+" | "-" | "*" | "/") {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Different tones for different operators
    const frequencies: Record<string, number[]> = {
      "+": [523, 659, 784],
      "-": [392, 349, 311],
      "*": [440, 554, 659],
      "/": [349, 440, 523],
    };

    const freqs = frequencies[operator] || frequencies["+"];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = operator === "+" || operator === "*" ? "sine" : "triangle";
      osc.frequency.value = freq;

      const startTime = now + i * 0.05;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  playWallHit() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Error buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 300;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playCorrect() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Victory arpeggio
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  playWrong() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Descending error tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sawtooth";

    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    osc2.frequency.setValueAtTime(203, now);
    osc2.frequency.exponentialRampToValueAtTime(103, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  playVictory() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Digital victory fanfare
    const notes = [523, 659, 784, 880, 1047, 880, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;

      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    // Final chord
    setTimeout(() => {
      [523, 659, 784, 1047].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      });
    }, 700);
  }

  playLevelStart() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Digital power up
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playReset() {
    const ctx = this.init();
    const now = ctx.currentTime;

    // Reset swoosh
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
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
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (!success) {
    console.warn("WebGPU not available, continuing without effects");
    renderer = null;
    webgpuCanvas.style.display = "none";
  }
}

function initGame() {
  game = new MathMazeGame(canvas);
  game.resize();

  // Keyboard input
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
        e.preventDefault();
        game.move("up");
        break;
      case "ArrowDown":
      case "s":
        e.preventDefault();
        game.move("down");
        break;
      case "ArrowLeft":
      case "a":
        e.preventDefault();
        game.move("left");
        break;
      case "ArrowRight":
      case "d":
        e.preventDefault();
        game.move("right");
        break;
    }
  });

  // Mobile controls
  mobileControls.querySelectorAll(".control-btn").forEach((btn) => {
    const dir = btn.getAttribute("data-dir") as "up" | "down" | "left" | "right";

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      game.move(dir);
    });

    btn.addEventListener("click", () => {
      game.move(dir);
    });
  });

  // Swipe support
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  canvas.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    const minSwipe = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > minSwipe) game.move("right");
      else if (dx < -minSwipe) game.move("left");
    } else {
      if (dy > minSwipe) game.move("down");
      else if (dy < -minSwipe) game.move("up");
    }
  });

  game.setOnStateChange((state) => {
    targetDisplay.textContent = state.targetValue.toString();
    currentDisplay.textContent = state.currentValue.toString();

    // Color current value based on proximity to target
    if (state.currentValue === state.targetValue) {
      currentDisplay.style.color = "#00b894";
    } else if (Math.abs(state.currentValue - state.targetValue) < 10) {
      currentDisplay.style.color = "#fdcb6e";
    } else {
      currentDisplay.style.color = "#00cec9";
    }

    // Handle events
    if (state.event) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const ex = state.eventX ?? cx;
      const ey = state.eventY ?? cy;

      switch (state.event) {
        case "move":
          audio.playMove();
          renderer?.emitMove(ex, ey);
          break;
        case "collectPlus":
          audio.playCollect("+");
          renderer?.emitCollectPlus(ex, ey);
          break;
        case "collectMinus":
          audio.playCollect("-");
          renderer?.emitCollectMinus(ex, ey);
          break;
        case "collectMultiply":
          audio.playCollect("*");
          renderer?.emitCollectMultiply(ex, ey);
          break;
        case "wallHit":
          audio.playWallHit();
          renderer?.emitWallHit(ex, ey);
          break;
        case "correct":
          audio.playCorrect();
          renderer?.emitCorrect(ex, ey);
          break;
        case "wrong":
          audio.playWrong();
          renderer?.emitWrong(ex, ey);
          break;
        case "victory":
          audio.playVictory();
          renderer?.emitVictory(cx, cy);
          break;
        case "levelStart":
          audio.playLevelStart();
          renderer?.emitLevelStart(cx, cy);
          break;
        case "reset":
          audio.playReset();
          renderer?.emitReset();
          break;
      }
    }

    if (state.status === "won") {
      showWin(state.level, state.maxLevel);
    } else if (state.status === "lost") {
      showLost();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && webgpuCanvas.parentElement) {
      const rect = webgpuCanvas.parentElement.getBoundingClientRect();
      const size = Math.min(rect.width, 400);
      renderer.resize(size, size);
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
      };
    } else {
      overlayMsg.textContent = "All levels completed!";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        startGame();
      };
    }
  }, 500);
}

function showLost() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameOver");
    overlayMsg.textContent = "Your value doesn't match the target!";
    startBtn.textContent = i18n.t("game.retry");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.reset();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
