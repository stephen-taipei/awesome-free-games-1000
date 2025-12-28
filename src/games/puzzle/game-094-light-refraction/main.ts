/**
 * Light Refraction Main Entry
 * Game #094 - With WebGPU Effects
 */
import { LightRefractionGame, GameState } from "./game";
import { translations } from "./i18n";
import { WebGPURenderer } from "./webgpu";

type Locale = "zh-TW" | "en" | "ja";

const i18n = {
  locale: "en" as Locale,
  translations: {} as Record<string, Record<string, string>>,

  loadTranslations(locale: Locale, trans: Record<string, string>) {
    this.translations[locale] = trans;
  },

  setLocale(locale: Locale) {
    this.locale = locale;
  },

  getLocale(): Locale {
    return this.locale;
  },

  t(key: string): string {
    return this.translations[this.locale]?.[key] || key;
  },
};

// Audio System for Light/Prism sounds
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      this.audioContext = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.15
  ) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private playChime(baseFreq: number, count: number, interval: number = 0.1) {
    if (!this.audioContext) return;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const freq = baseFreq * Math.pow(1.2, i);
        this.playTone(freq, 0.3, "sine", 0.1);
      }, i * interval * 1000);
    }
  }

  // Light beam sound - ethereal sweep
  playBeam() {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  // Prism hit - crystal refraction sound
  playPrismHit() {
    if (!this.audioContext) return;

    // Main crystal tone
    this.playTone(880, 0.3, "sine", 0.12);

    // Harmonic overtones for sparkle
    setTimeout(() => this.playTone(1320, 0.2, "sine", 0.08), 30);
    setTimeout(() => this.playTone(1760, 0.15, "sine", 0.05), 60);
  }

  // Target hit - success chime
  playTargetHit() {
    this.playChime(660, 4, 0.08);
  }

  // Prism drag - subtle movement sound
  playPrismMove() {
    this.playTone(300, 0.1, "triangle", 0.05);
  }

  // Prism rotate - whoosh
  playRotate() {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  // Victory - rainbow cascade
  playVictory() {
    if (!this.audioContext) return;

    const notes = [523, 659, 784, 880, 1047, 1175, 1319];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.4, "sine", 0.1);
      }, i * 80);
    });
  }

  // Level start - activation sound
  playLevelStart() {
    if (!this.audioContext) return;

    this.playTone(330, 0.2, "sine", 0.1);
    setTimeout(() => this.playTone(440, 0.2, "sine", 0.1), 100);
    setTimeout(() => this.playTone(550, 0.3, "sine", 0.12), 200);
  }

  // Reset - deactivation
  playReset() {
    if (!this.audioContext) return;

    this.playTone(440, 0.15, "triangle", 0.08);
    setTimeout(() => this.playTone(330, 0.2, "triangle", 0.06), 80);
  }
}

// Elements
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const webgpuCanvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
const languageSelect = document.getElementById(
  "language-select"
) as HTMLSelectElement;
const levelDisplay = document.getElementById("level-display")!;
const statusDisplay = document.getElementById("status-display")!;

const overlay = document.getElementById("game-overlay")!;
const overlayTitle = document.getElementById("overlay-title")!;
const overlayMsg = document.getElementById("overlay-msg")!;
const startBtn = document.getElementById("start-btn")!;
const resetBtn = document.getElementById("reset-btn")!;
const nextBtn = document.getElementById("next-btn")!;

let game: LightRefractionGame;
let webgpuRenderer: WebGPURenderer | null = null;
const audioSystem = new AudioSystem();

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
  if (!webgpuCanvas) return;

  webgpuRenderer = new WebGPURenderer(webgpuCanvas);
  const success = await webgpuRenderer.init();

  if (!success) {
    console.warn("WebGPU not available, running without effects");
    webgpuRenderer = null;
  }
}

