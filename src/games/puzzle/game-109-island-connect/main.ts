/**
 * Island Connect Main Entry
 * Game #109 - Tropical Ocean / Island Paradise Theme
 * WebGPU Enhanced
 */
import { IslandConnectGame } from "./game";
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

  // Island click - sandy thud with tropical chime
  playIslandClick() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Sandy thud
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(120, this.ctx.currentTime);
    thud.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.15);
    thudGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    thudGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    thud.connect(thudGain);
    thudGain.connect(this.gainNode);
    thud.start();
    thud.stop(this.ctx.currentTime + 0.2);

    // Tropical chime
    setTimeout(() => {
      this.playTone(880, "sine", 0.3);
    }, 80);
  }

  // Bridge building - wooden plank sounds
  playBridge() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Wooden plank sequence
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const plank = this.ctx!.createOscillator();
        const plankGain = this.ctx!.createGain();
        plank.type = "triangle";
        plank.frequency.setValueAtTime(200 + i * 30, this.ctx!.currentTime);
        plank.frequency.exponentialRampToValueAtTime(100, this.ctx!.currentTime + 0.1);
        plankGain.gain.setValueAtTime(0.2, this.ctx!.currentTime);
        plankGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.15);
        plank.connect(plankGain);
        plankGain.connect(this.gainNode!);
        plank.start();
        plank.stop(this.ctx!.currentTime + 0.15);
      }, i * 80);
    }

    // Connection chime
    setTimeout(() => {
      this.playTone(660, "sine", 0.4, 0.02);
    }, 350);
  }

  // Splash sound
  playSplash() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Water splash noise
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    const splashGain = this.ctx.createGain();
    splashGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    splashGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(splashGain);
    splashGain.connect(this.gainNode);
    noise.start();
  }

  // Reset - wave sound
  playReset() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Wave swoosh
    const wave = this.ctx.createOscillator();
    const waveGain = this.ctx.createGain();
    wave.type = "sine";
    wave.frequency.setValueAtTime(200, this.ctx.currentTime);
    wave.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.5);
    wave.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 0.8);
    waveGain.gain.setValueAtTime(0, this.ctx.currentTime);
    waveGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
    waveGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
    wave.connect(waveGain);
    waveGain.connect(this.gainNode);
    wave.start();
    wave.stop(this.ctx.currentTime + 0.8);

    // Secondary wave
    setTimeout(() => {
      this.playTone(180, "sine", 0.4);
    }, 200);
  }

  // Victory - tropical celebration
  playWin() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Steel drum melody
    const notes = [523, 659, 784, 880, 1047]; // C5, E5, G5, A5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const drum = this.ctx!.createOscillator();
        const drumGain = this.ctx!.createGain();
        drum.type = "sine";
        drum.frequency.value = freq;

        drumGain.gain.setValueAtTime(0, this.ctx!.currentTime);
        drumGain.gain.linearRampToValueAtTime(0.25, this.ctx!.currentTime + 0.02);
        drumGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.5);

        drum.connect(drumGain);
        drumGain.connect(this.gainNode!);
        drum.start();
        drum.stop(this.ctx!.currentTime + 0.5);
      }, i * 150);
    });

    // Ocean wave finale
    setTimeout(() => {
      const wave = this.ctx!.createOscillator();
      const waveGain = this.ctx!.createGain();
      wave.type = "sine";
      wave.frequency.setValueAtTime(100, this.ctx!.currentTime);
      wave.frequency.linearRampToValueAtTime(200, this.ctx!.currentTime + 0.5);
      wave.frequency.linearRampToValueAtTime(80, this.ctx!.currentTime + 1.0);
      waveGain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
      waveGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 1.0);
      wave.connect(waveGain);
      waveGain.connect(this.gainNode!);
      wave.start();
      wave.stop(this.ctx!.currentTime + 1.0);
    }, 800);
  }

  // Level start - ocean ambient
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Seagull-like call
    const gull = this.ctx.createOscillator();
    const gullGain = this.ctx.createGain();
    gull.type = "sine";
    gull.frequency.setValueAtTime(800, this.ctx.currentTime);
    gull.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
    gull.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.4);
    gullGain.gain.setValueAtTime(0, this.ctx.currentTime);
    gullGain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.05);
    gullGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    gull.connect(gullGain);
    gullGain.connect(this.gainNode);
    gull.start();
    gull.stop(this.ctx.currentTime + 0.5);

    // Gentle wave
    setTimeout(() => {
      this.playTone(150, "sine", 0.6);
    }, 300);

    // Welcome chime
    setTimeout(() => {
      this.playTone(523, "sine", 0.3);
      setTimeout(() => this.playTone(659, "sine", 0.3), 100);
    }, 500);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const bridgesDisplay = document.getElementById("bridges-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: IslandConnectGame;
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
  game = new IslandConnectGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU island click effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitIslandClick(x * scaleX, y * scaleY);
    }
    audio.playIslandClick();
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU island click effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitIslandClick(x * scaleX, y * scaleY);
    }
    audio.playIslandClick();
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.bridges !== undefined) {
      bridgesDisplay.textContent = String(state.bridges);
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      showWin(state.hasNextLevel);
      renderer?.emitVictory();
      audio.playWin();
    }
    if (state.bridgeBuilt && renderer) {
      // Bridge effect between islands
      const { x1, y1, x2, y2 } = state.bridgeBuilt;
      const rect = canvas.getBoundingClientRect();
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitBridge(x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY);
      audio.playBridge();
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
