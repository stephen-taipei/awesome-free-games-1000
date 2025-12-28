/**
 * Locksmith Main Entry
 * Vintage Locksmith Workshop / Steampunk Theme
 * Game #055
 */
import { LocksmithGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Vintage locksmith sounds
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

  private playNoise(duration: number, volume: number = 0.2, highpass: number = 2000) {
    this.init();
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpass;

    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  playPick() {
    // Metal pick scraping
    this.playTone(800, 0.08, "sawtooth", 0.002, 0.02, 0.2);
    this.playNoise(0.05, 0.15, 3000);
  }

  playPinMove() {
    // Pin sliding in cylinder
    this.playTone(300, 0.1, "sine", 0.01, 0.03, 0.25);
    this.playTone(450, 0.06, "triangle", 0.02, 0.02, 0.15);
  }

  playPinSet() {
    // Satisfying click when pin sets
    this.playTone(600, 0.1, "sine", 0.001, 0.02, 0.5);
    this.playTone(900, 0.08, "triangle", 0.005, 0.02, 0.3);
    this.playTone(1200, 0.05, "sine", 0.01, 0.02, 0.2);
  }

  playPinFail() {
    // Pin springs back
    this.playTone(200, 0.15, "sine", 0.01, 0.05, 0.3);
    this.playTone(150, 0.1, "triangle", 0.02, 0.04, 0.2);
  }

  playUnlock() {
    // Cylinder rotates - triumphant click
    this.playTone(500, 0.15, "sine", 0.01, 0.05, 0.4);
    this.playTone(700, 0.12, "triangle", 0.02, 0.04, 0.3);
    this.playTone(1000, 0.1, "sine", 0.03, 0.04, 0.25);
  }

  playVictory() {
    // Lock opens - triumphant fanfare
    const melody = [523, 659, 784, 880, 1047];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.35, "sine", 0.02, 0.1, 0.4);
        this.playTone(freq * 0.5, 0.4, "triangle", 0.03, 0.15, 0.2);
      }, i * 120);
    });
  }

  playStart() {
    // Workshop ambience start
    this.playTone(150, 0.3, "sine", 0.1, 0.15, 0.2);
    this.playTone(200, 0.25, "triangle", 0.12, 0.1, 0.15);
  }

  playReset() {
    // Lock resetting
    this.playTone(250, 0.15, "triangle", 0.01, 0.05, 0.25);
    this.playTone(180, 0.2, "sine", 0.02, 0.08, 0.2);
  }

  playNextLevel() {
    // New lock presented
    this.playTone(400, 0.12, "sine", 0.02, 0.04, 0.3);
    this.playTone(500, 0.12, "sine", 0.05, 0.05, 0.3);
    this.playTone(600, 0.15, "triangle", 0.08, 0.06, 0.25);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const pinsDisplay = document.getElementById("pins-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: LocksmithGame;
let renderer: WebGPURenderer;
let audio: AudioSystem;
let animationId: number;
let lastPinState: string = "";

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
  game = new LocksmithGame(canvas);
  audio = new AudioSystem();
  game.resize();

  // Mouse events
  canvas.addEventListener("mousedown", (e) => handleInput("down", e));
  window.addEventListener("mousemove", (e) => handleInput("move", e));
  window.addEventListener("mouseup", (e) => handleInput("up", e));

  // Touch events
  canvas.addEventListener("touchstart", (e) => handleTouch("down", e), { passive: false });
  window.addEventListener("touchmove", (e) => handleTouch("move", e), { passive: false });
  window.addEventListener("touchend", (e) => handleTouch("up", e), { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.pins !== undefined) {
      const newPinState = state.pins;

      // Detect pin set (count increased)
      if (lastPinState && newPinState !== lastPinState) {
        const [newSet] = newPinState.split('/').map(Number);
        const [oldSet] = lastPinState.split('/').map(Number);

        if (newSet > oldSet) {
          audio.playPinSet();
          if (renderer) renderer.emitPinSet(canvas.width / 2, canvas.height / 2);
        }
      }

      lastPinState = newPinState;
      pinsDisplay.textContent = state.pins;
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }

    // Handle effects
    if (state.effect === "pick" && renderer) {
      audio.playPick();
      renderer.emitPick(state.x || canvas.width / 2, state.y || canvas.height / 2);
    }
    if (state.effect === "pinMove" && renderer) {
      audio.playPinMove();
      renderer.emitPinMove(state.x || canvas.width / 2, state.y || canvas.height / 2);
    }
    if (state.effect === "pinFail" && renderer) {
      audio.playPinFail();
      renderer.emitPinFail(state.x || canvas.width / 2, state.y || canvas.height / 2);
    }

    if (state.status === "won") {
      audio.playUnlock();
      if (renderer) renderer.emitUnlock();
      setTimeout(() => {
        audio.playVictory();
        if (renderer) renderer.emitVictory();
      }, 300);
      showWin(state.hasNextLevel);
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function handleInput(type: "down" | "move" | "up", e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  game.handleInput(type, x, y);
}

function handleTouch(type: "down" | "move" | "up", e: TouchEvent) {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  game.handleInput(type, x, y);
}

function showWin(hasNextLevel: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";

    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = i18n.t("game.unlocked");
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        audio.playNextLevel();
        game.nextLevel();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = i18n.t("game.unlocked");
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        levelDisplay.textContent = "1";
        startGame();
      };
    }
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  audio.playStart();
  lastPinState = "";
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  lastPinState = "";
  game.reset();
});

// Init
initI18n();
initWebGPU();
initGame();
