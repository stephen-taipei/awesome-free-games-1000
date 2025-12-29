/**
 * Balloon Puzzle Main Entry
 * Game #076
 */
import { BalloonGame } from "./game";
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

let game: BalloonGame;
let renderer: WebGPURenderer | null = null;
let animationId: number;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  playWind() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, ctx.currentTime);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  playBounce() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  playPop() {
    const ctx = this.init();

    // Noise burst
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(2000, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.1);
  }

  playGoal() {
    const ctx = this.init();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 0.4);
    });
  }

  playVictory() {
    const ctx = this.init();
    [261.63, 329.63, 392.00, 523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + 0.6);
    });
  }

  playReset() {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
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

  renderer = new WebGPURenderer();
  const success = await renderer.initialize(webgpuCanvas);

  if (success) {
    function animate() {
      renderer?.render();
      animationId = requestAnimationFrame(animate);
    }
    animate();
  }
}

function getCanvasCoords(x: number, y: number): { x: number; y: number } {
  const rect = webgpuCanvas?.getBoundingClientRect() || canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio, 2);
  return {
    x: x * dpr,
    y: y * dpr,
  };
}

function initGame() {
  game = new BalloonGame(canvas);
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

  game.setOnStateChange((state) => {
    levelDisplay.textContent = state.level.toString();
    movesDisplay.textContent = state.moves.toString();

    // Handle events for WebGPU effects
    if (state.event && renderer) {
      const centerX = webgpuCanvas?.width / 2 || 200;
      const centerY = webgpuCanvas?.height / 2 || 200;

      switch (state.event) {
        case "windForce": {
          const pos = getCanvasCoords(state.x || 0, state.y || 0);
          renderer.emitWindForce(pos.x, pos.y);
          audio.playWind();
          break;
        }
        case "bounce": {
          const pos = getCanvasCoords(state.x || 0, state.y || 0);
          renderer.emitBounce(pos.x, pos.y);
          audio.playBounce();
          break;
        }
        case "pop": {
          const pos = getCanvasCoords(state.x || 0, state.y || 0);
          renderer.emitPop(pos.x, pos.y);
          audio.playPop();
          break;
        }
        case "goalReached": {
          const pos = getCanvasCoords(state.x || 0, state.y || 0);
          renderer.emitGoalReached(pos.x, pos.y);
          audio.playGoal();
          break;
        }
        case "victory":
          renderer.emitVictory();
          audio.playVictory();
          break;
        case "levelStart":
          renderer.emitLevelStart();
          break;
        case "reset":
          renderer.emitReset();
          audio.playReset();
          break;
        case "gameOver": {
          const pos = getCanvasCoords(state.x || 0, state.y || 0);
          renderer.emitGameOver(pos.x, pos.y);
          audio.playPop();
          break;
        }
      }
    }

    if (state.status === "won") {
      showWin(state.level, state.maxLevel);
    } else if (state.status === "lost") {
      showGameOver();
    }
  });

  window.addEventListener("resize", () => game.resize());
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

function showGameOver() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.gameOver");
    overlayMsg.textContent = "The balloon popped!";
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
initGame();
initWebGPU();