function initGame() {
  game = new LightRefractionGame(canvas);
  game.resize();

  if (webgpuRenderer && webgpuCanvas.parentElement) {
    const rect = webgpuCanvas.parentElement.getBoundingClientRect();
    webgpuRenderer.resize(rect.width, 450);
  }

  // Mouse inputs
  canvas.addEventListener("mousedown", (e) => {
    audioSystem.init();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    game.handleInput(
      "down",
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY
    );
  });

  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    game.handleInput(
      "move",
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY
    );
  });

  window.addEventListener("mouseup", () => {
    game.handleInput("up", 0, 0);
  });

  canvas.addEventListener("dblclick", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    game.handleInput(
      "click",
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY
    );
  });

  // Touch inputs
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      audioSystem.init();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      game.handleInput(
        "down",
        (touch.clientX - rect.left) * scaleX,
        (touch.clientY - rect.top) * scaleY
      );
    },
    { passive: false }
  );

  window.addEventListener(
    "touchmove",
    (e) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      game.handleInput(
        "move",
        (touch.clientX - rect.left) * scaleX,
        (touch.clientY - rect.top) * scaleY
      );
    },
    { passive: false }
  );

  window.addEventListener("touchend", () => {
    game.handleInput("up", 0, 0);
  });

  game.setOnStateChange((state: GameState) => {
    // Handle game events
    if (state.event) {
      switch (state.event) {
        case "drag":
          if (state.prismX !== undefined && state.prismY !== undefined) {
            audioSystem.playPrismMove();
            webgpuRenderer?.emitPrismMove(
              state.prismX,
              state.prismY,
              state.prismRotation ?? 0
            );
          }
          break;

        case "rotate":
          audioSystem.playRotate();
          if (state.prismX !== undefined && state.prismY !== undefined) {
            webgpuRenderer?.emitPrismMove(
              state.prismX,
              state.prismY,
              state.prismRotation ?? 0
            );
          }
          break;

        case "prismHit":
          audioSystem.playPrismHit();
          if (state.hitX !== undefined && state.hitY !== undefined) {
            webgpuRenderer?.emitPrismHit(
              state.hitX,
              state.hitY,
              state.prismRotation ?? 0
            );
          }
          break;

        case "beamPath":
          if (
            state.x1 !== undefined &&
            state.y1 !== undefined &&
            state.x2 !== undefined &&
            state.y2 !== undefined
          ) {
            webgpuRenderer?.emitBeamPath(
              state.x1,
              state.y1,
              state.x2,
              state.y2,
              state.colorIndex ?? 0
            );
          }
          break;

        case "targetHit":
          audioSystem.playTargetHit();
          if (state.targetX !== undefined && state.targetY !== undefined) {
            webgpuRenderer?.emitTargetHit(state.targetX, state.targetY);
          }
          break;

        case "victory":
          audioSystem.playVictory();
          webgpuRenderer?.emitVictory();
          break;

        case "levelStart":
          audioSystem.playLevelStart();
          if (state.sourceX !== undefined && state.sourceY !== undefined) {
            webgpuRenderer?.emitLevelStart(state.sourceX, state.sourceY);
          }
          break;

        case "reset":
          audioSystem.playReset();
          webgpuRenderer?.emitReset();
          break;
      }
    }

    // Update UI
    if (state.hit !== undefined) {
      statusDisplay.textContent = state.hit
        ? i18n.t("game.connected")
        : i18n.t("game.searching");
      statusDisplay.style.color = state.hit ? "#2ecc71" : "white";
    }

    if (state.status === "won") {
      showWin();
    }
  });

  window.addEventListener("resize", () => {
    game.resize();
    if (webgpuRenderer && webgpuCanvas.parentElement) {
      const rect = webgpuCanvas.parentElement.getBoundingClientRect();
      webgpuRenderer.resize(rect.width, 450);
    }
  });
}

function showWin() {
  setTimeout(() => {
    overlay.style.display = "flex";
    overlayTitle.textContent = i18n.t("game.win");
    overlayMsg.textContent = `${i18n.t("game.level")} ${game.getLevel()}`;

    if (game.hasMoreLevels()) {
      nextBtn.style.display = "inline-block";
      startBtn.textContent = i18n.t("game.reset");
    } else {
      nextBtn.style.display = "none";
      overlayTitle.textContent = i18n.t("game.complete");
      startBtn.textContent = i18n.t("game.start");
    }
  }, 800);
}

function startGame() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.start();
  levelDisplay.textContent = game.getLevel().toString();
}

function nextLevel() {
  overlay.style.display = "none";
  nextBtn.style.display = "none";
  game.nextLevel();
  levelDisplay.textContent = game.getLevel().toString();
}

startBtn.addEventListener("click", startGame);
resetBtn.addEventListener("click", () => {
  game.reset();
});
nextBtn.addEventListener("click", nextLevel);

// Init
initI18n();
initWebGPU().then(() => {
  initGame();
});
