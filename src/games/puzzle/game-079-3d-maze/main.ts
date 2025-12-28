/**
 * 3D Maze Main Entry
 * Game #079 - Sci-Fi Corridor / Cyberpunk Dungeon Theme
 */
import { Maze3DGame, GameState } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

const mobileControls = document.getElementById("mobile-controls")!;

let game: Maze3DGame;
let renderer: WebGPURenderer | null = null;

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
  }

  private createOscillator(freq: number, type: OscillatorType, duration: number, gain: number = 0.3): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playMove(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    osc.type = "square";
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.setValueAtTime(60, this.ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playTurn(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playWallHit(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, this.ctx.currentTime);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.setValueAtTime(80, this.ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playPortal(): void {
    this.init();
    if (!this.ctx) return;

    // Ethereal portal sound
    const freqs = [200, 400, 600, 800];
    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      osc.frequency.linearRampToValueAtTime(freq * 1.5, this.ctx!.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.1, this.ctx!.currentTime + i * 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.4);

      osc.connect(gainNode);
      gainNode.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + i * 0.05);
      osc.stop(this.ctx!.currentTime + 0.5);
    });
  }

  playGoalReached(): void {
    this.init();
    if (!this.ctx) return;

    // Achievement sound - ascending chord
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

      gainNode.gain.setValueAtTime(0, this.ctx!.currentTime + i * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + i * 0.1 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.8);

      osc.connect(gainNode);
      gainNode.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + i * 0.1);
      osc.stop(this.ctx!.currentTime + 1);
    });
  }

  playVictory(): void {
    this.init();
    if (!this.ctx) return;

    // Epic victory fanfare
    const melody = [
      { freq: 523.25, start: 0 },
      { freq: 659.25, start: 0.15 },
      { freq: 783.99, start: 0.3 },
      { freq: 1046.50, start: 0.45 },
      { freq: 1318.51, start: 0.6 },
    ];

    melody.forEach(({ freq, start }) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + start);

      gainNode.gain.setValueAtTime(0, this.ctx!.currentTime + start);
      gainNode.gain.linearRampToValueAtTime(0.25, this.ctx!.currentTime + start + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + start + 0.5);

      osc.connect(gainNode);
      gainNode.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + start);
      osc.stop(this.ctx!.currentTime + start + 0.6);
    });
  }

  playLevelStart(): void {
    this.init();
    if (!this.ctx) return;

    // Sci-fi startup sound
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(2000, this.ctx.currentTime + 0.3);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playReset(): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.2, this.ctx.currentTime);
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
  game = new Maze3DGame(canvas);
  game.resize();

  // Keyboard input
  window.addEventListener("keydown", (e) => {
    if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      game.handleKeyDown(e.key);
    }
  });

  window.addEventListener("keyup", (e) => {
    game.handleKeyUp(e.key);
  });

  // Mobile controls
  mobileControls.querySelectorAll(".control-btn").forEach((btn) => {
    const dir = btn.getAttribute("data-dir") as "up" | "down" | "left" | "right";

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      game.move(dir);
    });

    btn.addEventListener("mousedown", () => {
      game.move(dir);
    });
  });

  game.setOnStateChange((state: GameState) => {
    levelDisplay.textContent = state.level.toString();
    timeDisplay.textContent = state.time;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Handle events
    if (state.event) {
      switch (state.event) {
        case "move":
          audio.playMove();
          renderer?.emitMove(cx, cy);
          break;
        case "turn":
          audio.playTurn();
          renderer?.emitTurn(cx, cy, state.playerAngle || 0);
          renderer?.setPlayerAngle(state.playerAngle || 0);
          break;
        case "wallHit":
          audio.playWallHit();
          renderer?.emitWallProximity(cx, cy);
          break;
        case "portal":
          audio.playPortal();
          renderer?.emitPortal(cx, cy);
          break;
        case "goalReached":
          audio.playGoalReached();
          renderer?.emitGoalReached(cx, cy);
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
      showWin(state.level, state.maxLevel, state.time);
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (renderer && canvas.parentElement) {
      const rect = canvas.parentElement.getBoundingClientRect();
      renderer.resize(rect.width, 400);
    }
  });
}

function showWin(level: number, maxLevel: number, time: string) {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");

    if (level < maxLevel) {
      overlayMsg.textContent = `Level ${level} completed in ${time}!`;
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
      };
    } else {
      overlayMsg.textContent = `All mazes completed in ${time}!`;
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        startGame();
      };
    }
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
