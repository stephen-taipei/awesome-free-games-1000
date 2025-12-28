/**
 * Bridge Builder Main Entry
 * Industrial Engineering / Civil Construction Theme
 * Game #057
 */
import { BridgeGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Industrial Construction sounds
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

  private playNoise(duration: number, volume: number = 0.3, highpass: number = 1000) {
    this.init();
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpass;

    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);
  }

  private playMetalHit(frequency: number, duration: number, volume: number = 0.4) {
    this.init();
    if (!this.audioContext || !this.masterGain) return;

    // Metal hit harmonics
    const harmonics = [1, 2.2, 3.5, 4.1, 5.8];
    const decays = [1, 0.7, 0.5, 0.3, 0.2];

    harmonics.forEach((h, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = "sine";
      osc.frequency.value = frequency * h;

      const now = this.audioContext!.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * decays[i], now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * decays[i]);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  playBuild() {
    // Welding/construction sound
    this.playTone(200, 0.15, "sawtooth", 0.01, 0.05, 0.25);
    this.playNoise(0.1, 0.15, 2000);
    this.playMetalHit(400, 0.2, 0.2);
  }

  playConnect() {
    // Bolt/rivet connection
    this.playMetalHit(800, 0.15, 0.4);
    this.playTone(600, 0.08, "triangle", 0.001, 0.02, 0.3);
  }

  playNode() {
    // Node selection
    this.playTone(500, 0.05, "sine", 0.005, 0.02, 0.25);
    this.playTone(700, 0.04, "triangle", 0.01, 0.02, 0.15);
  }

  playTest() {
    // Bridge testing start - engine sound
    this.playTone(80, 0.5, "sawtooth", 0.1, 0.2, 0.2);
    this.playTone(120, 0.4, "triangle", 0.15, 0.15, 0.15);
    this.playNoise(0.3, 0.1, 500);
  }

  playStress() {
    // Structural stress warning
    this.playTone(300, 0.2, "sawtooth", 0.01, 0.1, 0.3);
    this.playTone(250, 0.25, "square", 0.02, 0.15, 0.2);
  }

  playBreak() {
    // Bridge collapse
    this.playMetalHit(150, 0.5, 0.5);
    this.playNoise(0.4, 0.4, 300);
    this.playTone(100, 0.3, "sawtooth", 0.01, 0.1, 0.35);
    setTimeout(() => {
      this.playMetalHit(100, 0.4, 0.3);
      this.playNoise(0.3, 0.3, 200);
    }, 100);
  }

  playVictory() {
    // Victory fanfare - construction complete
    const notes = [262, 330, 392, 523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playMetalHit(freq, 0.4, 0.35);
        this.playTone(freq, 0.3, "sine", 0.01, 0.15, 0.2);
      }, i * 120);
    });
  }

  playStart() {
    // Game start - machinery startup
    this.playTone(100, 0.4, "sawtooth", 0.1, 0.2, 0.2);
    this.playTone(150, 0.35, "triangle", 0.15, 0.15, 0.15);
    this.playMetalHit(300, 0.3, 0.25);
  }

  playReset() {
    // Reset - clearing construction
    this.playTone(400, 0.1, "triangle", 0.01, 0.05, 0.2);
    this.playTone(300, 0.12, "sine", 0.02, 0.05, 0.15);
    this.playNoise(0.1, 0.1, 1500);
  }

  playNextLevel() {
    // New level - crane chime
    this.playMetalHit(440, 0.3, 0.3);
    setTimeout(() => this.playMetalHit(550, 0.35, 0.3), 100);
    setTimeout(() => this.playMetalHit(660, 0.4, 0.35), 200);
  }

  playFail() {
    // Failure - low warning
    this.playTone(150, 0.3, "sawtooth", 0.05, 0.1, 0.35);
    this.playTone(100, 0.4, "square", 0.1, 0.15, 0.25);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const budgetDisplay = document.getElementById("budget-display")!;
const spentDisplay = document.getElementById("spent-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const testBtn = document.getElementById("test-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: BridgeGame;
let renderer: WebGPURenderer;
let audio: AudioSystem;
let animationId: number;

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
  game = new BridgeGame(canvas);
  audio = new AudioSystem();

  // Track last built beam for effects
  let lastBeamCount = 0;

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    budgetDisplay.textContent = `$${state.budget}`;
    spentDisplay.textContent = `$${state.spent}`;

    // Emit effects when new beam is added
    if (state.beamCount > lastBeamCount) {
      audio.playBuild();
      if (renderer) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        renderer.emitBuild(centerX, centerY);
      }
    }
    lastBeamCount = state.beamCount || 0;

    if (state.status === "won") {
      audio.playVictory();
      if (renderer) renderer.emitVictory();
      showWin();
    } else if (state.status === "failed") {
      audio.playFail();
      audio.playBreak();
      if (renderer) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        renderer.emitBreak(centerX, centerY);
      }
      showFail();
    }
  });

  // Mouse click - node selection and beam building
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    audio.playNode();
    if (renderer) {
      const effectX = e.clientX - rect.left;
      const effectY = e.clientY - rect.top;
      renderer.emitConnect(effectX, effectY);
    }

    game.handleClick(x, y);
  });

  window.addEventListener("resize", () => {
    game.resize();
    game.reset();
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.spent")}: $${game.spent}`;
    startBtn.textContent = i18n.t("game.nextLevel");

    startBtn.onclick = () => {
      audio.playNextLevel();
      game.nextLevel();
      overlay.style.display = "none";
    };
  }, 500);
}

function showFail() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.fail");
    overlayMsg.textContent = i18n.t("game.desc");
    startBtn.textContent = i18n.t("game.tryAgain");

    startBtn.onclick = () => {
      audio.playReset();
      game.reset();
      overlay.style.display = "none";
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playStart();
  game.start();
}

startBtn.addEventListener("click", startGame);
testBtn.addEventListener("click", () => {
  audio.playTest();
  if (renderer) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    renderer.emitTest(centerX, centerY);
  }
  game.testBridge();
});
resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
});

// Init
initI18n();
initWebGPU();
initGame();
