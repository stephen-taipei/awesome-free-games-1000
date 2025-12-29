/**
 * Chemistry Puzzle Main Entry
 * Science Lab / Chemistry Laboratory Theme
 * Game #058
 */
import { ChemistryGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Chemistry Lab sounds
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

  private playNoise(duration: number, volume: number = 0.3, frequency: number = 2000) {
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
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 1;

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

  private playBubble(frequency: number, duration: number, volume: number = 0.3) {
    this.init();
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      frequency * 1.5,
      this.audioContext.currentTime + duration * 0.3
    );
    osc.frequency.exponentialRampToValueAtTime(
      frequency * 0.8,
      this.audioContext.currentTime + duration
    );

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  playDrop() {
    // Element dropped into flask - bubble sound
    this.playBubble(400, 0.15, 0.3);
    this.playBubble(600, 0.12, 0.2);
    this.playTone(300, 0.1, "triangle", 0.01, 0.05, 0.15);
  }

  playElement() {
    // Element selection
    this.playTone(800, 0.08, "sine", 0.005, 0.02, 0.25);
    this.playTone(1000, 0.06, "triangle", 0.01, 0.02, 0.15);
  }

  playReaction() {
    // Chemical reaction - fizzing sound
    this.playNoise(0.3, 0.25, 3000);
    this.playTone(200, 0.2, "sawtooth", 0.02, 0.1, 0.2);
    this.playBubble(500, 0.2, 0.25);
    this.playBubble(700, 0.15, 0.2);
  }

  playSuccess() {
    // Successful compound creation
    this.playTone(523, 0.15, "sine", 0.01, 0.05, 0.35);
    this.playTone(659, 0.12, "sine", 0.01, 0.05, 0.3);
    this.playTone(784, 0.2, "sine", 0.01, 0.1, 0.35);
    this.playNoise(0.2, 0.1, 4000);
  }

  playFail() {
    // Failed reaction
    this.playNoise(0.4, 0.3, 500);
    this.playTone(150, 0.3, "sawtooth", 0.05, 0.15, 0.25);
    this.playTone(100, 0.35, "square", 0.1, 0.1, 0.15);
  }

  playVictory() {
    // Level complete - celebratory bubbles
    const notes = [523, 659, 784, 880, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playBubble(freq, 0.25, 0.3);
        this.playTone(freq, 0.2, "sine", 0.01, 0.1, 0.2);
      }, i * 120);
    });
    // Fizzing celebration
    setTimeout(() => this.playNoise(0.4, 0.15, 3500), 200);
  }

  playClear() {
    // Flask cleared - pouring sound
    this.playNoise(0.3, 0.2, 1500);
    this.playBubble(300, 0.2, 0.2);
    this.playTone(250, 0.15, "triangle", 0.02, 0.1, 0.15);
  }

  playStart() {
    // Game start - lab equipment activation
    this.playTone(300, 0.2, "sine", 0.05, 0.1, 0.2);
    this.playTone(400, 0.15, "triangle", 0.08, 0.08, 0.15);
    this.playBubble(500, 0.2, 0.2);
  }

  playNextLevel() {
    // Next level - new experiment
    this.playBubble(600, 0.2, 0.25);
    setTimeout(() => this.playBubble(800, 0.25, 0.25), 100);
    setTimeout(() => this.playBubble(1000, 0.3, 0.3), 200);
  }
}

