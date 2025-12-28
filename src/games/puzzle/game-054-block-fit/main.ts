/**
 * Block Fit Main Entry
 * Architect's Blueprint / Construction Site Theme
 * Game #054
 */
import { BlockFitGame } from "./game";
import { translations } from "./i18n";
import { i18n, type Locale } from "../../../shared/i18n";
import { WebGPURenderer } from "./webgpu";

// Audio System - Construction site sounds
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

  private playNoise(duration: number, volume: number = 0.3) {
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
    filter.type = "lowpass";
    filter.frequency.value = 800;

    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
  }

  playPlace() {
    // Heavy impact sound - block placement
    this.playTone(80, 0.15, "sine", 0.005, 0.05, 0.6);
    this.playTone(160, 0.1, "triangle", 0.01, 0.03, 0.3);
    this.playNoise(0.08, 0.2);
  }

  playRotate() {
    // Mechanical click - rotation
    this.playTone(400, 0.08, "square", 0.002, 0.02, 0.3);
    this.playTone(600, 0.05, "triangle", 0.005, 0.02, 0.2);
  }

  playDrag() {
    // Subtle sliding sound
    this.playTone(200, 0.05, "sine", 0.01, 0.02, 0.15);
  }

  playSnap() {
    // Grid snap - satisfying click
    this.playTone(500, 0.06, "triangle", 0.002, 0.02, 0.4);
    this.playTone(800, 0.04, "sine", 0.005, 0.02, 0.2);
  }

  playClear() {
    // Line clear - construction success
    const baseFreq = 300;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playTone(baseFreq + i * 100, 0.15, "sine", 0.01, 0.05, 0.3);
      }, i * 50);
    }
  }

  playVictory() {
    // Victory fanfare - triumphant construction complete
    const melody = [523, 659, 784, 1047];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, "sine", 0.01, 0.1, 0.4);
        this.playTone(freq * 0.5, 0.4, "triangle", 0.02, 0.15, 0.2);
      }, i * 150);
    });
  }

  playStart() {
    // Blueprint unfold sound
    this.playTone(220, 0.2, "sine", 0.05, 0.1, 0.3);
    this.playTone(330, 0.15, "triangle", 0.08, 0.08, 0.2);
    this.playNoise(0.1, 0.1);
  }

  playReset() {
    // Paper crumple / restart
    this.playNoise(0.15, 0.25);
    this.playTone(150, 0.2, "sine", 0.01, 0.1, 0.2);
  }

  playNextLevel() {
    // New blueprint reveal
    this.playTone(440, 0.15, "sine", 0.02, 0.05, 0.3);
    this.playTone(550, 0.15, "sine", 0.05, 0.08, 0.3);
    this.playTone(660, 0.2, "triangle", 0.08, 0.1, 0.25);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const bgCanvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById("language-select") as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const placedDisplay = document.getElementById("placed-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;

let game: BlockFitGame;
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
  game = new BlockFitGame(canvas);
  audio = new AudioSystem();
  game.resize();

  // Mouse events with click detection
  let mouseDownTime = 0;
  let mouseDownPos = { x: 0, y: 0 };

  canvas.addEventListener("mousedown", (e) => {
    mouseDownTime = Date.now();
    const rect = canvas.getBoundingClientRect();
    mouseDownPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    game.handleInput("down", mouseDownPos.x, mouseDownPos.y);
  });

  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    game.handleInput("move", x, y);
  });

  window.addEventListener("mouseup", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Detect click (short press without much movement)
    const elapsed = Date.now() - mouseDownTime;
    const dist = Math.hypot(x - mouseDownPos.x, y - mouseDownPos.y);

    if (elapsed < 200 && dist < 10) {
      game.handleInput("click", x, y);
    } else {
      game.handleInput("up", x, y);
    }
  });

  // Touch events
  let touchStartTime = 0;
  let touchStartPos = { x: 0, y: 0 };

  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      touchStartTime = Date.now();
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      touchStartPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
      game.handleInput("down", touchStartPos.x, touchStartPos.y);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      game.handleInput("move", x, y);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const elapsed = Date.now() - touchStartTime;
      const dist = Math.hypot(x - touchStartPos.x, y - touchStartPos.y);

      if (elapsed < 200 && dist < 10) {
        game.handleInput("click", x, y);
      } else {
        game.handleInput("up", x, y);
      }
    },
    { passive: false }
  );

  game.setOnStateChange((state: any) => {
    if (state.placed !== undefined) {
      placedDisplay.textContent = state.placed;
    }
    if (state.level !== undefined) {
      levelDisplay.textContent = String(state.level);
    }

    // Handle effects
    if (state.effect === "place" && renderer) {
      audio.playPlace();
      renderer.emitPlace(state.x || canvas.width / 2, state.y || canvas.height / 2);
    }
    if (state.effect === "rotate" && renderer) {
      audio.playRotate();
      renderer.emitRotate(state.x || canvas.width / 2, state.y || canvas.height / 2);
    }
    if (state.effect === "drag" && renderer) {
      audio.playDrag();
      renderer.emitDrag(state.x || canvas.width / 2, state.y || canvas.height / 2);
    }
    if (state.effect === "snap" && renderer) {
      audio.playSnap();
      renderer.emitSnap(state.x || canvas.width / 2, state.y || canvas.height / 2);
    }
    if (state.effect === "clear" && renderer) {
      audio.playClear();
      renderer.emitClear(state.y || canvas.height / 2);
    }

    if (state.status === "won") {
      audio.playVictory();
      if (renderer) renderer.emitVictory();
      showWin(state.hasNextLevel);
    }
  });

  window.addEventListener("resize", () => game.resize());
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
        audio.playNextLevel();
        game.nextLevel();
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
  audio.playStart();
  game.start();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  audio.playReset();
  game.reset();
});

// Init
initI18n();
initWebGPU();
initGame();
