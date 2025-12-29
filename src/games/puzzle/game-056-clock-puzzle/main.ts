/**
 * Clock Puzzle Main Entry
 * Elegant Clock Tower / Victorian Timekeeper Theme
 * Game #056
 */
import { ClockGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Victorian clock sounds
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (this.audioContext) return;
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioContext.destination);
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    attack: number = 0.01,
    decay: number = 0.1,
    volume: number = 0.5
  ) {
    this.init();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playBell(frequency: number, duration: number, volume: number = 0.4) {
    this.init();
    if (!this.audioContext || !this.masterGain) return;

    // Bell harmonics
    const harmonics = [1, 2.4, 3.0, 4.5, 5.5];
    const decays = [1, 0.6, 0.4, 0.25, 0.15];

    harmonics.forEach((h, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = "sine";
      osc.frequency.value = frequency * h;

      const now = this.audioContext!.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * decays[i], now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * decays[i]);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  playTick() {
    // Clock tick - mechanical click
    this.playTone(800, 0.05, "square", 0.001, 0.02, 0.25);
    this.playTone(400, 0.08, "sine", 0.005, 0.02, 0.15);
  }

  playChime() {
    // Bell chime
    this.playBell(880, 0.8, 0.35);
  }

  playCorrect() {
    // Clock aligned correctly
    this.playBell(660, 0.5, 0.3);
    setTimeout(() => this.playBell(880, 0.6, 0.25), 100);
  }

  playMove() {
    // Hand rotation sound
    this.playTone(300, 0.08, "triangle", 0.005, 0.03, 0.2);
    this.playTone(200, 0.05, "sine", 0.01, 0.02, 0.1);
  }

  playVictory() {
    // Westminster chime style victory
    const notes = [392, 440, 494, 523, 587, 659, 784];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playBell(freq, 0.6, 0.35);
      }, i * 150);
    });
  }

  playStart() {
    // Clock winding sound
    this.playTone(150, 0.3, "sawtooth", 0.05, 0.1, 0.15);
    this.playTone(200, 0.25, "sine", 0.1, 0.1, 0.1);
    this.playBell(440, 0.5, 0.2);
  }

  playReset() {
    // Hands resetting
    this.playTone(300, 0.15, "triangle", 0.01, 0.05, 0.2);
    this.playTone(250, 0.12, "sine", 0.02, 0.04, 0.15);
  }

  playNextLevel() {
    // New puzzle chime
    this.playBell(523, 0.4, 0.3);
    setTimeout(() => this.playBell(659, 0.5, 0.3), 150);
  }
}

// Elements
const container = document.getElementById("clocks-container") as HTMLElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;
const targetDisplay = document.getElementById("target-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: ClockGame;
let renderer: WebGPURenderer;
let audio: AudioSystem;
let animationId: number;
let lastCorrectCount = 0;

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
  if (!bgCanvas) return false;

  renderer = new WebGPURenderer();
  const success = await renderer.initialize(bgCanvas);

  if (success) {
    function renderLoop() {
      renderer.render();
      animationId = requestAnimationFrame(renderLoop);
    }
    renderLoop();
  }

  return success;
}

function initGame() {
  game = new ClockGame(container);
  audio = new AudioSystem();

  // Add click handlers for effects
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("clock-hand")) {
      audio.playTick();
      const rect = target.getBoundingClientRect();
      const gameArea = document.querySelector(".game-area");
      if (gameArea && renderer) {
        const gameRect = gameArea.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - gameRect.left;
        const y = rect.top + rect.height / 2 - gameRect.top;
        renderer.emitTick(x, y);
      }
    }
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    movesDisplay.textContent = String(state.moves);
    targetDisplay.textContent = state.target;

    // Check for newly correct clocks
    const correctClocks = container.querySelectorAll(".clock.correct");
    if (correctClocks.length > lastCorrectCount) {
      audio.playCorrect();
      correctClocks.forEach((clock) => {
        const rect = clock.getBoundingClientRect();
        const gameArea = document.querySelector(".game-area");
        if (gameArea && renderer) {
          const gameRect = gameArea.getBoundingClientRect();
          const x = rect.left + rect.width / 2 - gameRect.left;
          const y = rect.top + rect.height / 2 - gameRect.top;
          renderer.emitCorrect(x, y);
        }
      });
    }
    lastCorrectCount = correctClocks.length;

    if (state.status === "won") {
      audio.playVictory();
      if (renderer) renderer.emitVictory();
      showWin();
    }
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.moves")}: ${game.moves}`;
    startBtn.textContent = i18n.t("game.nextLevel");

    startBtn.onclick = () => {
      audio.playNextLevel();
      game.nextLevel();
      lastCorrectCount = 0;
      overlay.style.display = "none";
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playStart();
  lastCorrectCount = 0;
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  lastCorrectCount = 0;
  game.reset();
});

// Init
initI18n();
initWebGPU();
initGame();
