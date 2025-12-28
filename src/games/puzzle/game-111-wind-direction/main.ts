/**
 * Wind Direction Main Entry
 * Game #111 - Weather / Atmospheric Theme
 * WebGPU Enhanced
 */
import { WindDirectionGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System
class AudioSystem {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  private init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.3;
    this.gainNode.connect(this.ctx.destination);
  }

  private playTone(freq: number, type: OscillatorType, duration: number, attack: number = 0.01) {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Wind whoosh sound
  playWind() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // White noise for wind
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i / bufferSize * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0, this.ctx.currentTime);
    windGain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.1);
    windGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.gainNode);
    noise.start();
  }

  // Direction change - swoosh
  playDirectionChange() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);

    // Wind accompaniment
    setTimeout(() => this.playWind(), 50);
  }

  // Leaf rustle
  playLeafRustle() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // High-frequency noise burst
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;

    const rustleGain = this.ctx.createGain();
    rustleGain.gain.value = 0.15;

    noise.connect(filter);
    filter.connect(rustleGain);
    rustleGain.connect(this.gainNode);
    noise.start();
  }

  // Out of bounds - sad wind
  playOutOfBounds() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Descending tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.7);
  }

  // Reset - calm breeze
  playReset() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Gentle wind sweep
    this.playWind();
    setTimeout(() => this.playTone(300, "sine", 0.3), 200);
  }

  // Victory - triumphant wind
  playWin() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Rising wind melody
    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, "sine", 0.4);
        this.playWind();
      }, i * 200);
    });

    // Celebration chord
    setTimeout(() => {
      [392, 494, 587].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, "sine", 0.8), i * 30);
      });
    }, 900);
  }

  // Level start - morning breeze
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Soft wind introduction
    this.playWind();

    // Welcoming tones
    setTimeout(() => this.playTone(440, "sine", 0.3), 200);
    setTimeout(() => this.playTone(523, "sine", 0.3), 400);
    setTimeout(() => this.playLeafRustle(), 500);
  }
}

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

let game: WindDirectionGame;
let renderer: WebGPURenderer | null = null;
const audio = new AudioSystem();

async function initWebGPU() {
  if (!webgpuCanvas) return;

  renderer = new WebGPURenderer(webgpuCanvas);
  const success = await renderer.init();

  if (success) {
    resizeWebGPU();
    renderer.emitLevelStart();
  }
}

function resizeWebGPU() {
  if (!renderer || !webgpuCanvas) return;
  const container = webgpuCanvas.parentElement;
  if (container) {
    const rect = container.getBoundingClientRect();
    webgpuCanvas.width = rect.width * window.devicePixelRatio;
    webgpuCanvas.height = rect.height * window.devicePixelRatio;
    renderer.resize(webgpuCanvas.width, webgpuCanvas.height);
  }
}

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

function initGame() {
  game = new WindDirectionGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU wind click effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitWindClick(x * scaleX, y * scaleY);
    }
    audio.playDirectionChange();
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU wind click effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitWindClick(x * scaleX, y * scaleY);
    }
    audio.playDirectionChange();
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) movesDisplay.textContent = String(state.moves);
    if (state.level !== undefined) levelDisplay.textContent = String(state.level);
    if (state.status === "won") {
      showWin(state.hasNextLevel);
      renderer?.emitVictory();
      audio.playWin();
    } else if (state.status === "lost") {
      showLose();
      audio.playOutOfBounds();
    }
    if (state.leafMoved && renderer) {
      const { x, y } = state.leafMoved;
      const rect = canvas.getBoundingClientRect();
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitLeaf(x * scaleX, y * scaleY);
      audio.playLeafRustle();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    resizeWebGPU();
  });
}

function showWin(hasNextLevel: boolean) {
  setTimeout(() => {
    overlay.style.display = "flex";
    if (hasNextLevel) {
      overlayTitle.textContent = i18n.t("game.win");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.nextLevel");
      startBtn.onclick = () => {
        overlay.style.display = "none";
        game.nextLevel();
        renderer?.emitLevelStart();
        audio.playLevelStart();
      };
    } else {
      overlayTitle.textContent = i18n.t("game.complete");
      overlayMsg.textContent = "";
      startBtn.textContent = i18n.t("game.start");
      startBtn.onclick = () => {
        game.setLevel(0);
        levelDisplay.textContent = "1";
        startGame();
      };
    }
  }, 500);
}

function showLose() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = "Out of bounds!";
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.reset");
    startBtn.onclick = () => {
      overlay.style.display = "none";
      game.reset();
      renderer?.emitReset();
      audio.playReset();
    };
  }, 300);
}

function startGame() {
  overlay.style.display = "none";
  game.start();
  renderer?.emitLevelStart();
  audio.playLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  renderer?.emitReset();
  audio.playReset();
});

// Init
initI18n();
initGame();
initWebGPU();
