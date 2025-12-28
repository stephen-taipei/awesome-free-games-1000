/**
 * Color Palette Main Entry
 * Game #107 - Artist Studio / Creative Theme
 * WebGPU Enhanced
 */
import { ColorPaletteGame } from "./game";
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

  // Color selection - paint dab sound
  playSelect(hue: number = 0.5) {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Frequency based on color hue
    const baseFreq = 300 + hue * 400;

    // Soft pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq * 1.2, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);

    // Brush stroke swish
    setTimeout(() => {
      const swish = this.ctx!.createOscillator();
      const swishGain = this.ctx!.createGain();
      swish.type = "sawtooth";
      swish.frequency.setValueAtTime(200, this.ctx!.currentTime);
      swish.frequency.exponentialRampToValueAtTime(100, this.ctx!.currentTime + 0.1);
      swishGain.gain.setValueAtTime(0.08, this.ctx!.currentTime);
      swishGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.15);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;

      swish.connect(filter);
      filter.connect(swishGain);
      swishGain.connect(this.gainNode!);
      swish.start();
      swish.stop(this.ctx!.currentTime + 0.15);
    }, 50);
  }

  // Color mixing - blend sound
  playMix() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Swirling blend
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(500, this.ctx.currentTime);

    // Frequency modulation for swirl effect
    osc1.frequency.linearRampToValueAtTime(500, this.ctx.currentTime + 0.3);
    osc2.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.gainNode);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.4);
    osc2.stop(this.ctx.currentTime + 0.4);

    // Sparkle
    setTimeout(() => {
      this.playTone(1500, "sine", 0.1);
    }, 200);
  }

  // Reset - brush wash sound
  playReset() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Water splash
    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noise.type = "sawtooth";
    noise.frequency.setValueAtTime(300, this.ctx.currentTime);
    noise.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    noiseGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.gainNode);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.4);

    // Palette clear chime
    setTimeout(() => {
      this.playTone(600, "triangle", 0.2);
    }, 300);
  }

  // Victory - masterpiece complete
  playWin() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Triumphant chord progression
    const chords = [
      [262, 330, 392], // C major
      [294, 370, 440], // D major
      [330, 415, 494], // E major
      [392, 494, 587], // G major
    ];

    chords.forEach((chord, chordIdx) => {
      setTimeout(() => {
        chord.forEach((freq, i) => {
          setTimeout(() => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = chordIdx < 3 ? "sine" : "triangle";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(this.gainNode!);
            osc.start();
            osc.stop(this.ctx!.currentTime + 0.6);
          }, i * 30);
        });
      }, chordIdx * 200);
    });

    // Celebration sparkles
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playTone(1200 + Math.random() * 800, "sine", 0.15);
      }, 800 + i * 100);
    }
  }

  // Level start - canvas ready
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Brush ready sound
    const ready = this.ctx.createOscillator();
    const readyGain = this.ctx.createGain();
    ready.type = "triangle";
    ready.frequency.setValueAtTime(300, this.ctx.currentTime);
    ready.frequency.linearRampToValueAtTime(500, this.ctx.currentTime + 0.2);
    readyGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    readyGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    ready.connect(readyGain);
    readyGain.connect(this.gainNode);
    ready.start();
    ready.stop(this.ctx.currentTime + 0.3);

    // Color wheel spin
    setTimeout(() => {
      const spin = this.ctx!.createOscillator();
      const spinGain = this.ctx!.createGain();
      spin.type = "sine";
      spin.frequency.setValueAtTime(400, this.ctx!.currentTime);
      spin.frequency.linearRampToValueAtTime(600, this.ctx!.currentTime + 0.3);
      spinGain.gain.setValueAtTime(0.15, this.ctx!.currentTime);
      spinGain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.4);
      spin.connect(spinGain);
      spinGain.connect(this.gainNode!);
      spin.start();
      spin.stop(this.ctx!.currentTime + 0.4);
    }, 200);
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

let game: ColorPaletteGame;
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
  game = new ColorPaletteGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU select effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      const hue = Math.random();
      renderer.emitSelect(x * scaleX, y * scaleY, hue);
      audio.playSelect(hue);
    }
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);

    // WebGPU select effect
    if (renderer) {
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      const hue = Math.random();
      renderer.emitSelect(x * scaleX, y * scaleY, hue);
      audio.playSelect(hue);
    }
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) {
      movesDisplay.textContent = String(state.moves);
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }
    if (state.status === "won") {
      showWin(state.hasNextLevel);
      renderer?.emitVictory();
      audio.playWin();
    }
  });

  // Listen for mix events if available
  game.setOnMix?.((x: number, y: number, hue1: number, hue2: number) => {
    if (renderer) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;
      renderer.emitMix(x * scaleX, y * scaleY, hue1, hue2);
    }
    audio.playMix();
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
