/**
 * Color Match Main Entry
 * Neon Synapse Theme
 * Game #026
 */
import { ColorMatchGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Synthesized sounds
class AudioSystem {
  private ctx: AudioContext | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.initialized = true;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playCorrect() {
    this.init();
    if (!this.ctx) return;
    // Synapse success - rising tones
    this.playTone(400, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(600, 0.1, 'sine', 0.25), 50);
    setTimeout(() => this.playTone(800, 0.15, 'triangle', 0.2), 100);
  }

  playWrong() {
    this.init();
    if (!this.ctx) return;
    // Error buzz
    this.playTone(150, 0.15, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(120, 0.15, 'sawtooth', 0.15), 80);
  }

  playNewRound() {
    this.init();
    if (!this.ctx) return;
    // Quick neural blip
    this.playTone(500, 0.05, 'sine', 0.1);
    setTimeout(() => this.playTone(600, 0.05, 'sine', 0.08), 30);
  }

  playGameOver() {
    this.init();
    if (!this.ctx) return;
    // Descending shutdown
    const notes = [600, 500, 400, 300, 200];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'sine', 0.15), i * 100);
    });
  }

  playStart() {
    this.init();
    if (!this.ctx) return;
    // Neural boot sequence
    this.playTone(300, 0.1, 'sine', 0.1);
    setTimeout(() => this.playTone(400, 0.1, 'sine', 0.15), 80);
    setTimeout(() => this.playTone(600, 0.15, 'triangle', 0.2), 160);
    setTimeout(() => this.playTone(800, 0.2, 'sine', 0.15), 260);
  }
}

const audio = new AudioSystem();

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;

const scoreDisplay = document.getElementById("score-display")!;
const timeDisplay = document.getElementById("time-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;

const yesBtn = document.getElementById("yes-btn")!;
const noBtn = document.getElementById("no-btn")!;

// WebGPU Setup
let webgpuRenderer: WebGPURenderer | null = null;
let webgpuCanvas: HTMLCanvasElement | null = null;
let useWebGPU = false;

async function initWebGPU() {
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.className = 'webgpu-overlay';
  webgpuCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
  gameArea.insertBefore(webgpuCanvas, gameArea.firstChild);

  const rect = gameArea.getBoundingClientRect();
  webgpuCanvas.width = rect.width * window.devicePixelRatio;
  webgpuCanvas.height = rect.height * window.devicePixelRatio;

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  useWebGPU = await webgpuRenderer.init();

  if (useWebGPU) {
    startWebGPULoop();
  }
}

function startWebGPULoop() {
  if (!webgpuRenderer || !useWebGPU) return;

  let lastTime = 0;
  function loop(time: number) {
    if (!webgpuRenderer || !useWebGPU) return;

    const deltaTime = lastTime ? time - lastTime : 16;
    lastTime = time;

    webgpuRenderer.render(deltaTime);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function resizeWebGPU() {
  if (!webgpuCanvas) return;
  const gameArea = document.querySelector('.game-area');
  if (!gameArea) return;

  const rect = gameArea.getBoundingClientRect();
  webgpuCanvas.width = rect.width * window.devicePixelRatio;
  webgpuCanvas.height = rect.height * window.devicePixelRatio;
}

let game: ColorMatchGame;

// Track previous state
let previousScore = 0;

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
    game.draw(); // Redraw text in new language
  });
}

function updateTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = i18n.t(key);
  });
}

function initGame() {
  game = new ColorMatchGame(canvas);
  game.resize();

  game.setOnStateChange((state: any) => {
    scoreDisplay.textContent = state.score.toString();
    timeDisplay.textContent = state.time.toString();

    // Update WebGPU color
    if (webgpuRenderer && useWebGPU && (game as any).currentColor) {
      webgpuRenderer.setCurrentColor((game as any).currentColor.hex);
    }

    // Detect score change
    if (state.score > previousScore) {
      // Correct answer
      audio.playCorrect();
      if (webgpuRenderer && useWebGPU) {
        webgpuRenderer.triggerCorrect();
        if ((game as any).currentColor) {
          webgpuRenderer.emitColorBurst((game as any).currentColor.hex);
        }
      }
    } else if (state.score === previousScore && previousScore > 0 && state.status === 'playing') {
      // Wrong answer (score didn't increase but time penalty happened)
      // This detection is tricky - we'll handle it in the answer override
    }

    previousScore = state.score;

    if (state.status === "gameover") {
      showGameOver();
    }
  });

  // Override answer method to capture wrong answers
  const originalAnswer = game.answer.bind(game);
  game.answer = (yes: boolean) => {
    const currentText = (game as any).currentText;
    const currentColor = (game as any).currentColor;

    if (currentText && currentColor) {
      const isMatch = currentText.key === currentColor.key;
      const willBeCorrect = yes === isMatch;

      if (!willBeCorrect) {
        audio.playWrong();
        if (webgpuRenderer && useWebGPU) {
          webgpuRenderer.triggerWrong();
        }
      }
    }

    originalAnswer(yes);
    audio.playNewRound();
  };

  window.addEventListener("resize", () => {
    game.resize();
    resizeWebGPU();
  });
}

function showGameOver() {
  audio.playGameOver();

  overlay.style.display = "flex";
  overlayTitle.textContent = i18n.t("game.gameover");
  overlayMsg.textContent = `${i18n.t("game.score")}: ${
    scoreDisplay.textContent
  }`;
  startBtn.textContent = i18n.t("game.start");

  startBtn.onclick = () => {
    startGame();
  };
}

function startGame() {
  overlay.style.display = "none";
  previousScore = 0;

  if (webgpuRenderer) {
    webgpuRenderer.clearParticles();
  }

  game.start();
  audio.playStart();
}

startBtn.addEventListener("click", startGame);

yesBtn.addEventListener("click", () => game.answer(true));
noBtn.addEventListener("click", () => game.answer(false));

// Keyboard
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") game.answer(false);
  if (e.key === "ArrowRight") game.answer(true);
});

// Init
initI18n();
initGame();
initWebGPU();
