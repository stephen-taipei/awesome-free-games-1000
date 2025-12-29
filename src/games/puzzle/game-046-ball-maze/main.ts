/**
 * Ball Maze Main Entry
 * Classic Wooden Labyrinth / Vintage Tilting Maze Theme
 * Game #046
 */
import { BallMazeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Wooden labyrinth sounds
class AudioSystem {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  // Ball rolling sound
  playRoll(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = 80 + Math.random() * 40;

    filter.type = 'lowpass';
    filter.frequency.value = 300;

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Wall bounce - wooden thud
  playBounce(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

    filter.type = 'lowpass';
    filter.frequency.value = 500;

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);

    // Wood resonance
    const res = ctx.createOscillator();
    const resGain = ctx.createGain();
    res.type = 'triangle';
    res.frequency.value = 150;
    resGain.gain.setValueAtTime(0.05, now + 0.02);
    resGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    res.connect(resGain);
    resGain.connect(ctx.destination);
    res.start(now + 0.02);
    res.stop(now + 0.15);
  }

  // Ball falling into hole
  playHoleFall(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Descending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);

    // Impact thud
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.value = 60;
    thudGain.gain.setValueAtTime(0.2, now + 0.15);
    thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now + 0.15);
    thud.stop(now + 0.3);
  }

  // Victory fanfare
  playVictory(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Triumphant melody
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const delay = i * 0.15;
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 1.005;

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc2.start(now + delay);
      osc.stop(now + delay + 0.5);
      osc2.stop(now + delay + 0.5);
    });

    // Bell-like finish
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.value = 1568;
    bellGain.gain.setValueAtTime(0.08, now + 0.6);
    bellGain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now + 0.6);
    bell.stop(now + 1.5);
  }

  // Goal reached - satisfying click
  playGoal(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Reset/restart
  playReset(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Start game
  playStart(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [392, 523]; // G4, C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.1, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.2);
    });
  }

  // Tilt sound (subtle)
  playTilt(): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = 100 + Math.random() * 50;

    filter.type = 'lowpass';
    filter.frequency.value = 200;

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: BallMazeGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();
let useDeviceOrientation = false;

// Track ball state for effects
let lastBallX = 0;
let lastBallY = 0;
let lastGravityX = 0;
let lastGravityY = 0;

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
  game = new BallMazeGame(canvas);
  game.resize();

  // Initialize WebGPU
  if (bgCanvas) {
    renderer = new WebGPURenderer(bgCanvas);
    const success = await renderer.initialize();
    if (success) {
      requestAnimationFrame(function renderLoop() {
        renderer?.render();

        // Ball effects while playing
        if (game.status === 'playing') {
          const nx = game.ball.x / canvas.width;
          const ny = game.ball.y / canvas.height;
          const speed = Math.sqrt(game.ball.vx * game.ball.vx + game.ball.vy * game.ball.vy);

          // Update tilt in renderer
          if (renderer) {
            renderer.setTilt(game.gravity.x, game.gravity.y);
          }

          // Ball trail and rolling effects
          if (speed > 1 && renderer) {
            renderer.emitTrail(nx, ny, game.ball.vx, game.ball.vy);

            if (Math.random() < 0.15) {
              renderer.emitDust(nx, ny, speed / 5);
            }

            if (Math.random() < 0.05) {
              audio.playRoll();
            }
          }

          // Sparkle effect occasionally
          if (Math.random() < 0.02 && speed > 0.5 && renderer) {
            renderer.emitSparkle(nx, ny);
          }
        }

        requestAnimationFrame(renderLoop);
      });
    }
  }

  // Setup device orientation
  if (window.DeviceOrientationEvent) {
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      startBtn.addEventListener("click", async () => {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === "granted") {
            useDeviceOrientation = true;
            setupDeviceOrientation();
          }
        } catch (e) {
          console.log("Device orientation permission denied");
        }
        audio.playStart();
        startGame();
      }, { once: true });
    } else {
      useDeviceOrientation = true;
      setupDeviceOrientation();
    }
  }

  // Keyboard controls as fallback
  setupKeyboardControls();

  game.setOnStateChange((state: any) => {
    if (state.time !== undefined) {
      timeDisplay.textContent = `${state.time}s`;
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      audio.playGoal();

      const nx = game.ball.x / canvas.width;
      const ny = game.ball.y / canvas.height;

      setTimeout(() => {
        audio.playVictory();
        if (renderer) {
          renderer.emitVictory(nx, ny);
        }
      }, 200);

      showWin(state.hasNextLevel);
    } else if (state.status === "lost") {
      const nx = game.ball.x / canvas.width;
      const ny = game.ball.y / canvas.height;

      audio.playHoleFall();
      if (renderer) {
        renderer.emitHoleFall(nx, ny);
      }
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    resizeBgCanvas();
  });

  resizeBgCanvas();
}

function resizeBgCanvas() {
  if (bgCanvas && bgCanvas.parentElement) {
    const rect = bgCanvas.parentElement.getBoundingClientRect();
    bgCanvas.width = rect.width;
    bgCanvas.height = rect.height;
  }
}

function setupDeviceOrientation() {
  window.addEventListener("deviceorientation", (e) => {
    if (!useDeviceOrientation) return;

    const gamma = e.gamma || 0;
    const beta = e.beta || 0;

    const x = Math.max(-1, Math.min(1, gamma / 30));
    const y = Math.max(-1, Math.min(1, (beta - 45) / 30));

    // Detect significant tilt change
    if (Math.abs(x - lastGravityX) > 0.1 || Math.abs(y - lastGravityY) > 0.1) {
      audio.playTilt();
    }
    lastGravityX = x;
    lastGravityY = y;

    game.setGravity(x, y);
  });
}

function setupKeyboardControls() {
  const keys: { [key: string]: boolean } = {};

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    updateGravityFromKeys();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    updateGravityFromKeys();
  });

  function updateGravityFromKeys() {
    let x = 0;
    let y = 0;

    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) x -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) x += 1;
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) y -= 1;
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) y += 1;

    game.setGravity(x, y);
  }
}

function showWin(hasNextLevel: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = `${i18n.t("game.time")}: ${timeDisplay.textContent}`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        audio.playStart();
        game.nextLevel();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = `${i18n.t("game.time")}: ${timeDisplay.textContent}`;
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        audio.playStart();
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
}

startBtn.addEventListener("click", () => {
  audio.playStart();
  startGame();
});

resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
});

// Init
initI18n();
initGame();