// Elements
const elementsZone = document.getElementById("elements-zone") as HTMLElement;
const flaskContent = document.getElementById("flask-content") as HTMLElement;
const flaskLiquid = document.getElementById("flask-liquid") as HTMLElement;
const flask = document.getElementById("flask") as HTMLElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const targetDisplay = document.getElementById("target-display")!;
const resultDisplay = document.getElementById("result-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const clearBtn = document.getElementById("clear-btn")!;
const reactBtn = document.getElementById("react-btn")!;

let game: ChemistryGame;
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
  game = new ChemistryGame(elementsZone, flaskContent, flaskLiquid);
  game.setupDropZone(flask);
  audio = new AudioSystem();

  // Track flask element count for effects
  let lastFlaskCount = 0;

  // Add click handlers for elements
  elementsZone.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const element = target.closest(".element");
    if (element) {
      audio.playElement();
      const rect = element.getBoundingClientRect();
      const gameArea = document.querySelector(".game-area");
      if (gameArea && renderer) {
        const gameRect = gameArea.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - gameRect.left;
        const y = rect.top + rect.height / 2 - gameRect.top;
        renderer.emitElement(x, y);
      }
    }
  });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = String(state.level);
    targetDisplay.textContent = state.target;

    // Emit drop effect when element added to flask
    if (state.flaskCount > lastFlaskCount) {
      audio.playDrop();
      const flaskRect = flask.getBoundingClientRect();
      const gameArea = document.querySelector(".game-area");
      if (gameArea && renderer) {
        const gameRect = gameArea.getBoundingClientRect();
        const x = flaskRect.left + flaskRect.width / 2 - gameRect.left;
        const y = flaskRect.top + flaskRect.height / 2 - gameRect.top;
        renderer.emitDrop(x, y);
      }
    }
    lastFlaskCount = state.flaskCount;

    if (state.status === "won") {
      audio.playSuccess();
      audio.playVictory();
      if (renderer) renderer.emitVictory();
      showWin();
    } else if (state.status === "failed") {
      audio.playFail();
      const flaskRect = flask.getBoundingClientRect();
      const gameArea = document.querySelector(".game-area");
      if (gameArea && renderer) {
        const gameRect = gameArea.getBoundingClientRect();
        const x = flaskRect.left + flaskRect.width / 2 - gameRect.left;
        const y = flaskRect.top + flaskRect.height / 2 - gameRect.top;
        renderer.emitFail(x, y);
      }
      showFail();
    }
  });
}

function showWin() {
  flask.classList.add("reaction-animation");
  setTimeout(() => {
    flask.classList.remove("reaction-animation");
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${game.getTargetCompound()}`;
    startBtn.textContent = i18n.t("game.nextLevel");

    startBtn.onclick = () => {
      audio.playNextLevel();
      game.nextLevel();
      overlay.style.display = "none";
      resultDisplay.textContent = "";
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
      game.reset();
      overlay.style.display = "none";
      resultDisplay.textContent = "";
    };
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  resultDisplay.textContent = "";
  audio.playStart();
  game.start();
}

function handleReact() {
  audio.playReaction();

  const flaskRect = flask.getBoundingClientRect();
  const gameArea = document.querySelector(".game-area");
  if (gameArea && renderer) {
    const gameRect = gameArea.getBoundingClientRect();
    const x = flaskRect.left + flaskRect.width / 2 - gameRect.left;
    const y = flaskRect.top + flaskRect.height / 2 - gameRect.top;
    renderer.emitReaction(x, y);
  }

  const result = game.react();
  if (result) {
    resultDisplay.textContent = `= ${result}`;
    flask.classList.add("reaction-animation");
    setTimeout(() => flask.classList.remove("reaction-animation"), 500);
  } else {
    resultDisplay.textContent = "= ???";
  }
}

startBtn.addEventListener("click", startGame);
clearBtn.addEventListener("click", () => {
  audio.playClear();
  const flaskRect = flask.getBoundingClientRect();
  const gameArea = document.querySelector(".game-area");
  if (gameArea && renderer) {
    const gameRect = gameArea.getBoundingClientRect();
    const x = flaskRect.left + flaskRect.width / 2 - gameRect.left;
    const y = flaskRect.top + flaskRect.height / 2 - gameRect.top;
    renderer.emitClear(x, y);
  }
  game.clearFlask();
  resultDisplay.textContent = "";
});
reactBtn.addEventListener("click", handleReact);

// Init
initI18n();
initWebGPU();
initGame();
