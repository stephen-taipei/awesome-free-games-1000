/**
 * Temperature Balance Main Entry
 * Game #113 - Thermal / Fire & Ice Theme
 * WebGPU Enhanced
 */
import { TemperatureBalanceGame } from "./game";
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

  // Hot zone click - fire crackle
  playHotClick() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Crackle noise burst
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const crackle = Math.random() > 0.95 ? 1 : 0;
      data[i] = (Math.random() * 2 - 1 + crackle) * Math.exp(-t * 5);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 800;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.25;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.gainNode);
    noise.start();

    // Fire whoosh undertone
    this.playTone(150, "sawtooth", 0.2);
  }

  // Cold zone click - ice crystallize
  playColdClick() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Crystal chime - high pitched
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(2000, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);

    // Ice crack undertone
    setTimeout(() => {
      this.playTone(800, "triangle", 0.15);
    }, 50);
  }

  // Heat transfer - energy flow
  playTransfer(isHotToCold: boolean) {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    if (isHotToCold) {
      // Hot to cold - descending whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.gainNode);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } else {
      // Cold to hot - ascending shimmer
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.gainNode);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    }

    // Steam hiss
    setTimeout(() => {
      const noise = this.ctx!.createBufferSource();
      const bufferSize = this.ctx!.sampleRate * 0.2;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      noise.buffer = buffer;

      const filter = this.ctx!.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 3000;

      const noiseGain = this.ctx!.createGain();
      noiseGain.gain.value = 0.1;

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.gainNode!);
      noise.start();
    }, 150);
  }

  // Reset - thermal burst
  playReset() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Fire burst
    this.playHotClick();

    // Ice shatter
    setTimeout(() => {
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          this.playTone(1500 + Math.random() * 1000, "sine", 0.1);
        }, i * 50);
      }
    }, 100);

    // Steam release
    setTimeout(() => {
      const noise = this.ctx!.createBufferSource();
      const bufferSize = this.ctx!.sampleRate * 0.4;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }

      noise.buffer = buffer;
      const noiseGain = this.ctx!.createGain();
      noiseGain.gain.value = 0.15;

      noise.connect(noiseGain);
      noiseGain.connect(this.gainNode!);
      noise.start();
    }, 200);
  }

  // Win - balanced harmony
  playWin() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Balanced chord progression
    const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord rising
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(this.gainNode!);
        osc.start();
        osc.stop(this.ctx!.currentTime + 0.8);
      }, i * 200);
    });

    // Final harmonic blend
    setTimeout(() => {
      [261.63, 329.63, 392.00].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, "sine", 1.2), i * 20);
      });
    }, 900);
  }

  // Level start - temperature gauge
  playLevelStart() {
    this.init();
    if (!this.ctx || !this.gainNode) return;

    // Rising heat
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);

    // Ice chime
    setTimeout(() => {
      this.playTone(1200, "sine", 0.3);
      this.playTone(1500, "sine", 0.25);
    }, 400);
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

let game: TemperatureBalanceGame;
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
  game = new TemperatureBalanceGame(canvas);
  game.resize();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleClick(x, y);
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    game.handleClick(x, y);
  }, { passive: false });

  game.setOnStateChange((state: any) => {
    if (state.moves !== undefined) movesDisplay.textContent = String(state.moves);
    if (state.level !== undefined) levelDisplay.textContent = String(state.level);

    if (state.zoneClicked && renderer) {
      const { x, y, temperature } = state.zoneClicked;
      const rect = canvas.getBoundingClientRect();
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;

      if (temperature > 50) {
        renderer.emitHot(x * scaleX, y * scaleY);
        audio.playHotClick();
      } else {
        renderer.emitCold(x * scaleX, y * scaleY);
        audio.playColdClick();
      }
    }

    if (state.heatTransfer && renderer) {
      const { fromX, fromY, toX, toY, fromTemp, toTemp } = state.heatTransfer;
      const rect = canvas.getBoundingClientRect();
      const scaleX = webgpuCanvas.width / rect.width;
      const scaleY = webgpuCanvas.height / rect.height;

      const isHotToCold = fromTemp > toTemp;
      renderer.emitTransfer(
        fromX * scaleX, fromY * scaleY,
        toX * scaleX, toY * scaleY,
        isHotToCold
      );
      audio.playTransfer(isHotToCold);
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
