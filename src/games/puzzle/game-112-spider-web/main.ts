/**
 * Spider Web Main Entry
 * Game #112 - Spider / Night Theme
 * WebGPU Enhanced
 */
import { SpiderWebGame } from "./game";
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

  // Silk thread creation - pluck sound
  playThread() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // High-pitched pluck for silk
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.15);

    filter.type = "highpass";
    filter.frequency.value = 300;

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);

    // Slight vibration undertone
    setTimeout(() => {
      this.playTone(200, "sine", 0.15);
    }, 50);
  }

  // Node click - web node touch
  playNodeClick() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Soft tap with resonance
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Web vibration - resonating threads
  playWebVibration() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Multiple resonating frequencies
    const frequencies = [220, 330, 440];
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, "sine", 0.2 + i * 0.05);
      }, i * 30);
    });
  }

  // Reset - web breaks
  playReset() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Snapping sounds
    const snapCount = 5;
    for (let i = 0; i < snapCount; i++) {
      setTimeout(() => {
        const freq = 300 + Math.random() * 400;
        this.playTone(freq, "sawtooth", 0.08);
      }, i * 40);
    }

    // Final dissolve
    setTimeout(() => {
      const noise = this.ctx!.createBufferSource();
      const bufferSize = this.ctx!.sampleRate * 0.3;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }

      noise.buffer = buffer;
      const noiseGain = this.ctx!.createGain();
      noiseGain.gain.value = 0.1;

      noise.connect(noiseGain);
      noiseGain.connect(this.gainNode!);
      noise.start();
    }, 200);
  }

  // Win - completed web
  playWin() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Ethereal ascending tones
    const notes = [330, 392, 494, 587, 659];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.value = freq;

        filter.type = "lowpass";
        filter.frequency.value = 2000;
        filter.Q.value = 2;

        gain.gain.setValueAtTime(0, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.gainNode!);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.8);
      }, i * 150);
    });

    // Final shimmer chord
    setTimeout(() => {
      [330, 494, 659].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, "sine", 1.2), i * 20);
      });
    }, 800);
  }

  // Level start - spider descends
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Descending silk sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1);

    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 1);

    // Soft landing
    setTimeout(() => {
      this.playTone(150, "sine", 0.2);
      this.playTone(100, "triangle", 0.15);
    }, 700);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const threadsDisplay = document.getElementById("threads-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: SpiderWebGame;
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
  game = new SpiderWebGame(canvas);
  game.resize();

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleInput("down", x, y);

    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitNodeClick(x * scaleX, y * scaleY);
    }
    audio.playNodeClick();
  });

  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    game.handleInput("move", e.clientX - rect.left, e.clientY - rect.top);
  });

  window.addEventListener("mouseup", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleInput("up", x, y);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleInput("down", x, y);

    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitNodeClick(x * scaleX, y * scaleY);
    }
    audio.playNodeClick();
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    game.handleInput("move", touch.clientX - rect.left, touch.clientY - rect.top);
  }, { passive: false });

  window.addEventListener("touchend", (e) => {
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleInput("up", x, y);
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.threads !== undefined) threadsDisplay.textContent = state.threads;
    if (state.level !== undefined) levelDisplay.textContent = String(state.level);

    if (state.threadCreated && renderer) {
      const { x1, y1, x2, y2 } = state.threadCreated;
      const rect = canvas.getBoundingClientRect();
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitThread(x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY);
      audio.playThread();
    }

    if (state.status === "won") {
      showWin(state.hasNextLevel);
      renderer?.emitVictory();
      audio.playWin();
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
