/**
 * Mirror World Main Entry
 * Crystal / Reflection / Dimensional Theme
 * Game #068
 */
import { MirrorWorldGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const movesDisplay = document.getElementById("moves-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: MirrorWorldGame;
let renderer: WebGPURenderer | null = null;

// Audio System - Crystal / Reflection Sounds
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  private ensureContext() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Crystal chime - pure bell-like tone
  private playChime(frequency: number, duration: number, volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.01, now + 0.1);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Glass shimmer - bright sparkle sound
  private playShimmer(duration: number = 0.3, volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Multiple high-frequency oscillators
    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      const baseFreq = 2000 + i * 500;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + duration);

      const delay = i * 0.02;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(volume * 0.3, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + duration);
    }
  }

  // Dimensional shift - whoosh with harmonic
  private playDimensionalShift(volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Low sweep
    const osc1 = this.audioContext.createOscillator();
    const gain1 = this.audioContext.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(100, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.2);
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // High harmonic
    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(800, now);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    gain2.gain.setValueAtTime(volume * 0.5, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + 0.25);
  }

  // Mirror reflection echo
  private playReflection(volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const notes = [600, 800, 1000];

    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const delay = i * 0.08;
      const amp = volume * (1 - i * 0.3);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(amp, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + delay);
      osc.stop(now + delay + 0.35);
    });
  }

  // Crystal shatter
  private playShatter(volume: number = 0.2) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;
    const bufferSize = this.audioContext.sampleRate * 0.15;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.5;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;

    const gain = this.audioContext.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  // Sync pulse - dual tone
  private playSyncPulse(volume: number = 0.15) {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const now = this.audioContext.currentTime;

    // Left tone (lower)
    const osc1 = this.audioContext.createOscillator();
    const pan1 = this.audioContext.createStereoPanner();
    const gain1 = this.audioContext.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 400;
    pan1.pan.value = -0.5;
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(pan1);
    pan1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Right tone (higher)
    const osc2 = this.audioContext.createOscillator();
    const pan2 = this.audioContext.createStereoPanner();
    const gain2 = this.audioContext.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 600;
    pan2.pan.value = 0.5;
    gain2.gain.setValueAtTime(volume, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc2.connect(pan2);
    pan2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + 0.25);
  }

  // Victory fanfare - ascending crystal melody
  playVictory() {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const melody = [
      { freq: 523.25, time: 0, dur: 0.15 },
      { freq: 659.25, time: 0.1, dur: 0.15 },
      { freq: 783.99, time: 0.2, dur: 0.15 },
      { freq: 1046.50, time: 0.35, dur: 0.4 },
    ];

    melody.forEach(({ freq, time, dur }) => {
      setTimeout(() => {
        this.playChime(freq, dur, 0.2);
      }, time * 1000);
    });

    // Add dimensional shift
    setTimeout(() => this.playDimensionalShift(0.15), 400);
    setTimeout(() => this.playShimmer(0.5, 0.15), 500);
  }

  // Public methods
  playMove() {
    this.playSyncPulse(0.12);
    this.playChime(500, 0.15, 0.1);
  }

  playMirrorSync() {
    this.playReflection(0.12);
  }

  playWallBlock() {
    this.playShatter(0.15);
    this.playChime(200, 0.1, 0.1);
  }

  playGoalReached() {
    this.playChime(800, 0.3, 0.2);
    this.playShimmer(0.4, 0.15);
  }

  playStart() {
    this.playDimensionalShift(0.15);
    this.playShimmer(0.3, 0.1);
  }

  playReset() {
    this.playReflection(0.1);
    this.playChime(400, 0.15, 0.1);
  }

  playNextLevel() {
    this.playChime(600, 0.2, 0.15);
    this.playShimmer(0.2, 0.1);
  }
}

const audio = new AudioSystem();

// Initialize WebGPU
async function initWebGPU() {
  renderer = new WebGPURenderer();
  const webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.id = 'webgpu-canvas';
  webgpuCanvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  `;

  const gameArea = document.querySelector('.game-area');
  if (gameArea) {
    gameArea.insertBefore(webgpuCanvas, gameArea.firstChild);
  }

  const success = await renderer.initialize(webgpuCanvas);
  if (success) {
    function animate() {
      renderer?.render();
      requestAnimationFrame(animate);
    }
    animate();
  }
  return success;
}

function initI18n() {
  Object.entries(translations).forEach(([locale, trans]) => {
    i18n.loadTranslations(locale as Locale, trans);
  });

  const browserLang = navigator.language;
  if (browserLang.includes("zh-TW") || browserLang.includes("zh-Hant")) {
    i18n.setLocale("zh-TW");
  } else if (browserLang.includes("zh")) {
    i18n.setLocale("zh-CN");
  } else if (browserLang.includes("ja")) {
    i18n.setLocale("ja");
  } else if (browserLang.includes("ko")) {
    i18n.setLocale("ko");
  } else {
    i18n.setLocale("en");
  }

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
  game = new MirrorWorldGame(canvas);
  game.resize();

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" || e.key === "w") game.move("up");
    else if (e.key === "ArrowDown" || e.key === "s") game.move("down");
    else if (e.key === "ArrowLeft" || e.key === "a") game.move("left");
    else if (e.key === "ArrowRight" || e.key === "d") game.move("right");
  });

  // Touch/swipe controls
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 30) return;

    if (absDx > absDy) {
      game.move(dx > 0 ? "right" : "left");
    } else {
      game.move(dy > 0 ? "down" : "up");
    }
  }, { passive: true });

  game.setOnStateChange((state: any) => {
    levelDisplay.textContent = `${state.level} / ${game.getTotalLevels()}`;
    movesDisplay.textContent = state.moves.toString();

    // Handle events
    if (state.event) {
      switch (state.event) {
        case 'playerMove':
          if (state.leftX !== undefined) {
            renderer?.emitPlayerMove(state.leftX, state.leftY, state.rightX, state.rightY);
            audio.playMove();
            audio.playMirrorSync();
          }
          break;
        case 'wallBlock':
          renderer?.emitWallBlock(state.x, state.y);
          audio.playWallBlock();
          break;
        case 'goalReached':
          renderer?.emitGoalReached(state.x, state.y);
          audio.playGoalReached();
          break;
      }
    }

    if (state.status === "won") {
      showWin();
      renderer?.emitVictory();
      audio.playVictory();
    } else if (state.status === "complete") {
      showComplete();
      renderer?.emitVictory();
      audio.playVictory();
    }
  });

  window.addEventListener("resize", () => game.resize());
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = i18n.t("game.hint");
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
  }, 500);
}

function showComplete() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.complete");
    overlayMsg.textContent = "";
    startBtn.textContent = i18n.t("game.start");
    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    startBtn.onclick = () => {
      game.restart();
      startGame();
    };
  }, 500);
}

function startGame() {
  overlay.style.display = "none";
  startBtn.style.display = "inline-block";
  nextBtn.style.display = "none";
  game.start();
  audio.playStart();
  renderer?.emitLevelStart();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
  audio.playReset();
  renderer?.emitReset();
});
nextBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  game.nextLevel();
  audio.playNextLevel();
  renderer?.emitLevelStart();
});

// Init
initI18n();
initGame();
initWebGPU();
